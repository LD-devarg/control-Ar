from __future__ import annotations

import os

from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    key = os.getenv("META_FERNET_KEY") or os.getenv("FERNET_KEY")
    if not key:
        raise ValueError("META_FERNET_KEY no configurada")
    return Fernet(key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(token_encrypted: str) -> str:
    return _get_fernet().decrypt(token_encrypted.encode("utf-8")).decode("utf-8")
