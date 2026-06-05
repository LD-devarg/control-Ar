import logging
from celery import shared_task

from .models import Message, WhatsAppConfig
from .servicios.lead import crear_cliente_desde_whatsapp
from .servicios.parser import parse_inbound, parse_statuses

logger = logging.getLogger("apps.crm.tasks")


def _resolver_config(phone_number_id):
    if not phone_number_id:
        return None
    return (
        WhatsAppConfig.objects.select_related("empresa")
        .filter(phone_number_id=str(phone_number_id), activo=True, empresa__activo=True)
        .first()
    )


@shared_task(bind=True)
def procesar_evento_whatsapp(self, payload: dict):
    logger.info("Processing WhatsApp payload: %s", payload)
    messages = parse_inbound(payload or {})
    logger.info("Parsed inbound messages: %s", messages)
    for msg in messages:
        phone_id = msg.get("phone_number_id")
        config = _resolver_config(phone_id)
        logger.info("Resolved WhatsAppConfig for phone_number_id %s: %s", phone_id, config)
        if config:
            msg["waba_id"] = config.waba_id
            crear_cliente_desde_whatsapp(empresa=config.empresa, msg=msg)
        else:
            logger.warning("No WhatsAppConfig found or active for phone_number_id %s", phone_id)

    statuses = parse_statuses(payload or {})
    logger.info("Parsed statuses: %s", statuses)
    for status in statuses:
        wa_message_id = status.get("wa_message_id")
        if not wa_message_id:
            continue
        Message.objects.filter(wa_message_id=wa_message_id).update(estado=status.get("estado"))

