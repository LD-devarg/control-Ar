from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import serializers

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
    class Meta:
        model = BM
        fields = ["id", "empresa", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]


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
        fields = ["id", "empresa", "bm", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]


class CampañaSerializer(serializers.ModelSerializer):
    estrategia_presupuesto = serializers.CharField(write_only=True, required=False, allow_blank=True)

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
            "estrategia_presupuesto",
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
        estrategia_presupuesto = validated_data.pop("estrategia_presupuesto", "")
        validated_data["estado"] = "pending"
        if not validated_data.get("fecha_inicio"):
            validated_data["fecha_inicio"] = timezone.localdate()
        if not validated_data.get("meta_id"):
            try:
                token = get_meta_token_for_empresa(validated_data["empresa"].id)
                meta_id = create_campaign_in_meta(
                    cuenta_publicitaria=validated_data["cuenta_publicitaria"],
                    token=token,
                    nombre=validated_data["nombre"],
                    objetivo=validated_data["objetivo"],
                    estrategia_presupuesto=estrategia_presupuesto,
                    fecha_inicio=validated_data.get("fecha_inicio"),
                    fecha_fin=validated_data.get("fecha_fin"),
                )
            except MetaProvisioningError as exc:
                raise serializers.ValidationError(f"Error creando campaña en Meta: {exc}") from exc
            validated_data["meta_id"] = meta_id
        return super().create(validated_data)


class ConjuntoAnunciosSerializer(serializers.ModelSerializer):
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
        validated_data["estado"] = "pending"
        if not validated_data.get("fecha_inicio"):
            validated_data["fecha_inicio"] = timezone.localdate()
        if not validated_data.get("meta_id"):
            campana = validated_data["campaña"]
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
        return super().create(validated_data)


class AnuncioSerializer(serializers.ModelSerializer):
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
        validated_data["estado"] = "pending"
        if not validated_data.get("meta_id"):
            adset = validated_data["conjunto_anuncios"]
            campana = getattr(adset, "campaña")
            creative = validated_data["creative"]
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

    class Meta:
        model = CredencialesMeta
        fields = ["id", "empresa", "bm", "pixel_id", "app_id", "token_acceso_encrypted"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        token = validated_data.pop("token_acceso_encrypted")
        validated_data["token_acceso_encrypted"] = encrypt_token(token)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        token = validated_data.get("token_acceso_encrypted")
        if token:
            validated_data["token_acceso_encrypted"] = encrypt_token(token)
        return super().update(instance, validated_data)


class FanPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FanPage
        fields = ["id", "empresa", "bm", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]


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
        fields = ["id", "empresa", "tipo", "s3_url", "meta_asset_id", "estado", "creado_en"]
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
