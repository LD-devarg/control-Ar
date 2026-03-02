from __future__ import annotations

import requests
from django.utils import timezone

from apps.empresas.models import Empresa, TelegramBot
from apps.pauta.servicios.crypto import decrypt_token

REQUEST_TIMEOUT_SECONDS = 8


def _normalized_chat_ids(empresa_id: int | None) -> list[str]:
    if not empresa_id:
        return []
    empresa = Empresa.objects.filter(id=empresa_id).only("telegram_chat_ids").first()
    if not empresa:
        return []
    raw = empresa.telegram_chat_ids or []
    if isinstance(raw, str):
        raw = [item.strip() for item in raw.split(",") if item.strip()]
    return [str(item).strip() for item in raw if str(item).strip()]


def _resolve_active_bot_token() -> str:
    bot = TelegramBot.objects.filter(tipo=TelegramBot.TIPO_BOT, activo=True).order_by("-actualizado_en", "-id").first()
    if not bot or not str(bot.token_encrypted or "").strip():
        return ""
    try:
        return decrypt_token(bot.token_encrypted)
    except Exception:
        return ""


def _resolve_telegram_target(empresa_id: int | None) -> tuple[str, list[str]]:
    token = _resolve_active_bot_token()
    chat_ids = _normalized_chat_ids(empresa_id)
    return token, chat_ids


def _build_message(
    *,
    empresa_nombre: str,
    cuenta_nombre: str,
    entity_type: str,
    entity_name: str,
    meta_id: str,
    previous_status: str,
    next_status: str,
) -> str:
    return (
        f"Alerta Pauta\n"
        f"Empresa: {empresa_nombre}\n"
        f"Cuenta: {cuenta_nombre}\n"
        f"Tipo: {entity_type}\n"
        f"Nombre: {entity_name}\n"
        f"Meta ID: {meta_id}\n"
        f"Cambio: {previous_status} -> {next_status}"
    )


def send_status_change_alert(
    *,
    empresa_id: int | None,
    empresa_nombre: str,
    cuenta_nombre: str,
    entity_type: str,
    entity_name: str,
    meta_id: str,
    previous_status: str,
    next_status: str,
) -> int:
    token, chat_ids = _resolve_telegram_target(empresa_id)
    if not token or not chat_ids:
        return 0

    if str(previous_status).upper() == "PAUSED" or str(next_status).upper() != "PAUSED":
        return 0

    text = _build_message(
        empresa_nombre=empresa_nombre,
        cuenta_nombre=cuenta_nombre,
        entity_type=entity_type,
        entity_name=entity_name,
        meta_id=meta_id,
        previous_status=previous_status,
        next_status=next_status,
    )
    url = f"https://api.telegram.org/bot{token}/sendMessage"

    sent = 0
    for chat_id in chat_ids:
        try:
            response = requests.post(
                url,
                json={"chat_id": chat_id, "text": text},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            if response.ok:
                sent += 1
        except Exception:
            continue
    return sent


def send_test_alert(*, empresa_id: int, empresa_nombre: str) -> dict:
    token, chat_ids = _resolve_telegram_target(empresa_id)
    if not token:
        return {"ok": False, "sent": 0, "error": "No hay bot activo con token configurado."}
    if not chat_ids:
        return {"ok": False, "sent": 0, "error": "La empresa no tiene chat_ids de Telegram configurados."}

    text = (
        "Test Telegram\n"
        f"Empresa: {empresa_nombre}\n"
        f"Timestamp: {timezone.now().isoformat()}"
    )
    url = f"https://api.telegram.org/bot{token}/sendMessage"

    sent = 0
    for chat_id in chat_ids:
        try:
            response = requests.post(
                url,
                json={"chat_id": chat_id, "text": text},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            if response.ok:
                sent += 1
        except Exception:
            continue

    return {"ok": sent > 0, "sent": sent, "error": None if sent > 0 else "No se pudo enviar a ningun chat_id."}


def send_lead_queue_alert(
    *,
    empresa_id: int | None,
    empresa_nombre: str,
    queue_size: int,
    oldest_pending_ms: int,
    threshold_ms: int,
    source: str = "landing_form",
) -> dict:
    token, chat_ids = _resolve_telegram_target(empresa_id)
    if not token or not chat_ids:
        return {"ok": False, "sent": 0, "error": "Telegram no configurado para la empresa."}

    oldest_minutes = round(max(oldest_pending_ms, 0) / 60000, 2)
    threshold_minutes = round(max(threshold_ms, 0) / 60000, 2)
    text = (
        "Alerta Leads\n"
        f"Empresa: {empresa_nombre}\n"
        f"Fuente: {source}\n"
        f"Leads pendientes: {max(int(queue_size or 0), 0)}\n"
        f"Antiguedad maxima: {oldest_minutes} min\n"
        f"Umbral: {threshold_minutes} min\n"
        f"Timestamp: {timezone.now().isoformat()}"
    )
    url = f"https://api.telegram.org/bot{token}/sendMessage"

    sent = 0
    for chat_id in chat_ids:
        try:
            response = requests.post(
                url,
                json={"chat_id": chat_id, "text": text},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            if response.ok:
                sent += 1
        except Exception:
            continue

    return {"ok": sent > 0, "sent": sent, "error": None if sent > 0 else "No se pudo enviar a ningun chat_id."}
