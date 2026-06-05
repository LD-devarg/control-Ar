import uuid
from typing import Any

from django.utils import timezone

from apps.operativo.models import Cliente, EventosMeta

from .enviador import enviar_evento_meta


WHATSAPP_FUENTE = "whatsapp"


def _request_value(request, key: str) -> Any:
    if not request:
        return None
    data = getattr(request, "data", None)
    if not data:
        return None
    try:
        return data.get(key)
    except AttributeError:
        return None


def _resolve_fuente(cliente: Cliente | None, fuente: str | None) -> str:
    cliente_origen = str(getattr(cliente, "origen", "") or "").strip()
    if cliente_origen == WHATSAPP_FUENTE:
        return WHATSAPP_FUENTE
    return str(fuente or cliente_origen or "landing").strip() or "landing"


def _resolve_senales(
    *,
    cliente: Cliente | None,
    fuente: str,
    request=None,
    data_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = data_payload or {}
    fbp = payload.get("fbp") or _request_value(request, "fbp") or getattr(cliente, "fbp", None)
    fbc = payload.get("fbc") or _request_value(request, "fbc") or getattr(cliente, "fbc", None)
    ip_address = payload.get("ip_address") or getattr(cliente, "ip_address", None)
    user_agent = payload.get("user_agent") or getattr(cliente, "user_agent", None)

    payload_extra: dict[str, Any] = {}
    ctwa_clid = payload.get("ctwa_clid") or getattr(cliente, "ctwa_clid", None)
    if fuente == WHATSAPP_FUENTE:
        payload_extra["ctwa_clid"] = ctwa_clid
        payload_extra["action_source"] = payload.get("action_source") or "business_messaging"
        payload_extra["messaging_channel"] = payload.get("messaging_channel") or "whatsapp"

    return {
        "fbp": fbp,
        "fbc": fbc,
        "ctwa_clid": ctwa_clid if fuente == WHATSAPP_FUENTE else payload.get("ctwa_clid"),
        "ip_address": ip_address,
        "user_agent": user_agent,
        "payload_extra": payload_extra,
    }


def crear_y_enviar_evento(
    *,
    cliente: Cliente,
    empresa,
    tipo: str,
    fuente: str | None = None,
    landing=None,
    operador=None,
    data_payload: dict[str, Any] | None = None,
    ocurrido_en=None,
    request=None,
    test_event_code: str | None = None,
    enviar: bool = True,
    respuesta_skip: dict[str, Any] | None = None,
) -> EventosMeta:
    payload = dict(data_payload or {})
    fuente_resuelta = _resolve_fuente(cliente, fuente)
    senales = _resolve_senales(
        cliente=cliente,
        fuente=fuente_resuelta,
        request=request,
        data_payload=payload,
    )

    evento = EventosMeta.objects.create(
        id_evento=uuid.uuid4(),
        cliente=cliente,
        empresa=empresa,
        landing=landing,
        operador=operador,
        tipo=tipo,
        fuente=fuente_resuelta,
        data={**payload, **senales["payload_extra"]},
        ocurrido_en=ocurrido_en or timezone.now(),
        fbp=senales.get("fbp"),
        fbc=senales.get("fbc"),
        ctwa_clid=senales.get("ctwa_clid"),
        ip_address=senales.get("ip_address"),
        user_agent=senales.get("user_agent"),
    )

    if enviar:
        try:
            enviar_evento_meta(evento, request=request, test_event_code=test_event_code)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])
    else:
        evento.estado_envio = "enviado"
        evento.respuesta_meta = respuesta_skip or {"skipped": True}
        evento.save(update_fields=["estado_envio", "respuesta_meta"])

    return evento
