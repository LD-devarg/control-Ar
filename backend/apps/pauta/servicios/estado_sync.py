from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.utils import timezone

from apps.empresas.models import Empresa
from apps.pauta import models as pauta_models
from apps.pauta.models import (
    Anuncio,
    Campaña,
    ConjuntoAnuncios,
    Creative,
    CuentaPublicitaria,
    PautaAsset,
)
from apps.pauta.servicios.credenciales import tokens_para_empresa
from apps.pauta.servicios.telegram_alerts import send_status_change_alert

META_API_VERSION = "v18.0"
META_TIMEOUT_SECONDS = 15
TASK_KEY = "sync_pauta_estado_15m"
PAUTA_SYNC_START_DATE = getattr(settings, "PAUTA_SYNC_START_DATE", None)


def _credential_tokens_for_empresa(*, empresa_id: int, cuenta: CuentaPublicitaria | None = None) -> list[str]:
    return tokens_para_empresa(empresa_id=empresa_id, cuenta=cuenta)


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


def _safe_paginated_request(path: str, token: str, fields: str, params: dict | None = None) -> list[dict]:
    request_params = {"limit": 200}
    if params:
        request_params.update(params)

    payload = _safe_request(path, token, fields, request_params)
    rows: list[dict] = list(payload.get("data", []))
    next_url = payload.get("paging", {}).get("next")
    while next_url:
        response = requests.get(next_url, timeout=META_TIMEOUT_SECONDS)
        payload = response.json()
        if not response.ok:
            raise RuntimeError(str(payload))
        rows.extend(payload.get("data", []))
        next_url = payload.get("paging", {}).get("next")
    return rows


def _normalize_estado(value: str | None, fallback: str = "ACTIVE") -> str:
    result = str(value or fallback).strip().upper()
    return result or fallback


def _upsert_asset(
    *,
    empresa_id: int,
    meta_asset_id: str,
    tipo: str,
    nombre: str,
    estado: str,
) -> tuple[PautaAsset, bool]:
    defaults = {
        "tipo": tipo or "image",
        "nombre": nombre or meta_asset_id,
        "estado": estado or "uploaded",
        "s3_url": "",
    }
    asset, created = PautaAsset.objects.get_or_create(
        empresa_id=empresa_id,
        meta_asset_id=meta_asset_id,
        defaults=defaults,
    )
    if created:
        return asset, True

    changed = False
    for field, next_value in defaults.items():
        if getattr(asset, field) != next_value:
            setattr(asset, field, next_value)
            changed = True
    if changed:
        asset.save(update_fields=["tipo", "nombre", "estado", "s3_url"])
    return asset, changed


def _extract_creative_payload(data: dict) -> dict:
    story = data.get("object_story_spec") or {}
    link_data = story.get("link_data") or {}
    video_data = story.get("video_data") or {}

    page_id = str(story.get("page_id") or "").strip()
    primary_text = link_data.get("message") or video_data.get("message") or ""
    headline = link_data.get("name") or video_data.get("title") or ""
    descripcion = link_data.get("description") or ""
    url_destino = (
        link_data.get("link")
        or (video_data.get("call_to_action") or {}).get("value", {}).get("link")
        or ""
    )
    cta = (
        (link_data.get("call_to_action") or {}).get("type")
        or (video_data.get("call_to_action") or {}).get("type")
        or ""
    )

    asset_candidates: list[tuple[str, str]] = []
    image_hash = str(link_data.get("image_hash") or "").strip()
    video_id = str(video_data.get("video_id") or "").strip()
    if image_hash:
        asset_candidates.append(("image", image_hash))
    if video_id:
        asset_candidates.append(("video", video_id))

    return {
        "nombre": str(data.get("name") or data.get("id") or "").strip(),
        "estado": _normalize_estado(data.get("effective_status") or data.get("status"), "ACTIVE"),
        "page_id": page_id,
        "primary_text": str(primary_text or "").strip(),
        "headline": str(headline or "").strip(),
        "descripcion": str(descripcion or "").strip(),
        "url_destino": str(url_destino or "").strip(),
        "cta": str(cta or "").strip(),
        "asset_candidates": asset_candidates,
    }


