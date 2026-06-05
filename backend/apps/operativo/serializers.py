from rest_framework import serializers
import re
from django.db import IntegrityError, transaction
from django.utils import timezone
from .codigo_reservas import get_reservation_by_token, is_code_reserved
from .models import (
    CLIENTE_CODIGO_BODY_LENGTH,
    CLIENTE_CODIGO_LENGTH,
    CLIENTE_CODIGO_MIN_LENGTH,
    codigo_cliente_tiene_formato_nuevo,
    Cliente,
    EventosMeta,
    Compra,
    Landing,
    LandingVisit,
    Retiro,
    generar_codigo_corto,
    obtener_prefijo_empresa,
)
from apps.pauta.servicios.credenciales import credencial_aplica_a_empresa, credencial_principal_para_empresa
from apps.empresas.scope import get_user_empresa_ids
from .servicios.landing_config import landing_config_groups


def normalize_contacto(value):
    if value in (None, ""):
        return ""
    return "".join(ch for ch in str(value) if ch.isdigit())[:15]


def get_request_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        first = str(forwarded).split(",")[0].strip()
        if first:
            return first
    for header in ("HTTP_X_REAL_IP", "HTTP_CF_CONNECTING_IP", "REMOTE_ADDR"):
        value = request.META.get(header)
        if value:
            normalized = str(value).strip()
            if normalized:
                return normalized
    return None


def get_request_user_agent(request):
    if not request:
        return None
    value = request.META.get("HTTP_USER_AGENT")
    return str(value).strip() if value else None


class ClienteSerializer(serializers.ModelSerializer):
    total_bonos_ars = serializers.SerializerMethodField()
    total_bonos_usd = serializers.SerializerMethodField()
    cant_retiros = serializers.SerializerMethodField()
    total_retiros_ars = serializers.SerializerMethodField()
    total_retiros_usd = serializers.SerializerMethodField()
    contactado = serializers.BooleanField(read_only=True)

    def _decimal_or_zero(self, obj, attr_name):
        value = getattr(obj, attr_name, None)
        return value if value is not None else "0.00"

    def get_total_bonos_ars(self, obj):
        return self._decimal_or_zero(obj, "total_bonos_ars")

    def get_total_bonos_usd(self, obj):
        return self._decimal_or_zero(obj, "total_bonos_usd")

    def get_cant_retiros(self, obj):
        return getattr(obj, "cant_retiros", 0) or 0

    def get_total_retiros_ars(self, obj):
        return self._decimal_or_zero(obj, "total_retiros_ars")

    def get_total_retiros_usd(self, obj):
        return self._decimal_or_zero(obj, "total_retiros_usd")

    class Meta:
        model = Cliente
        fields = [
            "id",
            "uuid",
            "codigo",
            "nombre",
            "contacto",
            "username",
            "creado_en",
            "cant_compras",
            "total_compras_ars",
            "total_compras_usd",
            "total_bonos_ars",
            "total_bonos_usd",
            "cant_retiros",
            "total_retiros_ars",
            "total_retiros_usd",
            "contactado",
            "first_touch_at",
            "fbc",
            "fbp",
            "fbclid",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
            "utm_term",
            "event_source_url",
            "ip_address",
            "user_agent",
            "empresa",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "codigo",
            "creado_en",
            "cant_compras",
            "total_compras_ars",
            "total_compras_usd",
            "total_bonos_ars",
            "total_bonos_usd",
            "cant_retiros",
            "total_retiros_ars",
            "total_retiros_usd",
        ]


