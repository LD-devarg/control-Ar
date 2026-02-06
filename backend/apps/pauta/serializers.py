from rest_framework import serializers

from .servicios.crypto import encrypt_token

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
)


class BMSerializer(serializers.ModelSerializer):
    class Meta:
        model = BM
        fields = ["id", "empresa", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]


class CuentaPublicitariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaPublicitaria
        fields = ["id", "empresa", "bm", "meta_id", "nombre", "estado", "creado_en"]
        read_only_fields = ["id", "creado_en"]


class CampañaSerializer(serializers.ModelSerializer):
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
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]


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
        read_only_fields = ["id", "creado_en"]


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
