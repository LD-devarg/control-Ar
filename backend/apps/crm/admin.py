from django.contrib import admin

from .models import Conversation, Message, WhatsAppConfig


@admin.register(WhatsAppConfig)
class WhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = ("empresa", "phone_number_id", "waba_id", "activo", "creado_en")
    search_fields = ("empresa__nombre", "phone_number_id", "waba_id")
    list_filter = ("activo",)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("empresa", "wa_phone", "contact_name", "estado", "last_inbound_at", "actualizado_en")
    search_fields = ("wa_phone", "contact_name", "cliente__codigo", "cliente__nombre")
    list_filter = ("estado",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "direction", "tipo", "estado", "timestamp")
    search_fields = ("wa_message_id", "body", "conversation__wa_phone")
    list_filter = ("direction", "tipo", "estado")
