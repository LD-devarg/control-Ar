import logging
from celery import shared_task

from .models import WhatsAppConfig, WebPushSubscription
from .servicios.lead import crear_cliente_desde_whatsapp
from .servicios.parser import parse_inbound, parse_statuses
from .servicios.statuses import actualizar_estado_mensaje_whatsapp

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
        actualizar_estado_mensaje_whatsapp(status)


@shared_task
def enviar_push_notification_whatsapp_task(empresa_id, conversation_id, message_body, sender_name):
    from django.contrib.auth import get_user_model
    from apps.empresas.models import Empresa
    import json
    from pywebpush import webpush, WebPushException
    from django.conf import settings
    
    try:
        empresa = Empresa.objects.get(id=empresa_id)
    except Empresa.DoesNotExist:
        logger.warning(f"Empresa with id {empresa_id} not found when sending push notifications.")
        return
        
    User = get_user_model()
    users_direct = User.objects.filter(empresa=empresa, is_active=True)
    users_via_acceso = User.objects.filter(
        accesos_empresa__empresa=empresa,
        accesos_empresa__activo=True,
        is_active=True
    )
    
    users = (users_direct | users_via_acceso).distinct()
    subscriptions = WebPushSubscription.objects.filter(usuario__in=users)
    if not subscriptions.exists():
        logger.info(f"No web push subscriptions found for Empresa {empresa.nombre}")
        return
        
    payload = {
        "title": f"Nuevo mensaje de {sender_name}",
        "body": message_body or "[Archivo o multimedia]",
        "icon": "/controlar_fondo_blanco_sin_texto.png",
        "data": {
            "url": f"/crm?id={conversation_id}",
            "conversation_id": conversation_id
        }
    }
    payload_str = json.dumps(payload)
    
    success_count = 0
    deleted_count = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                },
                data=payload_str,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": settings.VAPID_ADMIN_EMAIL,
                }
            )
            success_count += 1
        except WebPushException as ex:
            if ex.response is not None and ex.response.status_code in (404, 410):
                sub.delete()
                deleted_count += 1
            else:
                logger.error(f"Error sending web push to endpoint {sub.endpoint}: {ex}")
                
    logger.info(f"Sent {success_count} pushes for conversation {conversation_id}, cleaned up {deleted_count} invalid subscriptions.")
