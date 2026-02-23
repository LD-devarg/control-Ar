from __future__ import annotations

import json
import os
from decimal import Decimal, InvalidOperation

import requests

from apps.pauta.models import Creative, CredencialesMeta, CuentaPublicitaria
from apps.pauta.servicios.crypto import decrypt_token

META_API_VERSION = os.getenv("META_API_VERSION", "v18.0")
META_TIMEOUT_SECONDS = float(os.getenv("META_TIMEOUT_SECONDS", "15"))


class MetaProvisioningError(Exception):
    pass


def _clean_account_id(raw: str) -> str:
    account_id = str(raw or "").strip()
    if not account_id:
        raise MetaProvisioningError("Cuenta publicitaria invalida.")
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    return account_id


def _post(path: str, token: str, payload: dict) -> dict:
    url = f"https://graph.facebook.com/{META_API_VERSION}/{path}"
    serialized_payload = {}
    for key, value in payload.items():
        if isinstance(value, (dict, list)):
            serialized_payload[key] = json.dumps(value)
        else:
            serialized_payload[key] = value
    response = requests.post(
        url,
        data={**serialized_payload, "access_token": token},
        timeout=META_TIMEOUT_SECONDS,
    )
    data = response.json()
    if not response.ok:
        raise MetaProvisioningError(str(data))
    return data


def get_meta_token_for_empresa(empresa_id: int) -> str:
    cred = CredencialesMeta.objects.filter(empresa_id=empresa_id).order_by("id").first()
    if not cred:
        raise MetaProvisioningError("No hay credenciales Meta configuradas para esta empresa.")
    try:
        return decrypt_token(cred.token_acceso_encrypted)
    except Exception as exc:
        raise MetaProvisioningError(f"No se pudo desencriptar token Meta: {exc}") from exc


def _to_minor_units(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return int((amount * Decimal("100")).quantize(Decimal("1")))


def create_campaign_in_meta(
    *,
    cuenta_publicitaria: CuentaPublicitaria,
    token: str,
    nombre: str,
    objetivo: str,
    tipo_compra: str | None = None,
    estrategia_presupuesto: str | None = None,
    objetivo_roas=None,
    fecha_inicio=None,
    fecha_fin=None,
) -> str:
    payload = {
        "name": nombre,
        "objective": objetivo,
        "status": "PAUSED",
        "special_ad_categories": "[]",
    }
    if fecha_inicio:
        payload["start_time"] = str(fecha_inicio)
    if fecha_fin:
        payload["stop_time"] = str(fecha_fin)
    if tipo_compra:
        payload["buying_type"] = str(tipo_compra)
    if estrategia_presupuesto:
        payload["bid_strategy"] = str(estrategia_presupuesto)
    if objetivo_roas not in (None, ""):
        try:
            payload["bid_constraints"] = {
                "roas_average_floor": float(Decimal(str(objetivo_roas)))
            }
        except (InvalidOperation, ValueError, TypeError):
            pass

    account_id = _clean_account_id(cuenta_publicitaria.meta_id)
    data = _post(f"{account_id}/campaigns", token, payload)
    meta_id = str(data.get("id") or "").strip()
    if not meta_id:
        raise MetaProvisioningError("Meta no devolvio id de campaña.")
    return meta_id


def create_adset_in_meta(
    *,
    cuenta_publicitaria: CuentaPublicitaria,
    token: str,
    campaign_meta_id: str,
    nombre: str,
    presupuesto_diario=None,
    segmentacion: dict | None = None,
    fecha_inicio=None,
    fecha_fin=None,
) -> str:
    segmentacion = segmentacion or {}
    payload = {
        "name": nombre,
        "campaign_id": str(campaign_meta_id),
        "status": "PAUSED",
    }

    daily_budget_minor = _to_minor_units(presupuesto_diario)
    if daily_budget_minor is not None:
        payload["daily_budget"] = str(daily_budget_minor)

    if fecha_inicio:
        payload["start_time"] = str(fecha_inicio)
    if fecha_fin:
        payload["end_time"] = str(fecha_fin)

    passthrough_keys = {
        "billing_event",
        "optimization_goal",
        "bid_strategy",
        "bid_amount",
        "destination_type",
        "attribution_spec",
        "promoted_object",
    }
    for key in passthrough_keys:
        value = segmentacion.get(key)
        if value not in (None, ""):
            payload[key] = value

    targeting = segmentacion.get("targeting", segmentacion.get("segmentacion"))
    if targeting:
        payload["targeting"] = targeting

    account_id = _clean_account_id(cuenta_publicitaria.meta_id)
    data = _post(f"{account_id}/adsets", token, payload)
    meta_id = str(data.get("id") or "").strip()
    if not meta_id:
        raise MetaProvisioningError("Meta no devolvio id de adset.")
    return meta_id


def create_creative_in_meta(
    *,
    cuenta_publicitaria: CuentaPublicitaria,
    token: str,
    creative: Creative,
) -> str:
    if creative.meta_id:
        return str(creative.meta_id)

    cta = str(creative.cta or "LEARN_MORE").upper().replace(" ", "_")
    object_story_spec = {
        "page_id": str(creative.fanpage.meta_id),
        "link_data": {
            "message": creative.primary_text,
            "link": creative.url_destino,
            "name": creative.headline,
            "description": creative.descripcion or "",
            "call_to_action": {
                "type": cta,
                "value": {"link": creative.url_destino},
            },
            "image_url": creative.asset.s3_url,
        },
    }
    if creative.instagram_account_id and creative.instagram_account and creative.instagram_account.meta_id:
        object_story_spec["instagram_actor_id"] = str(creative.instagram_account.meta_id)

    payload = {
        "name": creative.nombre,
        "object_story_spec": object_story_spec,
    }
    account_id = _clean_account_id(cuenta_publicitaria.meta_id)
    data = _post(f"{account_id}/adcreatives", token, payload)
    meta_id = str(data.get("id") or "").strip()
    if not meta_id:
        raise MetaProvisioningError("Meta no devolvio id de creative.")

    creative.meta_id = meta_id
    creative.save(update_fields=["meta_id"])
    return meta_id


def create_ad_in_meta(
    *,
    cuenta_publicitaria: CuentaPublicitaria,
    token: str,
    adset_meta_id: str,
    creative_meta_id: str,
    nombre: str,
) -> str:
    payload = {
        "name": nombre,
        "adset_id": str(adset_meta_id),
        "creative": {"creative_id": str(creative_meta_id)},
        "status": "PAUSED",
    }
    account_id = _clean_account_id(cuenta_publicitaria.meta_id)
    data = _post(f"{account_id}/ads", token, payload)
    meta_id = str(data.get("id") or "").strip()
    if not meta_id:
        raise MetaProvisioningError("Meta no devolvio id de anuncio.")
    return meta_id
