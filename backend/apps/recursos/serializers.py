from rest_framework import serializers

from .models import TipoCambio, WhatsApp


class TipoCambioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCambio
        fields = [
            "id",
            "moneda_origen",
            "moneda_destino",
            "valor",
            "fuente",
            "vigente_desde",
            "vigente_hasta",
            "creado_en",
        ]
        read_only_fields = ["id", "vigente_desde", "creado_en"]


class WhatsAppSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsApp
        fields = [
            "id",
            "numero",
            "empresa",
            "activo",
            "ultimo_uso",
            "creado_en",
        ]
        read_only_fields = ["id", "ultimo_uso", "creado_en"]