class ClienteCreateSerializer(serializers.Serializer):
    landing_token = serializers.UUIDField(write_only=True)
    idempotency_key = serializers.UUIDField(required=False, write_only=True)
    reservation_token = serializers.CharField(required=False, allow_blank=True, write_only=True)
    manual_create = serializers.BooleanField(required=False, write_only=True, default=False)
    confirm_existing_code = serializers.BooleanField(required=False, write_only=True, default=False)
    nombre = serializers.CharField(max_length=100, required=False, allow_blank=True)
    contacto = serializers.CharField(max_length=15, required=False, allow_blank=True)
    username = serializers.CharField(max_length=50, required=False, allow_blank=True)
    codigo = serializers.CharField(max_length=CLIENTE_CODIGO_LENGTH, required=False, allow_blank=True)
    fbp = serializers.CharField(max_length=255, required=False, allow_blank=True)
    fbc = serializers.CharField(max_length=255, required=False, allow_blank=True)
    fbclid = serializers.CharField(max_length=255, required=False, allow_blank=True)
    utm_source = serializers.CharField(max_length=255, required=False, allow_blank=True)
    utm_medium = serializers.CharField(max_length=255, required=False, allow_blank=True)
    utm_campaign = serializers.CharField(max_length=255, required=False, allow_blank=True)
    utm_content = serializers.CharField(max_length=255, required=False, allow_blank=True)
    utm_term = serializers.CharField(max_length=255, required=False, allow_blank=True)
    event_source_url = serializers.URLField(max_length=1024, required=False, allow_blank=True)

    def validate(self, data):
        try:
            landing = Landing.objects.get(token=data["landing_token"], activo=True)
        except Landing.DoesNotExist:
            raise serializers.ValidationError("Landing invalida o inactiva.")
        reservation_token = str(data.get("reservation_token") or "").strip()
        if reservation_token:
            reservation = get_reservation_by_token(reservation_token)
            if not reservation:
                raise serializers.ValidationError("La reserva del codigo vencio. Reintenta.")
            if reservation.get("landing_token") and str(reservation.get("landing_token")) != str(data["landing_token"]):
                raise serializers.ValidationError("La reserva del codigo no corresponde a esta landing.")
            reserved_code = str(reservation.get("code") or "").strip()
            requested_codigo = str(data.get("codigo") or "").strip()
            if reserved_code:
                if requested_codigo and requested_codigo != reserved_code:
                    raise serializers.ValidationError("El codigo solicitado no coincide con la reserva activa.")
                data["codigo"] = reserved_code
            data["reservation_token"] = reservation_token
        data["landing"] = landing
        return data

    def _unique_username(self, base_username):
        if not Cliente.objects.filter(username=base_username).exists():
            return base_username
        suffix = 1
        while True:
            candidate = f"{base_username}_{suffix}"
            if len(candidate) > 50:
                trim_len = 50 - len(f"_{suffix}")
                candidate = f"{base_username[:trim_len]}_{suffix}"
            if not Cliente.objects.filter(username=candidate).exists():
                return candidate
            suffix += 1

    def _resolve_unique_codigo(self, requested_codigo=None, *, empresa=None):
        reservation_token = str(self.context.get("reservation_token") or "").strip()
        candidate = (requested_codigo or "").strip().upper()
        if candidate:
            codigo_pattern = rf"\d{{{CLIENTE_CODIGO_MIN_LENGTH},8}}"
            if not (
                re.fullmatch(codigo_pattern, candidate)
                or codigo_cliente_tiene_formato_nuevo(candidate)
            ):
                raise serializers.ValidationError(
                    f"El codigo debe tener entre {CLIENTE_CODIGO_MIN_LENGTH} y 8 digitos o formato AA + {CLIENTE_CODIGO_BODY_LENGTH} caracteres."
                )
            if (
                not Cliente.objects.filter(codigo=candidate).exists()
                and not is_code_reserved(candidate, reservation_token=reservation_token)
            ):
                return candidate
        if candidate:
            candidate = ""
        prefijo = obtener_prefijo_empresa(empresa)
        for _ in range(20):
            generated = generar_codigo_corto(prefijo)
            if (
                not Cliente.objects.filter(codigo=generated).exists()
                and not is_code_reserved(generated, reservation_token=reservation_token)
            ):
                return generated
        raise serializers.ValidationError("No se pudo generar un codigo unico. Reintenta.")

    def create(self, validated_data):
        landing = validated_data.pop("landing")
        validated_data.pop("landing_token", None)
        idempotency_key = validated_data.pop("idempotency_key", None)
        validated_data.pop("reservation_token", None)
        validated_data.pop("manual_create", None)
        validated_data.pop("confirm_existing_code", None)
        if idempotency_key:
            existing = Cliente.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

        requested_codigo = validated_data.pop("codigo", "")
        nombre = (validated_data.get("nombre") or "").strip()
        contacto = normalize_contacto(validated_data.get("contacto"))
        username = (validated_data.get("username") or "").strip()

        request = self.context.get("request")
        enforce_form_requirements = landing.mostrar_formulario and not (
            request
            and getattr(request, "user", None)
            and request.user.is_authenticated
        )
        if enforce_form_requirements:
            require_nombre = bool(landing.mostrar_campo_nombre)
            require_telefono = bool(landing.mostrar_campo_telefono)
            if require_nombre or require_telefono:
                has_nombre = bool(nombre)
                has_contacto = bool(contacto)
                if require_nombre and require_telefono and not (has_nombre or has_contacto):
                    raise serializers.ValidationError("Completa nombre, telefono o ambos.")
                if require_nombre and not require_telefono and not has_nombre:
                    raise serializers.ValidationError("Nombre es obligatorio para esta landing.")
                if require_telefono and not require_nombre and not has_contacto:
                    raise serializers.ValidationError("Telefono es obligatorio para esta landing.")

        validated_data["nombre"] = nombre or None
        validated_data["contacto"] = contacto or None
        validated_data["username"] = self._unique_username(username) if username else None
        validated_data["codigo"] = self._resolve_unique_codigo(requested_codigo, empresa=landing.empresa)
        validated_data["ip_address"] = get_request_ip(request)
        validated_data["user_agent"] = get_request_user_agent(request)

        for _ in range(3):
            try:
                with transaction.atomic():
                    return Cliente.objects.create(
                        empresa=landing.empresa,
                        idempotency_key=idempotency_key,
                        **validated_data,
                    )
            except IntegrityError:
                validated_data["codigo"] = self._resolve_unique_codigo("", empresa=landing.empresa)
                if validated_data["username"]:
                    validated_data["username"] = self._unique_username(validated_data["username"])
        raise serializers.ValidationError("No se pudo crear el cliente por conflicto de datos. Reintenta.")


