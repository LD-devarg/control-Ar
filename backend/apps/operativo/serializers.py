from rest_framework import serializers

from .models import Cliente, EventosMeta, Compra, Landing


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
    landing_token = serializers.UUIDField()
    nombre = serializers.CharField(max_length=100)
    contacto = serializers.CharField(max_length=15)
    username = serializers.CharField(max_length=50)

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
        validated_data["username"] = self._unique_username(validated_data["username"])
        return Cliente.objects.create(empresa=landing.empresa, **validated_data)


class LandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Landing
        fields = [
            "id",
            "empresa",
            "nombre",
            "token",
            "url",
            "bono",
            "activo",
            "creado_en",
        ]
        read_only_fields = ["id", "empresa", "token", "creado_en"]


class EventosMetaReadSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    cliente_username = serializers.CharField(source="cliente.username", read_only=True)
    contactado = serializers.BooleanField(read_only=True)

    class Meta:
        model = EventosMeta
        fields = [
            "id",
            "id_evento",
            "cliente",
            "cliente_nombre",
            "cliente_username",
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
    landing_token = serializers.UUIDField()

    tipo = serializers.ChoiceField(choices=EventosMeta._meta.get_field("tipo").choices)

    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    currency = serializers.CharField(max_length=3, required=False)

    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False)

    fbp = serializers.CharField(required=False)
    fbc = serializers.CharField(required=False)

    def validate(self, data):
        try:
            landing = Landing.objects.get(token=data["landing_token"], activo=True)
        except Landing.DoesNotExist:
            raise serializers.ValidationError("Landing invalida o inactiva.")
        if not Cliente.objects.filter(id=data["cliente_id"], empresa=landing.empresa).exists():
            raise serializers.ValidationError("El cliente no pertenece a la empresa.")
        if data["tipo"] == "purchase":
            if "value" not in data or "currency" not in data:
                raise serializers.ValidationError("El evento purchase requiere value y currency")
        data["landing"] = landing
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
            "tipo_cambio",
            "creado_en",
        ]
        read_only_fields = ["id", "empresa", "tc", "monto_usd", "creado_en"]
