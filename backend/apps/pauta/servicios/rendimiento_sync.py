from __future__ import annotations

import datetime as dt
import json
import os
from decimal import Decimal, InvalidOperation

import requests
from django.db import transaction
from django.utils import timezone

from apps.empresas.models import Empresa
from apps.pauta.models import CredencialesMeta, CuentaPublicitaria, RendimientoPautaDiario
from apps.pauta.servicios.crypto import decrypt_token

META_API_VERSION = os.getenv("META_API_VERSION", "v18.0")
META_TIMEOUT_SECONDS = float(os.getenv("META_TIMEOUT_SECONDS", "15"))

LEAD_ACTIONS = {
    "lead",
    "onsite_conversion.lead_grouped",
    "onsite_conversion.lead",
    "offsite_conversion.fb_pixel_lead",
}
CONTACT_ACTIONS = {
    "contact",
    "onsite_conversion.contact",
    "offsite_conversion.fb_pixel_contact",
}
PURCHASE_ACTIONS = {
    "purchase",
    "onsite_conversion.purchase",
    "offsite_conversion.fb_pixel_purchase",
}
WEB_VISITOR_ACTIONS = {"landing_page_view", "page_view"}
TASK_KEY = "sync_pauta_kpi_15m"


def _to_decimal(value, default="0") -> Decimal:
    try:
        if value in (None, ""):
            return Decimal(default)
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)


def _to_int(value, default=0) -> int:
    try:
        if value in (None, ""):
            return default
        return int(float(value))
    except (ValueError, TypeError):
        return default


def _sum_actions(actions: list[dict] | None, allowed_types: set[str]) -> int:
    total = 0
    for action in actions or []:
        if action.get("action_type") in allowed_types:
            total += _to_int(action.get("value"), 0)
    return total


def _sum_action_values(action_values: list[dict] | None, allowed_types: set[str]) -> Decimal:
    total = Decimal("0")
    for action in action_values or []:
        if action.get("action_type") in allowed_types:
            total += _to_decimal(action.get("value"), "0")
    return total


def _is_task_enabled_for_empresa(empresa: Empresa, task_key: str) -> bool:
    config = empresa.beat_tasks_config or {}
    if task_key not in config:
        return True
    return bool(config.get(task_key))


def _fetch_insights_rows(ad_account_id: str, token: str, day: dt.date) -> list[dict]:
    url = f"https://graph.facebook.com/{META_API_VERSION}/{ad_account_id}/insights"
    params = {
        "fields": (
            "account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,"
            "ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpc,frequency,actions,action_values"
        ),
        "level": "ad",
        "time_range": json.dumps({"since": day.isoformat(), "until": day.isoformat()}),
        "limit": 500,
        "access_token": token,
    }

    rows: list[dict] = []
    while True:
        response = requests.get(url, params=params, timeout=META_TIMEOUT_SECONDS)
        data = response.json()
        if not response.ok:
            raise RuntimeError(f"Meta insights error: {data}")

        rows.extend(data.get("data", []))

        paging = data.get("paging", {}) or {}
        next_url = paging.get("next")
        if not next_url:
            break

        url = next_url
        params = None

    return rows


def _upsert_row(empresa: Empresa, cuenta: CuentaPublicitaria, fecha: dt.date, row: dict) -> tuple[bool, RendimientoPautaDiario]:
    ad_meta_id = str(row.get("ad_id") or "").strip()
    if not ad_meta_id:
        raise ValueError("Fila de insights sin ad_id")

    defaults = {
        "campaign_meta_id": str(row.get("campaign_id") or ""),
        "campaign_name": str(row.get("campaign_name") or ""),
        "adset_meta_id": str(row.get("adset_id") or ""),
        "adset_name": str(row.get("adset_name") or ""),
        "ad_name": str(row.get("ad_name") or ""),
        "spend_usd": _to_decimal(row.get("spend"), "0"),
        "impressions": _to_int(row.get("impressions"), 0),
        "reach": _to_int(row.get("reach"), 0),
        "clicks": _to_int(row.get("clicks"), 0),
        "ctr": _to_decimal(row.get("ctr"), "0"),
        "cpc_usd": _to_decimal(row.get("cpc"), "0"),
        "frequency": _to_decimal(row.get("frequency"), "0"),
        "web_visitors": _sum_actions(row.get("actions"), WEB_VISITOR_ACTIONS),
        "leads": _sum_actions(row.get("actions"), LEAD_ACTIONS),
        "contacts": _sum_actions(row.get("actions"), CONTACT_ACTIONS),
        "purchases": _sum_actions(row.get("actions"), PURCHASE_ACTIONS),
        "purchase_value_usd": _sum_action_values(row.get("action_values"), PURCHASE_ACTIONS),
    }

    return RendimientoPautaDiario.objects.update_or_create(
        empresa=empresa,
        cuenta_publicitaria=cuenta,
        fecha=fecha,
        ad_meta_id=ad_meta_id,
        defaults=defaults,
    )


def sync_rendimientos_meta_diarios() -> dict:
    fecha_objetivo = timezone.localdate()

    empresas = (
        Empresa.objects
        .filter(activo=True, workers_activos=True, beat_activo=True)
        .only("id", "nombre", "beat_tasks_config")
        .order_by("id")
    )

    result = {
        "fecha": fecha_objetivo.isoformat(),
        "empresas_evaluadas": empresas.count(),
        "empresas_procesadas": 0,
        "insertados": 0,
        "actualizados": 0,
        "errores": [],
    }

    for empresa in empresas:
        if not _is_task_enabled_for_empresa(empresa, TASK_KEY):
            continue
        try:
            cuenta = CuentaPublicitaria.objects.filter(empresa_id=empresa.id).order_by("id").first()
            if not cuenta:
                continue

            cred = CredencialesMeta.objects.filter(empresa_id=empresa.id).order_by("id").first()
            if not cred:
                continue

            token = decrypt_token(cred.token_acceso_encrypted)
            ad_account_id = str(cuenta.meta_id)
            if not ad_account_id.startswith("act_"):
                ad_account_id = f"act_{ad_account_id}"

            rows = _fetch_insights_rows(ad_account_id, token, fecha_objetivo)

            with transaction.atomic():
                for row in rows:
                    created, _obj = _upsert_row(empresa, cuenta, fecha_objetivo, row)
                    if created:
                        result["insertados"] += 1
                    else:
                        result["actualizados"] += 1

            empresa.kpi_sync_last_run_at = timezone.now()
            empresa.kpi_sync_last_status = "ok"
            empresa.kpi_sync_last_error = ""
            empresa.save(update_fields=["kpi_sync_last_run_at", "kpi_sync_last_status", "kpi_sync_last_error"])

            result["empresas_procesadas"] += 1
        except Exception as exc:
            empresa.kpi_sync_last_run_at = timezone.now()
            empresa.kpi_sync_last_status = "error"
            empresa.kpi_sync_last_error = str(exc)
            empresa.save(update_fields=["kpi_sync_last_run_at", "kpi_sync_last_status", "kpi_sync_last_error"])
            result["errores"].append({"empresa_id": empresa.id, "error": str(exc)})

    return result
