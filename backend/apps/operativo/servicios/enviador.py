from __future__ import annotations

import os
from typing import Any

import requests
from django.db import transaction
from django.utils import timezone

from apps.pauta.models import CredencialesMeta
from apps.pauta.servicios.crypto import decrypt_token
from apps.empresas.models import Empresa

from .constructor import MetaEventBuilder


META_API_VERSION = os.getenv("META_API_VERSION", "v18.0")
META_TIMEOUT_SECONDS = float(os.getenv("META_TIMEOUT_SECONDS", "10"))


def _get_test_event_code() -> str | None:
    return os.getenv("META_TEST_EVENT_CODE")


def _empresa_test_mode_enabled(empresa_id: int) -> bool:
    return bool(
        Empresa.objects.filter(id=empresa_id, meta_test_mode=True).values_list("id", flat=True).first()
    )


def _resolve_test_event_code(evento, request=None, explicit_code: str | None = None) -> str | None:
    if explicit_code:
        return explicit_code

    env_code = _get_test_event_code()
    if not env_code:
        return None

    return env_code if _empresa_test_mode_enabled(evento.empresa_id) else None


def _build_capi_url(pixel_id: str, access_token: str, test_event_code: str | None = None) -> str:
    base = f"https://graph.facebook.com/{META_API_VERSION}/{pixel_id}/events?access_token={access_token}"
    if test_event_code:
        return f"{base}&test_event_code={test_event_code}"
    return base


def obtener_credenciales_meta(empresa_id: int, landing=None) -> CredencialesMeta | None:
    landing_cred_id = getattr(landing, "credencial_meta_id", None)
    if landing_cred_id:
        cred = CredencialesMeta.objects.filter(id=landing_cred_id).first()
        if cred:
            return cred
    return CredencialesMeta.objects.filter(empresa_id=empresa_id).order_by("id").first()


def _resolve_target_credentials(evento, credenciales: CredencialesMeta | None = None) -> tuple[CredencialesMeta, list[CredencialesMeta]]:
    primary = credenciales or obtener_credenciales_meta(
        evento.empresa_id,
        landing=getattr(evento, "landing", None),
    )
    if not primary:
        raise ValueError("No hay credenciales Meta configuradas para la empresa.")

    targets = [primary]
    landing = getattr(evento, "landing", None)
    if (
        landing
        and getattr(landing, "enviar_capi_pixel_extra", False)
        and getattr(landing, "credencial_meta_extra_id", None)
    ):
        extra = getattr(landing, "credencial_meta_extra", None)
        if extra and extra.id != primary.id:
            targets.append(extra)
    return primary, targets


def _merge_payload(evento) -> dict[str, Any]:
    payload = dict(evento.data or {})
    if evento.fbp:
        payload["fbp"] = evento.fbp
    if evento.fbc:
        payload["fbc"] = evento.fbc
    if getattr(evento, "ip_address", None):
        payload["ip_address"] = evento.ip_address
    elif getattr(evento, "cliente", None) and getattr(evento.cliente, "ip_address", None):
        payload["ip_address"] = evento.cliente.ip_address
    if getattr(evento, "user_agent", None):
        payload["user_agent"] = evento.user_agent
    elif getattr(evento, "cliente", None) and getattr(evento.cliente, "user_agent", None):
        payload["user_agent"] = evento.cliente.user_agent
    return payload


def enviar_evento_meta(evento, request=None, credenciales: CredencialesMeta | None = None, test_event_code: str | None = None) -> dict[str, Any]:
    """
    Envia un evento CAPI a Meta usando las CredencialesMeta de la empresa.
    Actualiza el estado del evento en la base de datos.
    """
    primary_credencial, target_credentials = _resolve_target_credentials(evento, credenciales=credenciales)

    payload = _merge_payload(evento)
    data, _ = MetaEventBuilder.build(tipo=evento.tipo, payload=payload, request=request)
    data["event_id"] = str(evento.id_evento)

    resolved_test_code = _resolve_test_event_code(evento, request=request, explicit_code=test_event_code)
    target_results: list[dict[str, Any]] = []
    primary_ok = False
    extra_failures = 0

    for current_credencial in target_credentials:
        token_acceso = decrypt_token(current_credencial.token_acceso_encrypted)
        url = _build_capi_url(current_credencial.pixel_id, token_acceso, resolved_test_code)

        response = None
        target_response: dict[str, Any]
        try:
            response = requests.post(url, json={"data": [data]}, timeout=META_TIMEOUT_SECONDS)
            target_response = response.json()
        except requests.RequestException as exc:
            target_response = {"error": str(exc)}
        except ValueError:
            target_response = (
                {"status_code": response.status_code, "text": response.text}
                if response else {"error": "invalid_json"}
            )

        ok = bool(response and response.ok)
        target_results.append(
            {
                "credencial_id": current_credencial.id,
                "nombre": current_credencial.nombre,
                "pixel_id": current_credencial.pixel_id,
                "is_primary": current_credencial.id == primary_credencial.id,
                "ok": ok,
                "response": target_response,
            }
        )
        if current_credencial.id == primary_credencial.id:
            primary_ok = ok
        elif not ok:
            extra_failures += 1

    response_data = {
        "targets": target_results,
        "primary_ok": primary_ok,
        "extra_failures": extra_failures,
    }

    update_fields = ["respuesta_meta"]
    with transaction.atomic():
        evento.respuesta_meta = response_data
        if primary_ok:
            evento.estado_envio = "enviado"
            evento.enviado_en = timezone.now()
            update_fields += ["estado_envio", "enviado_en"]
        else:
            evento.estado_envio = "fallido"
            evento.reintentos = (evento.reintentos or 0) + 1
            update_fields += ["estado_envio", "reintentos"]
        evento.save(update_fields=update_fields)

    return response_data
