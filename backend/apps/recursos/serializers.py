from rest_framework import serializers

from .models import TipoCambio, WhatsApp


def normalizar_numero_whatsapp(numero):
    digits = "".join(ch for ch in str(numero or "") if ch.isdigit())
    if not digits:
        raise serializers.ValidationError("El numero es obligatorio.")

    if digits.startswith("549") and len(digits) == 13:
        return digits
    if digits.startswith("54") and len(digits) == 12:
        return f"549{digits[2:]}"
    if digits.startswith("0") and len(digits) == 11:
        return f"549{digits[1:]}"
    if len(digits) == 10:
        return f"549{digits}"

    raise serializers.ValidationError(
        "Numero de WhatsApp invalido. Ingresalo como celular argentino de 10 digitos, por ejemplo 1168597657."
    )


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
    def validate_numero(self, value):
        return normalizar_numero_whatsapp(value)

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
