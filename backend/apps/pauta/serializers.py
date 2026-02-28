from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import serializers

from apps.empresas.models import Empresa
from apps.empresas.scope import get_user_empresa_ids
from .servicios.crypto import encrypt_token
from .servicios.meta_provisioning import (
    MetaProvisioningError,
    create_ad_in_meta,
    create_adset_in_meta,
    create_campaign_in_meta,
    create_creative_in_meta,
    get_meta_token_for_empresa,
)
from apps.recursos.models import TipoCambio

from .models import (
    BM,
    CuentaPublicitaria,
    Campaña,
    ConjuntoAnuncios,
    Anuncio,
    GastoDiario,
    CredencialesMeta,
    FanPage,
    InstagramAccount,
    PautaAsset,
    Creative,
    KPIObjetivo,
)


class BMSerializer(serializers.ModelSerializer):
    empresas = serializers.PrimaryKeyRelatedField(
        queryset=Empresa.objects.select_related("organizacion").all(),
        many=True,
        required=False,
    )
    empresa = serializers.PrimaryKeyRelatedField(
        queryset=Empresa.objects.select_related("organizacion").all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = BM
        fields = ["id", "organizacion", "empresas", "empresa", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        empresa = attrs.pop("empresa", None)
        empresas = list(attrs.get("empresas") or [])
        if empresa and empresa not in empresas:
            empresas.append(empresa)
        organizacion = attrs.get("organizacion") or getattr(instance, "organizacion", None)

        if not empresas and instance is not None:
            empresas = list(instance.empresas.all())

        for selected_empresa in empresas:
            if not selected_empresa.organizacion_id:
                raise serializers.ValidationError("La empresa seleccionada no tiene organizacion asociada.")
            if organizacion and organizacion.id != selected_empresa.organizacion_id:
                raise serializers.ValidationError("La organizacion no coincide con la empresa seleccionada.")
            organizacion = selected_empresa.organizacion

        if user and not user.is_superuser:
            user_org_id = user.organizacion_id or getattr(getattr(user, "empresa", None), "organizacion_id", None)
            if not user_org_id:
                raise serializers.ValidationError("El usuario actual no tiene organizacion asociada.")
            if organizacion and organizacion.id != user_org_id:
                raise serializers.ValidationError("No tenes acceso a la organizacion seleccionada.")
            organizacion = organizacion or getattr(getattr(user, "empresa", None), "organizacion", None)
            if organizacion is None and user.organizacion_id:
                organizacion = user.organizacion

            allowed_ids = set(get_user_empresa_ids(user))
            if not empresas:
                if user.empresa_id:
                    default_empresa = Empresa.objects.filter(id=user.empresa_id).first()
                    if default_empresa:
                        empresas = [default_empresa]
            if not empresas:
                raise serializers.ValidationError("Debes seleccionar al menos una empresa para el BM.")
            forbidden = [item.id for item in empresas if item.id not in allowed_ids]
            if forbidden:
                raise serializers.ValidationError(f"No tenes acceso a las empresas seleccionadas: {forbidden}")

        if not empresas:
            raise serializers.ValidationError("Debes seleccionar al menos una empresa para el BM.")

        if organizacion is None:
            raise serializers.ValidationError("Organizacion requerida.")

        attrs["organizacion"] = organizacion
        attrs["empresas"] = empresas
        return attrs


def _resolve_empresa_for_write(attrs, instance, request_user):
    empresa = attrs.get("empresa") or getattr(instance, "empresa", None)
    if request_user and not request_user.is_superuser:
        allowed_ids = get_user_empresa_ids(request_user)
        if not allowed_ids:
            raise serializers.ValidationError("Empresa no disponible en el usuario actual.")
        if empresa is not None:
            if empresa.id not in allowed_ids:
                raise serializers.ValidationError("No tenes acceso a la empresa seleccionada.")
        else:
            empresa = request_user.empresa or None
            if empresa is None:
                empresa = None
    return empresa


class CuentaPublicitariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaPublicitaria
        fields = ["id", "empresa", "bm", "meta_id", "nombre", "estado", "moneda", "creado_en"]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        empresa = _resolve_empresa_for_write(attrs, instance, user)
        bm = attrs.get("bm") or getattr(instance, "bm", None)

        if empresa is None:
            raise serializers.ValidationError("Empresa requerida.")
        if not bm:
            raise serializers.ValidationError("BM requerido.")
        if empresa.organizacion_id != bm.organizacion_id:
            raise serializers.ValidationError("El BM no pertenece a la organizacion de la empresa seleccionada.")
        if not bm.empresas.filter(id=empresa.id).exists():
            raise serializers.ValidationError("El BM seleccionado no esta vinculado a la empresa.")

        attrs["empresa"] = empresa
        return attrs


class CampañaSerializer(serializers.ModelSerializer):
    tipo_compra = serializers.CharField(write_only=True, required=False, allow_blank=True)
    estrategia_presupuesto = serializers.CharField(write_only=True, required=False, allow_blank=True)
    objetivo_roas = serializers.DecimalField(
        write_only=True,
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=4,
    )
    create_meta_draft = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Campaña
        fields = [
            "id",
            "empresa",
            "cuenta_publicitaria",
            "meta_id",
            "nombre",
            "estado",
            "fecha_inicio",
            "fecha_fin",
            "objetivo",
            "tipo_compra",
            "estrategia_presupuesto",
            "objetivo_roas",
            "create_meta_draft",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        cuenta = attrs.get("cuenta_publicitaria") or getattr(instance, "cuenta_publicitaria", None)
        empresa = _resolve_empresa_for_write(attrs, instance, user)
        if empresa is None and cuenta is not None:
            empresa = cuenta.empresa

        if empresa is None:
            raise serializers.ValidationError("Empresa requerida.")
        if not cuenta:
            raise serializers.ValidationError("Cuenta publicitaria requerida.")
        if cuenta.empresa_id != empresa.id:
            raise serializers.ValidationError("La cuenta publicitaria no pertenece a la empresa seleccionada.")

        attrs["empresa"] = empresa
        return attrs

    def create(self, validated_data):
        tipo_compra = validated_data.pop("tipo_compra", "")
        estrategia_presupuesto = validated_data.pop("estrategia_presupuesto", "")
        objetivo_roas = validated_data.pop("objetivo_roas", None)
        create_meta_draft = validated_data.pop("create_meta_draft", True)
        validated_data["estado"] = "pending"
        if not validated_data.get("fecha_inicio"):
            validated_data["fecha_inicio"] = timezone.localdate()
        if not validated_data.get("meta_id") and create_meta_draft:
            try:
                token = get_meta_token_for_empresa(validated_data["empresa"].id)
                meta_id = create_campaign_in_meta(
                    cuenta_publicitaria=validated_data["cuenta_publicitaria"],
                    token=token,
                    nombre=validated_data["nombre"],
                    objetivo=validated_data["objetivo"],
                    tipo_compra=tipo_compra,
                    estrategia_presupuesto=estrategia_presupuesto,
                    objetivo_roas=objetivo_roas,
                    fecha_inicio=validated_data.get("fecha_inicio"),
                    fecha_fin=validated_data.get("fecha_fin"),
                )
            except MetaProvisioningError as exc:
                raise serializers.ValidationError(f"Error creando campaña en Meta: {exc}") from exc
            validated_data["meta_id"] = meta_id
        if not validated_data.get("meta_id"):
            validated_data["meta_id"] = ""
        return super().create(validated_data)


class ConjuntoAnunciosSerializer(serializers.ModelSerializer):
    create_meta_draft = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = ConjuntoAnuncios
        fields = [
            "id",
            "empresa",
            "campaña",
            "meta_id",
            "nombre",
            "estado",
            "presupuesto_diario",
            "segmentacion",
            "fecha_inicio",
            "fecha_fin",
            "create_meta_draft",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        campana = attrs.get("campaña") or getattr(instance, "campaña", None)
        empresa = _resolve_empresa_for_write(attrs, instance, user)
        if empresa is None and campana is not None:
            empresa = campana.empresa

        if empresa is None:
            raise serializers.ValidationError("Empresa requerida.")
        if not campana:
            raise serializers.ValidationError("Campaña requerida.")
        if campana.empresa_id != empresa.id:
            raise serializers.ValidationError("La campaña no pertenece a la empresa seleccionada.")

        attrs["empresa"] = empresa
        return attrs

    def create(self, validated_data):
        create_meta_draft = validated_data.pop("create_meta_draft", True)
        validated_data["estado"] = "pending"
        if not validated_data.get("fecha_inicio"):
            validated_data["fecha_inicio"] = timezone.localdate()
        if not validated_data.get("meta_id") and create_meta_draft:
            campana = validated_data["campaña"]
            if not campana.meta_id:
                raise serializers.ValidationError("La campaña no tiene meta_id. No se puede crear borrador en Meta.")
            try:
                token = get_meta_token_for_empresa(validated_data["empresa"].id)
                meta_id = create_adset_in_meta(
                    cuenta_publicitaria=campana.cuenta_publicitaria,
                    token=token,
                    campaign_meta_id=campana.meta_id,
                    nombre=validated_data["nombre"],
                    presupuesto_diario=validated_data.get("presupuesto_diario"),
                    segmentacion=validated_data.get("segmentacion") or {},
                    fecha_inicio=validated_data.get("fecha_inicio"),
                    fecha_fin=validated_data.get("fecha_fin"),
                )
            except MetaProvisioningError as exc:
                raise serializers.ValidationError(f"Error creando adset en Meta: {exc}") from exc
            validated_data["meta_id"] = meta_id
        if not validated_data.get("meta_id"):
            validated_data["meta_id"] = ""
        return super().create(validated_data)


class AnuncioSerializer(serializers.ModelSerializer):
    destino = serializers.CharField(write_only=True, required=False, allow_blank=True)
    create_meta_draft = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Anuncio
        fields = [
            "id",
            "empresa",
            "conjunto_anuncios",
            "creative",
            "meta_id",
            "nombre",
            "estado",
            "destino",
            "create_meta_draft",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        adset = attrs.get("conjunto_anuncios") or getattr(instance, "conjunto_anuncios", None)
        creative = attrs.get("creative") or getattr(instance, "creative", None)
        empresa = _resolve_empresa_for_write(attrs, instance, user)
        if empresa is None and adset is not None:
            empresa = adset.empresa

        if empresa is None:
            raise serializers.ValidationError("Empresa requerida.")
        if not adset:
            raise serializers.ValidationError("Adset requerido.")
        if not creative:
            raise serializers.ValidationError("Creative requerido.")
        if adset.empresa_id != empresa.id:
            raise serializers.ValidationError("El adset no pertenece a la empresa seleccionada.")
        if creative.empresa_id != empresa.id:
            raise serializers.ValidationError("El creative no pertenece a la empresa seleccionada.")

        attrs["empresa"] = empresa
        return attrs

    def create(self, validated_data):
        validated_data.pop("destino", None)
        create_meta_draft = validated_data.pop("create_meta_draft", True)
        validated_data["estado"] = "pending"
        if not validated_data.get("meta_id") and create_meta_draft:
            adset = validated_data["conjunto_anuncios"]
            campana = getattr(adset, "campaña")
            creative = validated_data["creative"]
            if not adset.meta_id:
                raise serializers.ValidationError("El adset no tiene meta_id. No se puede crear borrador en Meta.")
            try:
                token = get_meta_token_for_empresa(validated_data["empresa"].id)
                creative_meta_id = create_creative_in_meta(
                    cuenta_publicitaria=campana.cuenta_publicitaria,
                    token=token,
                    creative=creative,
                )
                meta_id = create_ad_in_meta(
                    cuenta_publicitaria=campana.cuenta_publicitaria,
                    token=token,
                    adset_meta_id=adset.meta_id,
                    creative_meta_id=creative_meta_id,
                    nombre=validated_data["nombre"],
                )
            except MetaProvisioningError as exc:
                raise serializers.ValidationError(f"Error creando anuncio en Meta: {exc}") from exc
            validated_data["meta_id"] = meta_id
        return super().create(validated_data)


class GastoDiarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = GastoDiario
        fields = [
            "id",
            "empresa",
            "cuenta_publicitaria",
            "fecha",
            "monto_usd",
            "tc",
            "monto_ars",
            "creado_en",
        ]
        read_only_fields = ["id", "tc", "monto_ars", "creado_en"]

    def _get_tc_vigente(self):
        return (
            TipoCambio.objects.filter(vigente_hasta__isnull=True)
            .order_by("-vigente_desde", "-creado_en")
            .first()
        )

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        cuenta = attrs.get("cuenta_publicitaria") or getattr(instance, "cuenta_publicitaria", None)
        empresa = attrs.get("empresa") or getattr(instance, "empresa", None)

        if not user:
            raise serializers.ValidationError("Usuario no disponible.")

        if user.is_superuser:
            if empresa is None and cuenta is not None:
                empresa = cuenta.empresa
            if empresa is None:
                raise serializers.ValidationError("Empresa requerida.")
        else:
            if not user.empresa_id:
                raise serializers.ValidationError("Empresa no disponible en el usuario actual.")
            empresa = user.empresa

        if cuenta and empresa and cuenta.empresa_id != empresa.id:
            raise serializers.ValidationError("La cuenta publicitaria no pertenece a la empresa seleccionada.")

        monto_usd = attrs.get("monto_usd")
        if monto_usd is None and instance is not None:
            monto_usd = instance.monto_usd
        if monto_usd is None:
            raise serializers.ValidationError("monto_usd requerido.")

        tc_obj = self._get_tc_vigente()
        if not tc_obj or tc_obj.valor is None:
            raise serializers.ValidationError("No hay tipo de cambio vigente.")

        try:
            monto_decimal = Decimal(str(monto_usd))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError("monto_usd invalido.")

        attrs["empresa"] = empresa
        attrs["tc"] = tc_obj.valor
        attrs["monto_ars"] = (monto_decimal * tc_obj.valor).quantize(Decimal("0.01"))
        return attrs


class CredencialesMetaSerializer(serializers.ModelSerializer):
    token_acceso_encrypted = serializers.CharField(write_only=True)
    token_configurado = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CredencialesMeta
        fields = [
            "id",
            "empresa",
            "bm",
            "nombre",
            "pixel_id",
            "app_id",
            "token_acceso_encrypted",
            "token_configurado",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "app_id": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def get_token_configurado(self, obj):
        return bool(getattr(obj, "token_acceso_encrypted", ""))

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        empresa = _resolve_empresa_for_write(attrs, instance, user)
        bm = attrs.get("bm") or getattr(instance, "bm", None)

        if empresa is None:
            raise serializers.ValidationError("Empresa requerida.")
        if not bm:
            raise serializers.ValidationError("BM requerido.")
        if empresa.organizacion_id != bm.organizacion_id:
            raise serializers.ValidationError("El BM no pertenece a la organizacion de la empresa seleccionada.")
        if not bm.empresas.filter(id=empresa.id).exists():
            raise serializers.ValidationError("El BM seleccionado no esta vinculado a la empresa.")

        attrs["empresa"] = empresa
        return attrs

    def create(self, validated_data):
        token = validated_data.pop("token_acceso_encrypted")
        validated_data["token_acceso_encrypted"] = encrypt_token(token)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        token = validated_data.pop("token_acceso_encrypted", None)
        if token not in (None, ""):
            validated_data["token_acceso_encrypted"] = encrypt_token(token)
        return super().update(instance, validated_data)


class FanPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FanPage
        fields = ["id", "empresa", "bm", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = getattr(self, "instance", None)

        empresa = _resolve_empresa_for_write(attrs, instance, user)
        bm = attrs.get("bm") or getattr(instance, "bm", None)

        if empresa is None:
            raise serializers.ValidationError("Empresa requerida.")
        if not bm:
            raise serializers.ValidationError("BM requerido.")
        if empresa.organizacion_id != bm.organizacion_id:
            raise serializers.ValidationError("El BM no pertenece a la organizacion de la empresa seleccionada.")
        if not bm.empresas.filter(id=empresa.id).exists():
            raise serializers.ValidationError("El BM seleccionado no esta vinculado a la empresa.")

        attrs["empresa"] = empresa
        return attrs


class InstagramAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstagramAccount
        fields = ["id", "empresa", "fanpage", "meta_id", "username", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]

    def validate(self, attrs):
        fanpage = attrs.get("fanpage")
        empresa = attrs.get("empresa")
        if fanpage and empresa and fanpage.empresa_id != empresa.id:
            raise serializers.ValidationError("La empresa debe coincidir con la FanPage seleccionada.")
        return attrs


class PautaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PautaAsset
        fields = ["id", "empresa", "nombre", "tipo", "s3_url", "meta_asset_id", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]


class CreativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Creative
        fields = [
            "id",
            "empresa",
            "fanpage",
            "instagram_account",
            "nombre",
            "primary_text",
            "headline",
            "descripcion",
            "url_destino",
            "cta",
            "asset",
            "meta_id",
            "estado",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]


class KPIObjetivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIObjetivo
        fields = [
            "id",
            "empresa",
            "ingresos_objetivo_usd",
            "roas_objetivo",
            "cpa_objetivo_usd",
            "cpc_objetivo_usd",
            "cpl_objetivo_usd",
            "efectividad_objetivo",
            "frecuencia_objetivo",
            "ctr_objetivo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]
