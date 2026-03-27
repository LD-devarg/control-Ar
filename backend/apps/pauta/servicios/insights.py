from __future__ import annotations

import json
import os
from typing import Iterable

import requests

from apps.empresas.models import Empresa
from apps.pauta.models import CuentaPublicitaria
from apps.pauta.servicios.credenciales import credencial_principal_para_empresa

META_API_VERSION = os.getenv("META_API_VERSION", "v18.0")
META_TIMEOUT_SECONDS = float(os.getenv("META_TIMEOUT_SECONDS", "10"))

DEFAULT_ACTION_TYPES = ("landing_page_view", "page_view")


def _get_ad_account_id(empresa_id: int) -> str | None:
    cuenta = CuentaPublicitaria.objects.filter(empresa_id=empresa_id).order_by("id").first()
    if not cuenta:
        return None
    meta_id = str(cuenta.meta_id)
    if meta_id.startswith("act_"):
        return meta_id
    return f"act_{meta_id}"


def _get_token(empresa_id: int) -> str | None:
    cred = credencial_principal_para_empresa(empresa_id=empresa_id)
    if not cred:
        return None
    from apps.pauta.servicios.crypto import decrypt_token
    return decrypt_token(cred.token_acceso_encrypted)


def fetch_meta_page_views(
    empresa_id: int,
    since: str,
    until: str,
    action_types: Iterable[str] | None = None,
) -> dict:
    """
    Devuelve el total de Page Views desde Ads Insights.
    Usa acciones (action_type) y suma los tipos configurados.
    """
    empresa = Empresa.objects.filter(id=empresa_id).only("workers_activos", "beat_activo").first()
    if empresa and not empresa.beat_activo:
        return {"ok": False, "error": "Beat pausado para esta empresa."}
    if empresa and not empresa.workers_activos:
        return {"ok": False, "error": "Workers de Meta pausados para esta empresa."}

    ad_account_id = _get_ad_account_id(empresa_id)
    if not ad_account_id:
        return {"ok": False, "error": "No hay cuenta publicitaria configurada."}

    token = _get_token(empresa_id)
    if not token:
        return {"ok": False, "error": "No hay credenciales Meta configuradas."}

    action_types = list(action_types or DEFAULT_ACTION_TYPES)
    url = f"https://graph.facebook.com/{META_API_VERSION}/{ad_account_id}/insights"
    params = {
        "fields": "actions",
        "level": "account",
        "action_breakdowns": "action_type",
        "time_range": json.dumps({"since": since, "until": until}),
        "access_token": token,
    }

    try:
        response = requests.get(url, params=params, timeout=META_TIMEOUT_SECONDS)
        data = response.json()
    except requests.RequestException as exc:
        return {"ok": False, "error": str(exc)}
    except ValueError:
        return {"ok": False, "error": "Respuesta invalida de Meta."}

    if not response.ok:
        return {"ok": False, "error": data}

    total = 0
    for row in data.get("data", []):
        for action in row.get("actions", []) or []:
            if action.get("action_type") in action_types:
                try:
                    total += float(action.get("value", 0))
                except (TypeError, ValueError):
                    continue

    return {
        "ok": True,
        "count": int(total),
        "action_types": action_types,
    }
