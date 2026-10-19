from __future__ import annotations

import re
from typing import Any


SENSITIVE_KEYS = {
    "password", "passwords", "passwd", "secret", "token", "access_token",
    "refresh_token", "authorization", "cookie", "cookies", "session",
    "api_key", "apikey", "imei", "serial", "serial_number", "order_reference",
}

EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE = re.compile(r"(?<!\d)(?:\+?351\s*)?(?:2\d{8}|9\d{8})(?!\d)")
IMEI = re.compile(r"(?<!\d)\d{15}(?!\d)")
BEARER = re.compile(r"(?i)bearer\s+[A-Za-z0-9._~+/=-]+")


def redact_text(value: str) -> str:
    value = BEARER.sub("[TOKEN REMOVIDO]", value)
    value = EMAIL.sub("[EMAIL REMOVIDO]", value)
    value = PHONE.sub("[TELEFONE REMOVIDO]", value)
    value = IMEI.sub("[IMEI REMOVIDO]", value)
    return value


def sanitize_for_ai(value: Any) -> Any:
    """Remove segredos e identificadores antes de qualquer chamada a um modelo."""
    if isinstance(value, dict):
        clean: dict[str, Any] = {}
        for key, item in value.items():
            if key.lower() in SENSITIVE_KEYS:
                continue
            clean[key] = sanitize_for_ai(item)
        return clean
    if isinstance(value, list):
        return [sanitize_for_ai(item) for item in value]
    if isinstance(value, tuple):
        return tuple(sanitize_for_ai(item) for item in value)
    if isinstance(value, str):
        return redact_text(value)
    return value