class LandingSerializer(serializers.ModelSerializer):
    bono = serializers.CharField()
    pixel_id = serializers.SerializerMethodField()
    empresa_codigo_prefijo = serializers.SerializerMethodField()
    config_groups = serializers.SerializerMethodField()
    clear_imagen_reemplazo_form = serializers.BooleanField(write_only=True, required=False, default=False)

    def get_pixel_id(self, obj):
        cred = obj.credencial_meta
        if cred:
            return cred.pixel_id
        cred = credencial_principal_para_empresa(empresa_id=obj.empresa_id)
        return cred.pixel_id if cred else None

    def get_empresa_codigo_prefijo(self, obj):
        return obtener_prefijo_empresa(getattr(obj, "empresa", None))

    def get_config_groups(self, obj):
        return landing_config_groups(obj)

    def validate(self, attrs):
        credencial_meta = attrs.get("credencial_meta")
        credencial_meta_extra = attrs.get("credencial_meta_extra")
        empresa = attrs.get("empresa") or getattr(self.instance, "empresa", None)
        if (
            credencial_meta
            and empresa
            and (
                credencial_meta.bm.organizacion_id != empresa.organizacion_id
                or not credencial_aplica_a_empresa(credencial_meta, empresa.id)
            )
        ):
            raise serializers.ValidationError(
                "La credencial Meta seleccionada no pertenece a la organizacion de la landing."
            )
        if (
            credencial_meta_extra
            and empresa
            and (
                credencial_meta_extra.bm.organizacion_id != empresa.organizacion_id
                or not credencial_aplica_a_empresa(credencial_meta_extra, empresa.id)
            )
        ):
            raise serializers.ValidationError(
                "La credencial Meta extra no pertenece a la organizacion de la landing."
            )
        effective_main = credencial_meta or getattr(self.instance, "credencial_meta", None)
        effective_extra = credencial_meta_extra or getattr(self.instance, "credencial_meta_extra", None)
        send_extra = attrs.get(
            "enviar_capi_pixel_extra",
            getattr(self.instance, "enviar_capi_pixel_extra", False),
        )
        if send_extra and not effective_extra:
            raise serializers.ValidationError(
                {"credencial_meta_extra": "Selecciona una credencial Meta extra para habilitar el envio adicional por CAPI."}
            )
        if send_extra and effective_main and effective_extra and effective_main.id == effective_extra.id:
            raise serializers.ValidationError(
                {"credencial_meta_extra": "La credencial Meta extra debe ser distinta del pixel principal de la landing."}
            )
        effective_mostrar_formulario = attrs.get(
            "mostrar_formulario",
            getattr(self.instance, "mostrar_formulario", True),
        )
        effective_mostrar_campo_nombre = attrs.get(
            "mostrar_campo_nombre",
            getattr(self.instance, "mostrar_campo_nombre", True),
        )
        effective_mostrar_campo_telefono = attrs.get(
            "mostrar_campo_telefono",
            getattr(self.instance, "mostrar_campo_telefono", False),
        )
        if effective_mostrar_formulario and not (effective_mostrar_campo_nombre or effective_mostrar_campo_telefono):
            raise serializers.ValidationError(
                {"mostrar_campo_nombre": "Activa al menos uno de los campos del formulario."}
            )
        size_fields = (
            "size_titulo",
            "size_subtitulo",
            "size_keyword",
            "size_bono",
            "size_info",
            "size_boton",
            "size_form",
        )
        for field_name in size_fields:
            if field_name not in attrs:
                continue
            try:
                size_value = float(attrs[field_name])
            except (TypeError, ValueError):
                raise serializers.ValidationError({field_name: "Valor invalido."})
            if size_value < 0.6 or size_value > 6:
                raise serializers.ValidationError({field_name: "Debe estar entre 0.6 y 6."})
        if "form_bg_opacity" in attrs:
            try:
                opacity = float(attrs["form_bg_opacity"])
            except (TypeError, ValueError):
                raise serializers.ValidationError({"form_bg_opacity": "Valor invalido."})
            if opacity < 0 or opacity > 1:
                raise serializers.ValidationError({"form_bg_opacity": "Debe estar entre 0 y 1."})
        weight_fields = (
            "weight_titulo",
            "weight_subtitulo",
            "weight_keyword",
            "weight_bono",
            "weight_info",
            "weight_boton",
            "weight_form",
        )
        for field_name in weight_fields:
            if field_name not in attrs:
                continue
            try:
                weight_value = int(attrs[field_name])
            except (TypeError, ValueError):
                raise serializers.ValidationError({field_name: "Valor invalido."})
            if weight_value < 100 or weight_value > 900:
                raise serializers.ValidationError({field_name: "Debe estar entre 100 y 900."})
        return attrs

    def validate_url(self, value):
        if value and not value.startswith(("http://", "https://")):
            value = f"https://{value}"
        return value

    def validate_texto_whatsapp(self, value):
        if not value:
            return value
        allowed = {"bono", "username", "nombre", "contacto", "codigo"}
        found = set(re.findall(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}", value))
        invalid = sorted(item for item in found if item not in allowed)
        if invalid:
            allowed_text = ", ".join(sorted(allowed))
            invalid_text = ", ".join(invalid)
            raise serializers.ValidationError(
                f"Variables no permitidas: {invalid_text}. Usa solo: {allowed_text}."
            )
        return value

    def validate_font_scale(self, value):
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("font_scale invalido.")
        if number < 0.8 or number > 1.6:
            raise serializers.ValidationError("font_scale debe estar entre 0.8 y 1.6.")
        return value

    def create(self, validated_data):
        validated_data.pop("clear_imagen_reemplazo_form", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        clear_imagen_reemplazo_form = bool(validated_data.pop("clear_imagen_reemplazo_form", False))
        if clear_imagen_reemplazo_form and instance.imagen_reemplazo_form:
            instance.imagen_reemplazo_form.delete(save=False)
            instance.imagen_reemplazo_form = None
        return super().update(instance, validated_data)

    class Meta:
        model = Landing
        fields = [
            "id",
            "empresa",
            "credencial_meta",
            "enviar_capi_pixel_extra",
            "credencial_meta_extra",
            "nombre",
            "token",
            "url",
            "bono",
            "titulo",
            "subtitulo",
            "texto_boton",
            "texto_info",
            "texto_whatsapp",
            "mostrar_formulario",
            "mostrar_campo_nombre",
            "mostrar_campo_telefono",
            "mostrar_disclaimer",
            "mostrar_ticker",
            "mostrar_medios_pago",
            "mostrar_comunidad",
            "texto_comunidad",
            "mostrar_pasos",
            "texto_pasos",
            "color_titulo",
            "color_subtitulo",
            "color_keyword",
            "color_bono",
            "color_info",
            "form_bg_color",
            "form_bg_opacity",
            "form_field_border_color",
            "font_family",
            "font_scale",
            "font_titulo",
            "font_subtitulo",
            "font_keyword",
            "font_bono",
            "font_info",
            "font_boton",
            "font_form",
            "size_titulo",
            "size_subtitulo",
            "size_keyword",
            "size_bono",
            "size_info",
            "size_boton",
            "size_form",
            "weight_titulo",
            "weight_subtitulo",
            "weight_keyword",
            "weight_bono",
            "weight_info",
            "weight_boton",
            "weight_form",
            "bg_type",
            "bg_color",
            "bg_gradient",
            "background_vertical",
            "background_horizontal",
            "imagen_reemplazo_form",
            "clear_imagen_reemplazo_form",
            "activo",
            "creado_en",
            "pixel_id",
            "empresa_codigo_prefijo",
            "config_groups",
        ]
        read_only_fields = ["id", "empresa", "token", "creado_en"]


class LandingVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandingVisit
        fields = ["id", "landing", "empresa", "creado_en"]
        read_only_fields = fields


class LandingVisitCreateSerializer(serializers.Serializer):
    landing_token = serializers.UUIDField(write_only=True)

    def validate(self, data):
        try:
            landing = Landing.objects.get(token=data["landing_token"], activo=True)
        except Landing.DoesNotExist:
            raise serializers.ValidationError("Landing invalida o inactiva.")
        data["landing"] = landing
        return data

    def create(self, validated_data):
        landing = validated_data["landing"]
        return LandingVisit.objects.create(
            landing=landing,
            empresa=landing.empresa,
        )


class EventosMetaReadSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    cliente_username = serializers.CharField(source="cliente.username", read_only=True)
    cliente_contacto = serializers.CharField(source="cliente.contacto", read_only=True)
    cliente_codigo = serializers.CharField(source="cliente.codigo", read_only=True)
    empresa_nombre = serializers.CharField(source="empresa.nombre", read_only=True)
    landing_nombre = serializers.CharField(source="landing.nombre", read_only=True)
    operador_username = serializers.CharField(source="operador.username", read_only=True)
    contactado = serializers.BooleanField(read_only=True)

    class Meta:
        model = EventosMeta
        fields = [
            "id",
            "id_evento",
            "cliente",
            "cliente_nombre",
            "cliente_username",
            "cliente_contacto",
            "cliente_codigo",
            "contactado",
            "empresa",
            "empresa_nombre",
            "landing",
            "landing_nombre",
            "operador",
            "operador_username",
            "tipo",
            "data",
            "ocurrido_en",
            "fuente",
            "ctwa_clid",
            "fbp",
            "fbc",
            "ip_address",
            "user_agent",
            "estado_envio",
            "respuesta_meta",
            "reintentos",
            "creado_en",
            "enviado_en",
        ]
        read_only_fields = fields


class EventosMetaCreateSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    landing_token = serializers.UUIDField(required=False)
    empresa_id = serializers.IntegerField(required=False)
    ocurrido_en = serializers.DateTimeField(required=False)

    tipo = serializers.ChoiceField(choices=EventosMeta._meta.get_field("tipo").choices)

    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    currency = serializers.CharField(max_length=3, required=False)

    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False)

    fbp = serializers.CharField(required=False)
    fbc = serializers.CharField(required=False)

    def validate(self, data):
        tipo = data["tipo"]
        landing = None
        empresa_id = data.get("empresa_id")
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if tipo == "lead":
            landing_token = data.get("landing_token")
            if not landing_token:
                raise serializers.ValidationError("landing_token requerido para lead.")
            try:
                landing = Landing.objects.get(token=landing_token, activo=True)
            except Landing.DoesNotExist:
                raise serializers.ValidationError("Landing invalida o inactiva.")
            empresa_id = landing.empresa_id
        else:
            if not user or not user.is_authenticated:
                raise serializers.ValidationError("Autenticacion requerida para contact/purchase.")

            allowed_ids = [] if user.is_superuser else get_user_empresa_ids(user)
            if empresa_id not in (None, ""):
                try:
                    empresa_id = int(empresa_id)
                except (TypeError, ValueError):
                    raise serializers.ValidationError("empresa_id invalido.")
                if not user.is_superuser and empresa_id not in allowed_ids:
                    raise serializers.ValidationError("No tenes acceso a la empresa seleccionada.")
            else:
                if user.is_superuser:
                    raise serializers.ValidationError("empresa_id requerido para contact/purchase.")
                if len(allowed_ids) == 1:
                    empresa_id = int(allowed_ids[0])
                elif getattr(user, "empresa_id", None) in allowed_ids:
                    empresa_id = int(user.empresa_id)
                else:
                    raise serializers.ValidationError("empresa_id requerido para contact/purchase.")

        cliente = Cliente.objects.filter(id=data["cliente_id"], empresa_id=empresa_id).only("id", "cant_compras").first()
        if not cliente:
            raise serializers.ValidationError("El cliente no pertenece a la empresa.")
        if data["tipo"] == "purchase":
            if "value" not in data or "currency" not in data:
                raise serializers.ValidationError("El evento purchase requiere value y currency")
            if cliente.cant_compras > 0:
                raise serializers.ValidationError("El evento purchase solo aplica a clientes con 0 compras.")
        data["landing"] = landing
        data["empresa_id"] = empresa_id
        data["ocurrido_en"] = data.get("ocurrido_en") or timezone.now()
        return data


class CompraSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    cliente_username = serializers.CharField(source="cliente.username", read_only=True)

    class Meta:
        model = Compra
        fields = [
            "id",
            "cliente",
            "cliente_nombre",
            "cliente_username",
            "empresa",
            "operador",
            "monto_ars",
            "tc",
            "monto_usd",
            "bono_ars",
            "bono_usd",
            "comprobante",
            "comprobante_archivo",
            "tipo_cambio",
            "creado_en",
            "ocurrido_en",
        ]
        read_only_fields = ["id", "empresa", "tc", "monto_usd", "bono_usd", "creado_en", "ocurrido_en"]


class RetiroSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    cliente_username = serializers.CharField(source="cliente.username", read_only=True)

    class Meta:
        model = Retiro
        fields = [
            "id",
            "cliente",
            "cliente_nombre",
            "cliente_username",
            "empresa",
            "operador",
            "monto_ars",
            "tc",
            "monto_usd",
            "comprobante",
            "comprobante_archivo",
            "tipo_cambio",
            "creado_en",
        ]
        read_only_fields = ["id", "empresa", "tc", "monto_usd", "creado_en"]
