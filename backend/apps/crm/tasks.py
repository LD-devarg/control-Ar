from celery import shared_task

from .models import Message, WhatsAppConfig
from .servicios.lead import crear_cliente_desde_whatsapp
from .servicios.parser import parse_inbound, parse_statuses


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
    for msg in parse_inbound(payload or {}):
        config = _resolver_config(msg.get("phone_number_id"))
        if config:
            msg["waba_id"] = config.waba_id
            crear_cliente_desde_whatsapp(empresa=config.empresa, msg=msg)

    for status in parse_statuses(payload or {}):
        wa_message_id = status.get("wa_message_id")
        if not wa_message_id:
            continue
        Message.objects.filter(wa_message_id=wa_message_id).update(estado=status.get("estado"))
