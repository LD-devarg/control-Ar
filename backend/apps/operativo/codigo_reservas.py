import uuid

from django.core.cache import cache


RESERVATION_TTL_SECONDS = 10 * 60
TOKEN_KEY_PREFIX = "lead_code_reservation:token:"
CODE_KEY_PREFIX = "lead_code_reservation:code:"


def _token_key(token: str) -> str:
    return f"{TOKEN_KEY_PREFIX}{token}"


def _code_key(code: str) -> str:
    return f"{CODE_KEY_PREFIX}{code}"


def reserve_code(*, code: str, landing_token: str | None = None) -> dict:
    token = str(uuid.uuid4())
    payload = {
        "token": token,
        "code": str(code or "").strip(),
        "landing_token": str(landing_token or "").strip() or None,
    }
    cache.set(_token_key(token), payload, timeout=RESERVATION_TTL_SECONDS)
    cache.set(_code_key(payload["code"]), payload, timeout=RESERVATION_TTL_SECONDS)
    return payload


def get_reservation_by_token(token: str | None):
    if not token:
        return None
    return cache.get(_token_key(str(token).strip()))


def get_reservation_by_code(code: str | None):
    if not code:
        return None
    return cache.get(_code_key(str(code).strip()))


def is_code_reserved(code: str | None, *, reservation_token: str | None = None) -> bool:
    reservation = get_reservation_by_code(code)
    if not reservation:
        return False
    if reservation_token and reservation.get("token") == str(reservation_token).strip():
        return False
    return True


def consume_reservation(token: str | None) -> None:
    reservation = get_reservation_by_token(token)
    if not reservation:
        return
    cache.delete(_token_key(reservation.get("token")))
    cache.delete(_code_key(reservation.get("code")))


def release_reservation(token: str | None) -> None:
    consume_reservation(token)
