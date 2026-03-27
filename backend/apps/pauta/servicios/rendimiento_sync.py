from __future__ import annotations

import datetime as dt
import json
import os
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.empresas.models import Empresa
from apps.pauta.models import CuentaPublicitaria, RendimientoPautaDiario
from apps.pauta.servicios.credenciales import tokens_para_empresa

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
LINK_CLICK_ACTIONS = {"link_click", "inline_link_click", "outbound_click"}
TASK_KEY = "sync_pauta_kpi_15m"
PAUTA_SYNC_START_DATE = getattr(settings, "PAUTA_SYNC_START_DATE", None)


def _credential_tokens_for_empresa(*, empresa_id: int, cuenta: CuentaPublicitaria | None = None) -> list[str]:
    return tokens_para_empresa(empresa_id=empresa_id, cuenta=cuenta)


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
            "account_id,account_name,account_currency,campaign_id,campaign_name,adset_id,adset_name,"
            "ad_id,ad_name,spend,impressions,reach,clicks,actions,action_values"
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
        "link_clicks": _sum_actions(row.get("actions"), LINK_CLICK_ACTIONS),
        "web_visitors": _sum_actions(row.get("actions"), WEB_VISITOR_ACTIONS),
        "leads": _sum_actions(row.get("actions"), LEAD_ACTIONS),
        "contacts": _sum_actions(row.get("actions"), CONTACT_ACTIONS),
        "purchases": _sum_actions(row.get("actions"), PURCHASE_ACTIONS),
        "purchase_value_usd": _sum_action_values(row.get("action_values"), PURCHASE_ACTIONS),
    }
    impressions = defaults["impressions"]
    reach = defaults["reach"]
    link_clicks = defaults["link_clicks"]
    spend_usd = defaults["spend_usd"]
    defaults["ctr"] = (Decimal(link_clicks) / Decimal(impressions)) if impressions else Decimal("0")
    defaults["cpc_usd"] = (spend_usd / Decimal(link_clicks)) if link_clicks else Decimal("0")
    defaults["frequency"] = (Decimal(impressions) / Decimal(reach)) if reach else Decimal("0")

    return RendimientoPautaDiario.objects.update_or_create(
        empresa=empresa,
        cuenta_publicitaria=cuenta,
        fecha=fecha,
        ad_meta_id=ad_meta_id,
        defaults=defaults,
    )


def _resolve_sync_dates(from_date: dt.date | None, to_date: dt.date | None) -> list[dt.date]:
    today = timezone.localdate()
    start = from_date or today
    end = to_date or start
    if start > end:
        start, end = end, start
    if PAUTA_SYNC_START_DATE and end < PAUTA_SYNC_START_DATE:
        return []
    if PAUTA_SYNC_START_DATE and start < PAUTA_SYNC_START_DATE:
        start = PAUTA_SYNC_START_DATE
    total_days = (end - start).days + 1
    return [start + dt.timedelta(days=offset) for offset in range(max(0, total_days))]


def sync_rendimientos_meta_diarios(
    *,
    empresa_ids: list[int] | None = None,
    force: bool = False,
    from_date: dt.date | None = None,
    to_date: dt.date | None = None,
) -> dict:
    sync_dates = _resolve_sync_dates(from_date, to_date)
    if not sync_dates:
        return {
            "fecha": (to_date or timezone.localdate()).isoformat(),
            "empresas_evaluadas": 0,
            "empresas_procesadas": 0,
            "insertados": 0,
            "actualizados": 0,
            "errores": [],
            "skipped": f"fecha_objetivo<{PAUTA_SYNC_START_DATE.isoformat()}",
        }

    empresas_qs = Empresa.objects.filter(activo=True)
    if empresa_ids:
        empresas_qs = empresas_qs.filter(id__in=empresa_ids)
    if not force:
        empresas_qs = empresas_qs.filter(workers_activos=True, beat_activo=True)
    empresas = empresas_qs.only("id", "nombre", "beat_tasks_config").order_by("id")

    result = {
        "from": sync_dates[0].isoformat(),
        "to": sync_dates[-1].isoformat(),
        "empresas_evaluadas": empresas.count(),
        "empresas_procesadas": 0,
        "insertados": 0,
        "actualizados": 0,
        "errores": [],
    }

    for empresa in empresas:
        if not force and not _is_task_enabled_for_empresa(empresa, TASK_KEY):
            continue
        try:
            cuentas = list(CuentaPublicitaria.objects.filter(empresa_id=empresa.id).order_by("id"))
            if not cuentas:
                continue
            base_tokens = _credential_tokens_for_empresa(empresa_id=empresa.id)
            if not base_tokens:
                continue

            empresa_ok = False
            for cuenta in cuentas:
                ad_account_id = str(cuenta.meta_id)
                if not ad_account_id.startswith("act_"):
                    ad_account_id = f"act_{ad_account_id}"

                tokens = _credential_tokens_for_empresa(empresa_id=empresa.id, cuenta=cuenta) or base_tokens
                for sync_date in sync_dates:
                    rows = None
                    last_exc: Exception | None = None
                    for token in tokens:
                        try:
                            rows = _fetch_insights_rows(ad_account_id, token, sync_date)
                            last_exc = None
                            break
                        except Exception as exc:
                            last_exc = exc
                            continue

                    if rows is None:
                        if last_exc is not None:
                            result["errores"].append(
                                {
                                    "empresa_id": empresa.id,
                                    "cuenta_id": cuenta.id,
                                    "fecha": sync_date.isoformat(),
                                    "error": str(last_exc),
                                }
                            )
                        continue

                    account_currency = str((rows[0] or {}).get("account_currency") or "").upper() if rows else ""
                    if account_currency in {CuentaPublicitaria.MONEDA_USD, CuentaPublicitaria.MONEDA_ARS} and cuenta.moneda != account_currency:
                        cuenta.moneda = account_currency
                        cuenta.save(update_fields=["moneda"])

                    with transaction.atomic():
                        for row in rows:
                            created, _obj = _upsert_row(empresa, cuenta, sync_date, row)
                            if created:
                                result["insertados"] += 1
                            else:
                                result["actualizados"] += 1
                    empresa_ok = True

            empresa.kpi_sync_last_run_at = timezone.now()
            empresa.kpi_sync_last_status = "ok" if empresa_ok else "error"
            empresa.kpi_sync_last_error = "" if empresa_ok else "No se pudo sincronizar ninguna cuenta publicitaria."
            empresa.save(update_fields=["kpi_sync_last_run_at", "kpi_sync_last_status", "kpi_sync_last_error"])

            if empresa_ok:
                result["empresas_procesadas"] += 1
        except Exception as exc:
            empresa.kpi_sync_last_run_at = timezone.now()
            empresa.kpi_sync_last_status = "error"
            empresa.kpi_sync_last_error = str(exc)
            empresa.save(update_fields=["kpi_sync_last_run_at", "kpi_sync_last_status", "kpi_sync_last_error"])
            result["errores"].append({"empresa_id": empresa.id, "error": str(exc)})

    return result
