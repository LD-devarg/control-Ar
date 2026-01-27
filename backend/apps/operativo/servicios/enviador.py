from __future__ import annotations

import os
from typing import Any

import requests
from django.db import transaction
from django.utils import timezone

from apps.pauta.models import CredencialesMeta
from apps.pauta.servicios.crypto import decrypt_token

from .constructor import MetaEventBuilder


META_API_VERSION = os.getenv("META_API_VERSION", "v18.0")
META_TIMEOUT_SECONDS = float(os.getenv("META_TIMEOUT_SECONDS", "10"))
META_TEST_EVENT_CODE = os.getenv("META_TEST_EVENT_CODE")


def _build_capi_url(pixel_id: str, access_token: str, test_event_code: str | None = None) -> str:
    base = f"https://graph.facebook.com/{META_API_VERSION}/{pixel_id}/events?access_token={access_token}"
    if test_event_code:
        return f"{base}&test_event_code={test_event_code}"
    return base


def obtener_credenciales_meta(empresa_id: int) -> CredencialesMeta | None:
    return CredencialesMeta.objects.filter(empresa_id=empresa_id).order_by("id").first()


def _merge_payload(evento) -> dict[str, Any]:
    payload = dict(evento.data or {})
    if evento.fbp:
        payload["fbp"] = evento.fbp
    if evento.fbc:
        payload["fbc"] = evento.fbc
    return payload


def enviar_evento_meta(evento, request=None, credenciales: CredencialesMeta | None = None, test_event_code: str | None = None) -> dict[str, Any]:
    """
    Envia un evento CAPI a Meta usando las CredencialesMeta de la empresa.
    Actualiza el estado del evento en la base de datos.
    """
    credenciales = credenciales or obtener_credenciales_meta(evento.empresa_id)
    if not credenciales:
        raise ValueError("No hay credenciales Meta configuradas para la empresa.")

    payload = _merge_payload(evento)
    data, _ = MetaEventBuilder.build(tipo=evento.tipo, payload=payload, request=request)
    data["event_id"] = str(evento.id_evento)

    token_acceso = decrypt_token(credenciales.token_acceso_encrypted)
    url = _build_capi_url(credenciales.pixel_id, token_acceso, test_event_code or META_TEST_EVENT_CODE)

    response = None
    response_data: dict[str, Any]
    try:
        response = requests.post(url, json={"data": [data]}, timeout=META_TIMEOUT_SECONDS)
        response_data = response.json()
    except requests.RequestException as exc:
        response_data = {"error": str(exc)}
    except ValueError:
        response_data = {"status_code": response.status_code, "text": response.text} if response else {"error": "invalid_json"}

    update_fields = ["respuesta_meta"]
    with transaction.atomic():
        evento.respuesta_meta = response_data
        if response and response.ok:
            evento.estado_envio = "enviado"
            evento.enviado_en = timezone.now()
            update_fields += ["estado_envio", "enviado_en"]
        else:
            evento.estado_envio = "fallido"
            evento.reintentos = (evento.reintentos or 0) + 1
            update_fields += ["estado_envio", "reintentos"]
        evento.save(update_fields=update_fields)

    return response_data
