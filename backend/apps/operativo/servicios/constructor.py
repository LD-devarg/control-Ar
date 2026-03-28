import uuid
import time
import hashlib
import re
import ipaddress
from django.utils import timezone


EVENT_NAME_MAP = {
    "lead": "Lead",
    "contact": "Contact",
    "purchase": "Purchase",
}


def _sha256(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D+", "", value)
    return digits or None


def _normalize_name_token(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    normalized = re.sub(r"[^a-zA-ZÀ-ÿ\s]", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized or None


def _split_name(nombre: str | None) -> tuple[str | None, str | None]:
    normalized = _normalize_name_token(nombre)
    if not normalized:
        return None, None
    parts = [part for part in normalized.split(" ") if part]
    if not parts:
        return None, None
    first_name = parts[0]
    last_name = parts[-1] if len(parts) > 1 else None
    return first_name, last_name


def _clean_dict(data: dict) -> dict:
    """
    Elimina claves con valores None.
    Meta rechaza payloads con campos null.
    """
    return {k: v for k, v in data.items() if v is not None}


def _normalize_ip(value: str | None) -> str | None:
    if not value:
        return None
    candidate = str(value).split(",")[0].strip()
    if not candidate:
        return None
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def _extract_request_ip(request) -> str | None:
    if not request:
        return None
    return (
        _normalize_ip(request.META.get("HTTP_X_FORWARDED_FOR"))
        or _normalize_ip(request.META.get("HTTP_X_REAL_IP"))
        or _normalize_ip(request.META.get("HTTP_CF_CONNECTING_IP"))
        or _normalize_ip(request.META.get("REMOTE_ADDR"))
    )


class MetaEventBuilder:
    @staticmethod
    def build(*, tipo: str, payload: dict, request=None, event_time=None) -> tuple[dict, uuid.UUID]:
        """
        Devuelve:
        - data (dict) → payload final CAPI
        - event_id (UUID) → para deduplicación
        """

        if tipo not in EVENT_NAME_MAP:
            raise ValueError(f"Tipo de evento no soportado: {tipo}")

        event_id = uuid.uuid4()
        resolved_event_time = event_time or payload.get("event_time")
        if resolved_event_time is None:
            event_time_int = int(time.time())
        else:
            if hasattr(resolved_event_time, "timestamp"):
                if timezone.is_naive(resolved_event_time):
                    resolved_event_time = timezone.make_aware(
                        resolved_event_time,
                        timezone.get_current_timezone(),
                    )
                event_time_int = int(resolved_event_time.timestamp())
            else:
                event_time_int = int(time.time())
        first_name, last_name = _split_name(payload.get("nombre"))

        # -------------------------
        # user_data
        # -------------------------
        user_data = _clean_dict({
            "em": _sha256(_normalize_email(payload.get("email"))),
            "ph": _sha256(_normalize_phone(payload.get("phone"))),
            "fn": _sha256(first_name),
            "ln": _sha256(last_name),
            "external_id": _sha256(payload.get("external_id").strip().lower() if payload.get("external_id") else None),
            "fbp": payload.get("fbp"),
            "fbc": payload.get("fbc"),
            "client_ip_address": _normalize_ip(payload.get("ip_address")) or _extract_request_ip(request),
            "client_user_agent": payload.get("user_agent") or (request.META.get("HTTP_USER_AGENT") if request else None),
        })

        # -------------------------
        # custom_data (solo si aplica)
        # -------------------------
        custom_data = None
        if tipo == "purchase":
            custom_data = _clean_dict({
                "value": float(payload["value"]),
                "currency": payload["currency"],
            })

        # -------------------------
        # payload final
        # -------------------------
        event_source_url = payload.get("event_source_url") or (request.build_absolute_uri() if request else None)
        data = _clean_dict({
            "event_name": EVENT_NAME_MAP[tipo],
            "event_time": event_time_int,
            "event_id": str(event_id),
            "action_source": "website",
            "event_source_url": event_source_url,
            "user_data": user_data,
            "custom_data": custom_data,
        })

        return data, event_id
