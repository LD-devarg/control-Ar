from __future__ import annotations

import os
import time
from decimal import Decimal, InvalidOperation

import requests
from django.db import transaction
from django.utils import timezone

from apps.recursos.models import TipoCambio


DOLARAPI_OFICIAL_URL = "https://dolarapi.com/v1/dolares/oficial"
DOLARAPI_BLUE_URL = "https://dolarapi.com/v1/dolares/blue"
BLUELYTICS_URL = "https://api.bluelytics.com.ar/v2/latest"

REQUEST_TIMEOUT_SECONDS = float(os.getenv("TC_REQUEST_TIMEOUT_SECONDS", "6"))
MAX_RETRIES = int(os.getenv("TC_MAX_RETRIES", "3"))
RETRY_BACKOFF_SECONDS = float(os.getenv("TC_RETRY_BACKOFF_SECONDS", "1.5"))
MIN_FETCH_INTERVAL_SECONDS = int(os.getenv("TC_FETCH_MIN_INTERVAL_SECONDS", "1800"))


class TipoCambioFetchError(Exception):
    pass


def _sleep_backoff(attempt: int) -> None:
    time.sleep(RETRY_BACKOFF_SECONDS * attempt)


def _get_json(url: str) -> dict:
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            last_exc = exc
            _sleep_backoff(attempt)
    raise TipoCambioFetchError(str(last_exc))


def _to_decimal(value) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.0001"))
    except (InvalidOperation, TypeError):
        raise TipoCambioFetchError("valor de tipo de cambio invalido")


def _extract_venta(data: dict) -> Decimal:
    if isinstance(data, list) and data:
        data = data[0]
    if not isinstance(data, dict):
        raise TipoCambioFetchError("respuesta invalida")
    if "venta" in data:
        return _to_decimal(data["venta"])
    raise TipoCambioFetchError("no se encontro campo venta")


def _extract_bluelytics_rate(section: dict) -> Decimal:
    if not isinstance(section, dict):
        raise TipoCambioFetchError("respuesta bluelytics invalida")
    for key in ("value_sell", "venta", "value_avg", "value_buy", "compra"):
        if key in section:
            return _to_decimal(section[key])
    raise TipoCambioFetchError("no se encontro rate en bluelytics")


def _fetch_dolarapi() -> tuple[Decimal, str]:
    oficial = _extract_venta(_get_json(DOLARAPI_OFICIAL_URL))
    blue = _extract_venta(_get_json(DOLARAPI_BLUE_URL))
    if blue >= oficial:
        return blue, "dolarapi:blue"
    return oficial, "dolarapi:oficial"


def _fetch_bluelytics() -> tuple[Decimal, str]:
    data = _get_json(BLUELYTICS_URL)
    oficial = _extract_bluelytics_rate(data.get("oficial"))
    blue = _extract_bluelytics_rate(data.get("blue"))
    if blue >= oficial:
        return blue, "bluelytics:blue"
    return oficial, "bluelytics:oficial"


def _should_fetch() -> bool:
    ultimo = TipoCambio.objects.order_by("-creado_en").first()
    if not ultimo:
        return True
    delta = (timezone.now() - ultimo.creado_en).total_seconds()
    return delta >= MIN_FETCH_INTERVAL_SECONDS


def actualizar_tipo_cambio() -> tuple[Decimal, str] | None:
    if not _should_fetch():
        return None

    try:
        valor, fuente = _fetch_dolarapi()
    except TipoCambioFetchError:
        valor, fuente = _fetch_bluelytics()

    ultimo = TipoCambio.objects.filter(vigente_hasta__isnull=True).order_by("-creado_en").first()
    if ultimo and ultimo.valor == valor:
        return None

    ahora = timezone.now()
    with transaction.atomic():
        if ultimo:
            TipoCambio.objects.filter(id=ultimo.id).update(vigente_hasta=ahora)
        TipoCambio.objects.create(
            moneda_origen="USD",
            moneda_destino="ARS",
            valor=valor,
            fuente=fuente,
        )

    return valor, fuente
