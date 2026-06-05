from __future__ import annotations

from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.pauta.servicios.crypto import decrypt_token


WHATSAPP_24H_WINDOW = timedelta(hours=24)


def conversacion_en_ventana_24h(conversation, now=None) -> bool:
    if not conversation.last_inbound_at:
        return False
    now = now or timezone.now()
    return conversation.last_inbound_at >= now - WHATSAPP_24H_WINDOW


def build_text_message_request(*, config, to_phone: str, body: str) -> tuple[str, dict, dict]:
    api_version = (getattr(settings, "WHATSAPP", {}) or {}).get("API_VERSION") or "v21.0"
    url = f"https://graph.facebook.com/{api_version}/{config.phone_number_id}/messages"
    token = decrypt_token(config.access_token_encrypted)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": body},
    }
    return url, headers, data


def enviar_mensaje_texto(*, config, to_phone: str, body: str) -> dict:
    body = str(body or "").strip()
    if not body:
        raise ValidationError({"body": "El mensaje no puede estar vacio."})
    if not config or not config.access_token_encrypted:
        raise ValidationError("No hay configuracion WhatsApp activa para esta empresa.")

    url, headers, data = build_text_message_request(config=config, to_phone=to_phone, body=body)
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        payload = response.json()
    except requests.RequestException as exc:
        raise ValidationError(f"No se pudo enviar mensaje WhatsApp: {exc}") from exc
    except ValueError as exc:
        raise ValidationError("WhatsApp respondio con JSON invalido.") from exc

    if response.status_code >= 400:
        raise ValidationError({"whatsapp": payload})
    return payload


def extract_outbound_message_id(response_payload: dict) -> str | None:
    messages = response_payload.get("messages") if isinstance(response_payload, dict) else None
    if not isinstance(messages, list) or not messages:
        return None
    return messages[0].get("id")
