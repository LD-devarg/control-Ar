from __future__ import annotations

import requests

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
    token = _resolve_active_bot_token()
    chat_ids = _normalized_chat_ids(empresa_id)
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
