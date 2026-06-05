from __future__ import annotations

from django.utils import timezone

from apps.operativo.models import Cliente
from apps.operativo.realtime import publish_empresa_event
from apps.operativo.servicios.eventos import crear_y_enviar_evento

from ..models import Conversation, Message


def normalizar_wa_phone(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())[:20]


def crear_cliente_desde_whatsapp(*, empresa, msg: dict):
    wa_phone = normalizar_wa_phone(msg.get("wa_phone"))
    if not wa_phone:
        return None, None

    cliente = Cliente.objects.filter(empresa=empresa, wa_phone=wa_phone).order_by("-id").first()
    creado = False
    if not cliente:
        cliente = Cliente.objects.create(
            empresa=empresa,
            nombre=msg.get("contact_name"),
            contacto=wa_phone[:15],
            wa_phone=wa_phone,
            origen="whatsapp",
            ctwa_clid=msg.get("ctwa_clid"),
            source_ad_id=msg.get("source_ad_id"),
        )
        creado = True
    else:
        updates = []
        if msg.get("ctwa_clid") and not cliente.ctwa_clid:
            cliente.ctwa_clid = msg["ctwa_clid"]
            updates.append("ctwa_clid")
        if msg.get("source_ad_id") and not cliente.source_ad_id:
            cliente.source_ad_id = msg["source_ad_id"]
            updates.append("source_ad_id")
        if updates:
            cliente.save(update_fields=updates)

    conv, _ = Conversation.objects.get_or_create(
        empresa=empresa,
        wa_phone=wa_phone,
        defaults={
            "cliente": cliente,
            "contact_name": msg.get("contact_name"),
            "ctwa_clid": msg.get("ctwa_clid"),
            "source_ad_id": msg.get("source_ad_id"),
        },
    )
    conv_updates = ["last_inbound_at", "actualizado_en"]
    conv.last_inbound_at = timezone.now()
    if not conv.cliente_id:
        conv.cliente = cliente
        conv_updates.append("cliente")
    if msg.get("ctwa_clid") and not conv.ctwa_clid:
        conv.ctwa_clid = msg["ctwa_clid"]
        conv_updates.append("ctwa_clid")
    if msg.get("source_ad_id") and not conv.source_ad_id:
        conv.source_ad_id = msg["source_ad_id"]
        conv_updates.append("source_ad_id")
    if msg.get("contact_name") and not conv.contact_name:
        conv.contact_name = msg["contact_name"]
        conv_updates.append("contact_name")
    conv.save(update_fields=conv_updates)

    if msg.get("wa_message_id"):
        Message.objects.get_or_create(
            wa_message_id=msg["wa_message_id"],
            defaults={
                "conversation": conv,
                "direction": Message.DIRECTION_IN,
                "body": msg.get("body", ""),
                "tipo": msg.get("tipo", "text"),
                "timestamp": msg.get("timestamp") or timezone.now(),
                "raw": msg.get("raw"),
            },
        )

    if creado and msg.get("ctwa_clid"):
        evento = crear_y_enviar_evento(
            cliente=cliente,
            empresa=empresa,
            tipo="lead",
            fuente="whatsapp",
            landing=None,
            data_payload={
                "phone": wa_phone,
                "nombre": msg.get("contact_name"),
                "external_id": str(cliente.uuid),
                "ctwa_clid": msg.get("ctwa_clid"),
                "waba_id": msg.get("waba_id"),
                "action_source": "business_messaging",
                "messaging_channel": "whatsapp",
            },
        )
        try:
            publish_empresa_event(
                empresa_id=empresa.id,
                event_type="lead_created",
                payload={
                    "id": evento.id,
                    "cliente": cliente.id,
                    "cliente_codigo": cliente.codigo,
                    "cliente_nombre": cliente.nombre,
                    "cliente_contacto": cliente.contacto,
                    "creado_en": evento.creado_en.isoformat(),
                },
            )
        except Exception:
            pass

    return cliente, conv
