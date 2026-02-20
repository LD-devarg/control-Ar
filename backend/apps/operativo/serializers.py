from rest_framework import serializers
import re

from .models import Cliente, EventosMeta, Compra, Landing, LandingVisit
from apps.pauta.models import CredencialesMeta


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            "id",
            "uuid",
            "nombre",
            "contacto",
            "username",
            "creado_en",
            "cant_compras",
            "total_compras_ars",
            "total_compras_usd",
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
            "empresa",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "creado_en",
            "cant_compras",
            "total_compras_ars",
            "total_compras_usd",
        ]


class ClienteCreateSerializer(serializers.Serializer):
    landing_token = serializers.UUIDField(write_only=True)
    idempotency_key = serializers.UUIDField(required=False, write_only=True)
    nombre = serializers.CharField(max_length=100)
    contacto = serializers.CharField(max_length=15)
    username = serializers.CharField(max_length=50)
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

    def create(self, validated_data):
        landing = validated_data.pop("landing")
        validated_data.pop("landing_token", None)
        idempotency_key = validated_data.pop("idempotency_key", None)
        if idempotency_key:
            existing = Cliente.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing
        validated_data["username"] = self._unique_username(validated_data["username"])
        return Cliente.objects.create(
            empresa=landing.empresa,
            idempotency_key=idempotency_key,
            **validated_data,
        )


class LandingSerializer(serializers.ModelSerializer):
    bono = serializers.CharField()
    pixel_id = serializers.SerializerMethodField()

    def get_pixel_id(self, obj):
        cred = CredencialesMeta.objects.filter(empresa=obj.empresa).order_by("id").first()
        return cred.pixel_id if cred else None

    def validate_url(self, value):
        if value and not value.startswith(("http://", "https://")):
            value = f"https://{value}"
        return value

    def validate_texto_whatsapp(self, value):
        if not value:
            return value
        allowed = {"bono", "username", "nombre", "contacto"}
        found = set(re.findall(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}", value))
        invalid = sorted(item for item in found if item not in allowed)
        if invalid:
            allowed_text = ", ".join(sorted(allowed))
            invalid_text = ", ".join(invalid)
            raise serializers.ValidationError(
                f"Variables no permitidas: {invalid_text}. Usa solo: {allowed_text}."
            )
        return value

    class Meta:
        model = Landing
        fields = [
            "id",
            "empresa",
            "nombre",
            "token",
            "url",
            "bono",
            "titulo",
            "subtitulo",
            "texto_boton",
            "texto_info",
            "texto_whatsapp",
            "mostrar_disclaimer",
            "mostrar_ticker",
            "color_titulo",
            "color_subtitulo",
            "color_keyword",
            "color_bono",
            "color_info",
            "bg_type",
            "bg_color",
            "bg_gradient",
            "background_vertical",
            "background_horizontal",
            "activo",
            "creado_en",
            "pixel_id",
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
            "contactado",
            "empresa",
            "landing",
            "operador",
            "tipo",
            "data",
            "fbp",
            "fbc",
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
            if not empresa_id:
                request = self.context.get("request")
                empresa_id = getattr(getattr(request, "user", None), "empresa_id", None)
            if not empresa_id:
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
            "comprobante",
            "comprobante_archivo",
            "tipo_cambio",
            "creado_en",
        ]
        read_only_fields = ["id", "empresa", "tc", "monto_usd", "creado_en"]
