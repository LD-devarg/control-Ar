from __future__ import annotations

from datetime import datetime, timezone


def _extract_body(message: dict) -> str:
    msg_type = message.get("type")
    if msg_type == "text":
        return str((message.get("text") or {}).get("body") or "")
    if msg_type in {"button", "interactive"}:
        return str(message.get(msg_type) or "")
    if msg_type in {"image", "video", "document"}:
        media_obj = message.get(msg_type) or {}
        caption = media_obj.get("caption") or ""
        if not caption and msg_type == "document":
            caption = media_obj.get("filename") or ""
        return str(caption)
    return ""


def _ts(value) -> datetime:
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except (TypeError, ValueError):
        return datetime.now(tz=timezone.utc)


def parse_inbound(payload: dict) -> list[dict]:
    resultados = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            metadata = value.get("metadata", {})
            contacts = {str(c.get("wa_id")): c for c in value.get("contacts", []) if c.get("wa_id")}
            for msg in value.get("messages", []):
                wa_id = str(msg.get("from") or "")
                if not wa_id:
                    continue
                contact = contacts.get(wa_id, {})
                referral = msg.get("referral", {}) or {}
                
                msg_type = msg.get("type")
                media_id = None
                user_filename = None
                if msg_type in {"image", "audio", "voice", "video", "document"}:
                    media_obj = msg.get(msg_type) or {}
                    media_id = media_obj.get("id")
                    if msg_type == "document":
                        user_filename = media_obj.get("filename")

                resultados.append(
                    {
                        "wa_phone": wa_id,
                        "contact_name": (contact.get("profile") or {}).get("name"),
                        "wa_message_id": msg.get("id"),
                        "timestamp": _ts(msg.get("timestamp")),
                        "tipo": msg_type or "unknown",
                        "body": _extract_body(msg),
                        "media_id": media_id,
                        "user_filename": user_filename,
                        "ctwa_clid": referral.get("ctwa_clid"),
                        "source_ad_id": referral.get("source_id"),
                        "phone_number_id": metadata.get("phone_number_id"),
                        "raw": msg,
                    }
                )
    return resultados


def parse_statuses(payload: dict) -> list[dict]:
    resultados = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for status in value.get("statuses", []):
                resultados.append(
                    {
                        "wa_message_id": status.get("id"),
                        "estado": status.get("status"),
                        "timestamp": _ts(status.get("timestamp")),
                        "raw": status,
                    }
                )
    return resultados
