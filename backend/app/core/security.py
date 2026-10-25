"""Password hashing + JWT helpers.

Passwords are hashed with scrypt (stdlib — no native builds), each hash
carrying its own random salt, verified with a timing-safe comparison.
Refresh tokens are stored in the database only as SHA-256 hashes, so a DB
leak cannot be replayed as a valid session.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt as pyjwt

from .config import settings

USER_ROLES = ("ADMIN", "COUNSELOR", "ADMISSIONS", "STUDENT")

_KEY_LENGTH = 64
_SCRYPT_N = 16384  # Node's scryptSync defaults (r=8, p=1)


# ---------------------------------------------------------------------- #
# Passwords                                                              #
# ---------------------------------------------------------------------- #
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=_SCRYPT_N,
        r=8,
        p=1,
        dklen=_KEY_LENGTH,
    )
    return f"{salt}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected_hex = stored.split(":", 1)
    except ValueError:
        return False
    candidate = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=_SCRYPT_N,
        r=8,
        p=1,
        dklen=_KEY_LENGTH,
    )
    return hmac.compare_digest(candidate.hex(), expected_hex)


def password_strength_error(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(c.isalpha() for c in password):
        return "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number."
    return None


# ---------------------------------------------------------------------- #
# JWT                                                                   #
# ---------------------------------------------------------------------- #
def _expiry(minutes: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)


def sign_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "jti": secrets.token_hex(12),
        "exp": _expiry(settings.access_expiry_minutes),
    }
    return pyjwt.encode(payload, settings.jwt_access_secret, algorithm="HS256")


def sign_refresh_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "type": "refresh",
        "jti": secrets.token_hex(12),
        "exp": _expiry(settings.refresh_expiry_minutes),
    }
    return pyjwt.encode(payload, settings.jwt_refresh_secret, algorithm="HS256")


def verify_access_token(token: str) -> dict | None:
    try:
        payload = pyjwt.decode(token, settings.jwt_access_secret, algorithms=["HS256"])
    except Exception:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def verify_refresh_token(token: str) -> dict | None:
    try:
        payload = pyjwt.decode(token, settings.jwt_refresh_secret, algorithms=["HS256"])
    except Exception:
        return None
    if payload.get("type") != "refresh":
        return None
    return payload


# ---------------------------------------------------------------------- #
# Token hashing                                                          #
# ---------------------------------------------------------------------- #
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def random_token() -> str:
    return secrets.token_hex(32)
