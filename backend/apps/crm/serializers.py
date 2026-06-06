from rest_framework import serializers

from apps.pauta.servicios.crypto import encrypt_token

from .models import Conversation, Message, WhatsAppConfig, WebPushSubscription


class WhatsAppConfigSerializer(serializers.ModelSerializer):
    access_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_access_token = serializers.SerializerMethodField(read_only=True)
    has_verify_token = serializers.SerializerMethodField(read_only=True)
    has_app_secret = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WhatsAppConfig
        fields = [
            "id",
            "empresa",
            "phone_number_id",
            "waba_id",
            "access_token",
            "has_access_token",
            "has_verify_token",
            "has_app_secret",
            "verify_token",
            "app_secret",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "has_access_token",
            "has_verify_token",
            "has_app_secret",
            "creado_en",
            "actualizado_en",
        ]
        extra_kwargs = {
            "verify_token": {"write_only": True, "required": False, "allow_blank": True},
            "app_secret": {"write_only": True, "required": False, "allow_blank": True},
        }

    def get_has_access_token(self, obj):
        return bool(str(obj.access_token_encrypted or "").strip())

    def get_has_verify_token(self, obj):
        return bool(str(obj.verify_token or "").strip())

    def get_has_app_secret(self, obj):
        return bool(str(obj.app_secret or "").strip())

    def create(self, validated_data):
        token = validated_data.pop("access_token", "")
        if token:
            validated_data["access_token_encrypted"] = encrypt_token(token)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        token = validated_data.pop("access_token", "")
        if token:
            validated_data["access_token_encrypted"] = encrypt_token(token)
        return super().update(instance, validated_data)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "direction",
            "wa_message_id",
            "body",
            "tipo",
            "estado",
            "file_url",
            "file_name",
            "file_size",
            "mime_type",
            "timestamp",
            "raw",
            "creado_en",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "direction",
            "wa_message_id",
            "body",
            "tipo",
            "estado",
            "file_url",
            "file_name",
            "file_size",
            "mime_type",
            "timestamp",
            "raw",
            "creado_en",
        ]


class ConversationSerializer(serializers.ModelSerializer):
    cliente_codigo = serializers.CharField(source="cliente.codigo", read_only=True)
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    ultimo_mensaje = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "empresa",
            "cliente",
            "cliente_codigo",
            "cliente_nombre",
            "wa_phone",
            "contact_name",
            "ctwa_clid",
            "source_ad_id",
            "estado",
            "last_inbound_at",
            "last_outbound_at",
            "ultimo_mensaje",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "empresa",
            "cliente",
            "cliente_codigo",
            "cliente_nombre",
            "wa_phone",
            "contact_name",
            "ctwa_clid",
            "source_ad_id",
            "last_inbound_at",
            "last_outbound_at",
            "ultimo_mensaje",
            "creado_en",
            "actualizado_en",
        ]

    def get_ultimo_mensaje(self, obj):
        message = getattr(obj, "_ultimo_mensaje", None)
        if not message:
            message = obj.mensajes.order_by("-timestamp", "-id").first()
        return MessageSerializer(message).data if message else None


class WebPushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebPushSubscription
        fields = ["id", "endpoint", "p256dh", "auth", "creado_en"]
        read_only_fields = ["id", "creado_en"]

