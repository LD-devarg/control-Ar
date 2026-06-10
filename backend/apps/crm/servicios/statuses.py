from __future__ import annotations

import logging

from apps.operativo.realtime import publish_empresa_event

from ..models import Message

logger = logging.getLogger("apps.crm.statuses")


STATUS_RANK = {
    "accepted": 0,
    "sent": 1,
    "delivered": 2,
    "read": 3,
    "failed": 99,
}


def _status_rank(value: str | None) -> int:
    return STATUS_RANK.get(str(value or "").strip().lower(), -1)


def _should_update_status(current: str | None, incoming: str | None) -> bool:
    incoming_rank = _status_rank(incoming)
    if incoming_rank < 0:
        return bool(incoming)
    current_rank = _status_rank(current)
    if current_rank < 0:
        return True
    if incoming_rank == STATUS_RANK["failed"]:
        return True
    if current_rank == STATUS_RANK["failed"] and incoming_rank != STATUS_RANK["failed"]:
        return False
    return incoming_rank >= current_rank


def actualizar_estado_mensaje_whatsapp(status: dict):
    wa_message_id = status.get("wa_message_id")
    incoming_estado = status.get("estado")
    if not wa_message_id or not incoming_estado:
        return None

    message = (
        Message.objects.select_related("conversation")
        .filter(wa_message_id=wa_message_id)
        .first()
    )
    if not message:
        logger.info("WhatsApp status ignored for unknown wa_message_id=%s", wa_message_id)
        return None

    if not _should_update_status(message.estado, incoming_estado):
        logger.info(
            "WhatsApp status regression ignored for wa_message_id=%s current=%s incoming=%s",
            wa_message_id,
            message.estado,
            incoming_estado,
        )
        return message

    message.estado = incoming_estado
    message.status_timestamp = status.get("timestamp")
    message.status_raw = status.get("raw") or status
    message.save(update_fields=["estado", "status_timestamp", "status_raw"])

    try:
        publish_empresa_event(
            empresa_id=message.conversation.empresa_id,
            event_type="crm_message_status_updated",
            payload={
                "conversation_id": message.conversation_id,
                "message_id": message.id,
                "wa_message_id": message.wa_message_id,
                "estado": message.estado,
                "status_timestamp": message.status_timestamp.isoformat() if message.status_timestamp else None,
            },
        )
    except Exception:
        logger.exception(
            "No se pudo publicar crm_message_status_updated para wa_message_id=%s",
            wa_message_id,
        )

    return message
