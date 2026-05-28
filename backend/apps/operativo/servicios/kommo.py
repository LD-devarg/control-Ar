from __future__ import annotations

import json


def normalize_phone(value) -> str:
    if not value:
        return ""
    return "".join(ch for ch in str(value) if ch.isdigit())[:15]


def phone_candidates(value) -> list[str]:
    digits = normalize_phone(value)
    if not digits:
        return []
    candidates = [digits]
    if len(digits) > 10:
        candidates.append(digits[-10:])
    if len(digits) > 8:
        candidates.append(digits[-8:])

    seen = set()
    result = []
    for item in candidates:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def as_dict(value) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {}
    return {}


def first_kommo_entity(block):
    if not isinstance(block, dict):
        return None
    for key in ("add", "update", "status", "restore", "merge"):
        items = block.get(key)
        if isinstance(items, list) and items:
            return items[0]
    return None


def extract_kommo_custom_fields(entity) -> dict:
    result = {}
    if not isinstance(entity, dict):
        return result
    fields = entity.get("custom_fields_values")
    if not isinstance(fields, list):
        return result
    for field in fields:
        if not isinstance(field, dict):
            continue
        field_code = str(field.get("field_code") or "").upper()
        field_name = str(field.get("field_name") or "").strip().lower()
        values = field.get("values")
        if not isinstance(values, list) or not values:
            continue
        raw_value = values[0].get("value")
        if raw_value in (None, ""):
            continue
        value = str(raw_value)
        if field_code == "PHONE" and not result.get("phone"):
            result["phone"] = value
        elif field_code == "EMAIL" and not result.get("email"):
            result["email"] = value
        elif field_name in {"cliente_id", "client_id"} and not result.get("cliente_id"):
            try:
                result["cliente_id"] = int(value)
            except (TypeError, ValueError):
                pass
        elif field_name in {"cliente_uuid", "client_uuid", "uuid_cliente"} and not result.get("cliente_uuid"):
            result["cliente_uuid"] = value
        elif field_name in {"landing_token"} and not result.get("landing_token"):
            result["landing_token"] = value
    return result
