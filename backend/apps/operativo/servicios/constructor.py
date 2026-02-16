import uuid
import time
import hashlib


EVENT_NAME_MAP = {
    "lead": "Lead",
    "contact": "Contact",
    "purchase": "Purchase",
}


def _sha256(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _clean_dict(data: dict) -> dict:
    """
    Elimina claves con valores None.
    Meta rechaza payloads con campos null.
    """
    return {k: v for k, v in data.items() if v is not None}


class MetaEventBuilder:
    @staticmethod
    def build(*, tipo: str, payload: dict, request=None) -> tuple[dict, uuid.UUID]:
        """
        Devuelve:
        - data (dict) → payload final CAPI
        - event_id (UUID) → para deduplicación
        """

        if tipo not in EVENT_NAME_MAP:
            raise ValueError(f"Tipo de evento no soportado: {tipo}")

        event_id = uuid.uuid4()
        event_time = int(time.time())

        # -------------------------
        # user_data
        # -------------------------
        user_data = _clean_dict({
            "em": _sha256(payload.get("email")),
            "ph": _sha256(payload.get("phone")),
            "external_id": _sha256(payload.get("external_id")),
            "fbp": payload.get("fbp"),
            "fbc": payload.get("fbc"),
            "client_ip_address": request.META.get("REMOTE_ADDR") if request else None,
            "client_user_agent": request.META.get("HTTP_USER_AGENT") if request else None,
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
            "event_time": event_time,
            "event_id": str(event_id),
            "action_source": "website",
            "event_source_url": event_source_url,
            "user_data": user_data,
            "custom_data": custom_data,
        })

        return data, event_id
