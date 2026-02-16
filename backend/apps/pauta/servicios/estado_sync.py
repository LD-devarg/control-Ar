from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation

import requests
from django.utils import timezone

from apps.empresas.models import Empresa
from apps.pauta.models import (
    Anuncio,
    Campaña,
    ConjuntoAnuncios,
    CredencialesMeta,
    Creative,
    CuentaPublicitaria,
    PautaAsset,
)
from apps.pauta.servicios.crypto import decrypt_token

META_API_VERSION = "v18.0"
META_TIMEOUT_SECONDS = 15
TASK_KEY = "sync_pauta_estado_15m"


def _safe_request(path: str, token: str, fields: str, params: dict | None = None) -> dict:
    query = {"access_token": token, "fields": fields}
    if params:
        query.update(params)
    url = f"https://graph.facebook.com/{META_API_VERSION}/{path}"
    response = requests.get(url, params=query, timeout=META_TIMEOUT_SECONDS)
    payload = response.json()
    if not response.ok:
        raise RuntimeError(str(payload))
    return payload


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except Exception:
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except Exception:
            return None


def _parse_budget_minor_units(value: str | int | float | Decimal | None):
    if value in (None, ""):
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return (amount / Decimal("100")).quantize(Decimal("0.01"))


def _is_task_enabled_for_empresa(empresa: Empresa, task_key: str) -> bool:
    config = empresa.beat_tasks_config or {}
    if task_key not in config:
        return True
    return bool(config.get(task_key))


def _sync_ad_account(cuenta: CuentaPublicitaria, token: str) -> bool:
    account_id = str(cuenta.meta_id)
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    data = _safe_request(account_id, token, "name,account_status")

    changed = False
    next_estado = str(data.get("account_status", cuenta.estado))
    next_nombre = data.get("name") or cuenta.nombre

    if next_estado != cuenta.estado:
        cuenta.estado = next_estado
        changed = True
    if next_nombre != cuenta.nombre:
        cuenta.nombre = next_nombre
        changed = True

    if changed:
        cuenta.save(update_fields=["estado", "nombre"])
    return changed


def _sync_campaign(campania: Campaña, token: str) -> bool:
    data = _safe_request(str(campania.meta_id), token, "name,status,effective_status,objective,start_time,stop_time")

    changed = False
    next_estado = str(data.get("effective_status") or data.get("status") or campania.estado)
    next_nombre = data.get("name") or campania.nombre
    next_objetivo = data.get("objective") or campania.objetivo
    next_inicio = _parse_date(data.get("start_time"))
    next_fin = _parse_date(data.get("stop_time"))

    update_fields = []
    if next_estado != campania.estado:
        campania.estado = next_estado
        update_fields.append("estado")
        changed = True
    if next_nombre != campania.nombre:
        campania.nombre = next_nombre
        update_fields.append("nombre")
        changed = True
    if next_objetivo != campania.objetivo:
        campania.objetivo = next_objetivo
        update_fields.append("objetivo")
        changed = True
    if next_inicio != campania.fecha_inicio:
        campania.fecha_inicio = next_inicio
        update_fields.append("fecha_inicio")
        changed = True
    if next_fin != campania.fecha_fin:
        campania.fecha_fin = next_fin
        update_fields.append("fecha_fin")
        changed = True

    if update_fields:
        campania.save(update_fields=update_fields)
    return changed


def _sync_adset(adset: ConjuntoAnuncios, token: str) -> bool:
    data = _safe_request(str(adset.meta_id), token, "name,status,effective_status,daily_budget,start_time,end_time")

    changed = False
    next_estado = str(data.get("effective_status") or data.get("status") or adset.estado)
    next_nombre = data.get("name") or adset.nombre
    next_inicio = _parse_date(data.get("start_time"))
    next_fin = _parse_date(data.get("end_time"))
    next_presupuesto = _parse_budget_minor_units(data.get("daily_budget"))

    update_fields = []
    if next_estado != adset.estado:
        adset.estado = next_estado
        update_fields.append("estado")
        changed = True
    if next_nombre != adset.nombre:
        adset.nombre = next_nombre
        update_fields.append("nombre")
        changed = True
    if next_inicio != adset.fecha_inicio:
        adset.fecha_inicio = next_inicio
        update_fields.append("fecha_inicio")
        changed = True
    if next_fin != adset.fecha_fin:
        adset.fecha_fin = next_fin
        update_fields.append("fecha_fin")
        changed = True
    if next_presupuesto is not None and next_presupuesto != adset.presupuesto_diario:
        adset.presupuesto_diario = next_presupuesto
        update_fields.append("presupuesto_diario")
        changed = True

    if update_fields:
        adset.save(update_fields=update_fields)
    return changed


def _sync_ad(ad: Anuncio, token: str) -> bool:
    if not ad.meta_id:
        return False
    data = _safe_request(str(ad.meta_id), token, "name,status,effective_status")

    changed = False
    next_estado = str(data.get("effective_status") or data.get("status") or ad.estado)
    next_nombre = data.get("name") or ad.nombre

    update_fields = []
    if next_estado != ad.estado:
        ad.estado = next_estado
        update_fields.append("estado")
        changed = True
    if next_nombre != ad.nombre:
        ad.nombre = next_nombre
        update_fields.append("nombre")
        changed = True

    if update_fields:
        ad.save(update_fields=update_fields)
    return changed