def _sync_account_structure(cuenta: CuentaPublicitaria, token: str) -> dict[str, int]:
    account_id = str(cuenta.meta_id)
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"

    empresa_id = cuenta.empresa_id
    campana_model = getattr(pauta_models, "Campaña", Campaña)
    fanpage_model = getattr(pauta_models, "FanPage")
    adset_campaign_field_name = next(
        (
            field.name
            for field in ConjuntoAnuncios._meta.fields
            if getattr(field, "is_relation", False)
            and (
                getattr(field, "related_model", None) == campana_model
                or (
                    getattr(getattr(field, "related_model", None), "_meta", None) is not None
                    and getattr(field.related_model._meta, "db_table", "") == getattr(campana_model._meta, "db_table", "")
                )
            )
        ),
        "campana",
    )

    counters = {
        "campanias": 0,
        "adsets": 0,
        "ads": 0,
        "assets": 0,
        "creatives": 0,
        "alertas_telegram": 0,
    }

    campaign_rows = _safe_paginated_request(
        f"{account_id}/campaigns",
        token,
        "id,name,status,effective_status,objective,start_time,stop_time",
    )
    campaign_map: dict[str, Campaña] = {}
    for row in campaign_rows:
        campaign_meta_id = str(row.get("id") or "").strip()
        if not campaign_meta_id:
            continue
        campaign_start = _parse_date(row.get("start_time"))
        if PAUTA_SYNC_START_DATE and campaign_start and campaign_start < PAUTA_SYNC_START_DATE:
            continue

        defaults = {
            "nombre": str(row.get("name") or campaign_meta_id)[:120],
            "estado": _normalize_estado(row.get("effective_status") or row.get("status")),
            "objetivo": str(row.get("objective") or "")[:100],
            "fecha_inicio": campaign_start,
            "fecha_fin": _parse_date(row.get("stop_time")),
        }
        campaign, created = campana_model.objects.get_or_create(
            empresa_id=empresa_id,
            cuenta_publicitaria=cuenta,
            meta_id=campaign_meta_id,
            defaults=defaults,
        )
        previous_status = str(getattr(campaign, "estado", "") or "")
        changed = created
        if not created:
            update_fields = []
            for field, value in defaults.items():
                if getattr(campaign, field) != value:
                    setattr(campaign, field, value)
                    update_fields.append(field)
            if update_fields:
                campaign.save(update_fields=update_fields)
                changed = True
        campaign_map[campaign_meta_id] = campaign
        if changed:
            counters["campanias"] += 1
            if not created:
                counters["alertas_telegram"] += send_status_change_alert(
                    empresa_id=cuenta.empresa_id,
                    empresa_nombre=cuenta.empresa.nombre,
                    cuenta_nombre=cuenta.nombre,
                    entity_type="Campaign",
                    entity_name=campaign.nombre,
                    meta_id=campaign_meta_id,
                    previous_status=previous_status,
                    next_status=campaign.estado,
                )

    adset_rows = _safe_paginated_request(
        f"{account_id}/adsets",
        token,
        "id,name,status,effective_status,daily_budget,start_time,end_time,campaign_id,targeting",
    )
    adset_map: dict[str, ConjuntoAnuncios] = {}
    for row in adset_rows:
        adset_meta_id = str(row.get("id") or "").strip()
        campaign_meta_id = str(row.get("campaign_id") or "").strip()
        if not adset_meta_id or not campaign_meta_id:
            continue
        campaign = campaign_map.get(campaign_meta_id)
        if campaign is None:
            continue
        adset_start = _parse_date(row.get("start_time"))
        if PAUTA_SYNC_START_DATE and adset_start and adset_start < PAUTA_SYNC_START_DATE:
            continue

        defaults = {
            adset_campaign_field_name: campaign,
            "nombre": str(row.get("name") or adset_meta_id)[:120],
            "estado": _normalize_estado(row.get("effective_status") or row.get("status")),
            "presupuesto_diario": _parse_budget_minor_units(row.get("daily_budget")),
            "segmentacion": {"targeting": row.get("targeting") or {}},
            "fecha_inicio": adset_start,
            "fecha_fin": _parse_date(row.get("end_time")),
        }
        adset, created = ConjuntoAnuncios.objects.get_or_create(
            empresa_id=empresa_id,
            meta_id=adset_meta_id,
            defaults=defaults,
        )
        previous_status = str(getattr(adset, "estado", "") or "")
        changed = created
        if not created:
            update_fields = []
            for field, value in defaults.items():
                if getattr(adset, field) != value:
                    setattr(adset, field, value)
                    update_fields.append(field)
            if update_fields:
                adset.save(update_fields=update_fields)
                changed = True
        adset_map[adset_meta_id] = adset
        if changed:
            counters["adsets"] += 1
            if not created:
                counters["alertas_telegram"] += send_status_change_alert(
                    empresa_id=cuenta.empresa_id,
                    empresa_nombre=cuenta.empresa.nombre,
                    cuenta_nombre=cuenta.nombre,
                    entity_type="Adset",
                    entity_name=adset.nombre,
                    meta_id=adset_meta_id,
                    previous_status=previous_status,
                    next_status=adset.estado,
                )

    creative_cache: dict[str, Creative] = {}
    ad_rows = _safe_paginated_request(
        f"{account_id}/ads",
        token,
        "id,name,status,effective_status,adset_id,creative{id,name}",
    )
    for row in ad_rows:
        ad_meta_id = str(row.get("id") or "").strip()
        adset_meta_id = str(row.get("adset_id") or "").strip()
        if not ad_meta_id or not adset_meta_id:
            continue
        adset = adset_map.get(adset_meta_id)
        if adset is None:
            continue

        creative_data = row.get("creative") or {}
        creative_meta_id = str(creative_data.get("id") or "").strip()
        if not creative_meta_id:
            continue

        creative_obj = creative_cache.get(creative_meta_id)
        if creative_obj is None:
            creative_raw = _safe_request(
                creative_meta_id,
                token,
                "id,name,status,object_story_spec",
            )
            creative_payload = _extract_creative_payload(creative_raw)
            fanpage = None
            if creative_payload["page_id"]:
                fanpage = fanpage_model.objects.filter(
                    empresa_id=empresa_id,
                    meta_id=creative_payload["page_id"],
                ).first()

            linked_asset = None
            for asset_tipo, asset_meta_id in creative_payload["asset_candidates"]:
                asset, asset_changed = _upsert_asset(
                    empresa_id=empresa_id,
                    meta_asset_id=asset_meta_id,
                    tipo=asset_tipo,
                    nombre=asset_meta_id,
                    estado="uploaded",
                )
                if asset_changed:
                    counters["assets"] += 1
                if linked_asset is None:
                    linked_asset = asset

            creative_defaults = {
                "fanpage": fanpage,
                "instagram_account": None,
                "nombre": (creative_payload["nombre"] or creative_meta_id)[:120],
                "primary_text": creative_payload["primary_text"],
                "headline": creative_payload["headline"][:255],
                "descripcion": creative_payload["descripcion"][:255] or None,
                "url_destino": creative_payload["url_destino"],
                "cta": creative_payload["cta"][:50],
                "asset": linked_asset,
                "estado": creative_payload["estado"],
            }
            creative_obj, created = Creative.objects.get_or_create(
                empresa_id=empresa_id,
                meta_id=creative_meta_id,
                defaults=creative_defaults,
            )
            creative_changed = created
            if not created:
                update_fields = []
                for field, value in creative_defaults.items():
                    if getattr(creative_obj, field) != value:
                        setattr(creative_obj, field, value)
                        update_fields.append(field)
                if update_fields:
                    creative_obj.save(update_fields=update_fields)
                    creative_changed = True
            if creative_changed:
                counters["creatives"] += 1
            creative_cache[creative_meta_id] = creative_obj

        ad_defaults = {
            "conjunto_anuncios": adset,
            "creative": creative_obj,
            "nombre": str(row.get("name") or ad_meta_id)[:120],
            "estado": _normalize_estado(row.get("effective_status") or row.get("status")),
        }
        ad, created = Anuncio.objects.get_or_create(
            empresa_id=empresa_id,
            meta_id=ad_meta_id,
            defaults=ad_defaults,
        )
        previous_status = str(getattr(ad, "estado", "") or "")
        ad_changed = created
        if not created:
            update_fields = []
            for field, value in ad_defaults.items():
                if getattr(ad, field) != value:
                    setattr(ad, field, value)
                    update_fields.append(field)
            if update_fields:
                ad.save(update_fields=update_fields)
                ad_changed = True
        if ad_changed:
            counters["ads"] += 1
            if not created:
                counters["alertas_telegram"] += send_status_change_alert(
                    empresa_id=cuenta.empresa_id,
                    empresa_nombre=cuenta.empresa.nombre,
                    cuenta_nombre=cuenta.nombre,
                    entity_type="Ad",
                    entity_name=ad.nombre,
                    meta_id=ad_meta_id,
                    previous_status=previous_status,
                    next_status=ad.estado,
                )

    return counters


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
    data = _safe_request(account_id, token, "name,account_status,currency")

    changed = False
    next_estado = str(data.get("account_status", cuenta.estado))
    next_nombre = data.get("name") or cuenta.nombre
    next_moneda = str(data.get("currency") or cuenta.moneda).upper()
    if next_moneda not in {CuentaPublicitaria.MONEDA_USD, CuentaPublicitaria.MONEDA_ARS}:
        next_moneda = cuenta.moneda

    if next_estado != cuenta.estado:
        cuenta.estado = next_estado
        changed = True
    if next_nombre != cuenta.nombre:
        cuenta.nombre = next_nombre
        changed = True
    if next_moneda != cuenta.moneda:
        cuenta.moneda = next_moneda
        changed = True

    if changed:
        cuenta.save(update_fields=["estado", "nombre", "moneda"])
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
        "alertas_telegram_enviadas": 0,
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
        base_tokens = _credential_tokens_for_empresa(empresa_id=empresa.id)
        if not base_tokens:
            continue

        try:
            empresa_ok = False

            for cuenta in CuentaPublicitaria.objects.filter(empresa_id=empresa.id):
                tokens = _credential_tokens_for_empresa(empresa_id=empresa.id, cuenta=cuenta) or base_tokens
                last_exc: Exception | None = None
                for token in tokens:
                    try:
                        if _sync_ad_account(cuenta, token):
                            result["cuentas_actualizadas"] += 1

                        stats = _sync_account_structure(cuenta, token)
                        result["campanias_actualizadas"] += stats["campanias"]
                        result["adsets_actualizados"] += stats["adsets"]
                        result["ads_actualizados"] += stats["ads"]
                        result["assets_actualizados"] += stats["assets"]
                        result["creatives_actualizados"] += stats["creatives"]
                        result["alertas_telegram_enviadas"] += stats["alertas_telegram"]
                        empresa_ok = True
                        last_exc = None
                        break
                    except Exception as exc:
                        last_exc = exc
                        continue

                if last_exc is not None:
                    result["errores"].append(
                        {"empresa_id": empresa.id, "tipo": "cuenta_sync", "id": cuenta.id, "error": str(last_exc)}
                    )

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