def _sync_asset(asset: PautaAsset, token: str) -> bool:
    if not asset.meta_asset_id:
        return False
    _safe_request(str(asset.meta_asset_id), token, "id")
    if asset.estado != "uploaded":
        asset.estado = "uploaded"
        asset.save(update_fields=["estado"])
        return True
    return False


def _sync_creative(creative: Creative, token: str) -> bool:
    if not creative.meta_id:
        return False
    data = _safe_request(str(creative.meta_id), token, "name")
    next_nombre = data.get("name") or creative.nombre
    if next_nombre != creative.nombre:
        creative.nombre = next_nombre
        creative.save(update_fields=["nombre"])
        return True
    return False


def sync_pauta_estado_15m(*, empresa_ids: list[int] | None = None, force: bool = False) -> dict:
    result = {
        "run_at": timezone.now().isoformat(),
        "empresas_evaluadas": 0,
        "empresas_procesadas": 0,
        "cuentas_actualizadas": 0,
        "campanias_actualizadas": 0,
        "adsets_actualizados": 0,
        "ads_actualizados": 0,
        "assets_actualizados": 0,
        "creatives_actualizados": 0,
        "errores": [],
    }

    empresas_qs = Empresa.objects.filter(activo=True)
    if empresa_ids:
        empresas_qs = empresas_qs.filter(id__in=empresa_ids)
    if not force:
        empresas_qs = empresas_qs.filter(workers_activos=True, beat_activo=True)
    empresas = empresas_qs.order_by("id")
    result["empresas_evaluadas"] = empresas.count()

    for empresa in empresas:
        if not force and not _is_task_enabled_for_empresa(empresa, TASK_KEY):
            continue
        cred = CredencialesMeta.objects.filter(empresa_id=empresa.id).order_by("id").first()
        if not cred:
            continue

        try:
            token = decrypt_token(cred.token_acceso_encrypted)
            empresa_ok = False

            for cuenta in CuentaPublicitaria.objects.filter(empresa_id=empresa.id):
                try:
                    if _sync_ad_account(cuenta, token):
                        result["cuentas_actualizadas"] += 1
                    empresa_ok = True
                except Exception as exc:
                    result["errores"].append({"empresa_id": empresa.id, "tipo": "cuenta", "id": cuenta.id, "error": str(exc)})

            for campania in Campaña.objects.filter(empresa_id=empresa.id):
                try:
                    if _sync_campaign(campania, token):
                        result["campanias_actualizadas"] += 1
                    empresa_ok = True
                except Exception as exc:
                    result["errores"].append({"empresa_id": empresa.id, "tipo": "campania", "id": campania.id, "error": str(exc)})

            for adset in ConjuntoAnuncios.objects.filter(empresa_id=empresa.id):
                try:
                    if _sync_adset(adset, token):
                        result["adsets_actualizados"] += 1
                    empresa_ok = True
                except Exception as exc:
                    result["errores"].append({"empresa_id": empresa.id, "tipo": "adset", "id": adset.id, "error": str(exc)})

            for ad in Anuncio.objects.filter(empresa_id=empresa.id):
                try:
                    if _sync_ad(ad, token):
                        result["ads_actualizados"] += 1
                    empresa_ok = True
                except Exception as exc:
                    result["errores"].append({"empresa_id": empresa.id, "tipo": "ad", "id": ad.id, "error": str(exc)})

            for asset in PautaAsset.objects.filter(empresa_id=empresa.id):
                try:
                    if _sync_asset(asset, token):
                        result["assets_actualizados"] += 1
                    empresa_ok = True
                except Exception as exc:
                    result["errores"].append({"empresa_id": empresa.id, "tipo": "asset", "id": asset.id, "error": str(exc)})

            for creative in Creative.objects.filter(empresa_id=empresa.id):
                try:
                    if _sync_creative(creative, token):
                        result["creatives_actualizados"] += 1
                    empresa_ok = True
                except Exception as exc:
                    result["errores"].append({"empresa_id": empresa.id, "tipo": "creative", "id": creative.id, "error": str(exc)})

            if empresa_ok:
                result["empresas_procesadas"] += 1
            empresa.estado_sync_last_run_at = timezone.now()
            empresa.estado_sync_last_status = "ok"
            empresa.estado_sync_last_error = ""
            empresa.save(update_fields=["estado_sync_last_run_at", "estado_sync_last_status", "estado_sync_last_error"])
        except Exception as exc:
            empresa.estado_sync_last_run_at = timezone.now()
            empresa.estado_sync_last_status = "error"
            empresa.estado_sync_last_error = str(exc)
            empresa.save(update_fields=["estado_sync_last_run_at", "estado_sync_last_status", "estado_sync_last_error"])
            result["errores"].append({"empresa_id": empresa.id, "tipo": "empresa", "error": str(exc)})

    return result
