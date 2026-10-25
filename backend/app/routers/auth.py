"""Authentication — register, login, refresh, logout, me, forgot/reset.

Passwords are hashed with scrypt; refresh tokens are stored as SHA-256
hashes and rotated on every refresh. Roles are NEVER accepted from the
client — new sign-ups always start as STUDENT (staff roles are assigned by
an admin via /api/users).

Account lockout: after 5 consecutive failed login attempts the account is
locked for 15 minutes. Successful login resets the counter.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from ..core.config import settings
from ..core.deps import CurrentUser
from ..core.errors import AppError, ok
from ..core.security import (
    hash_password,
    hash_token,
    password_strength_error,
    random_token,
    sign_access_token,
    sign_refresh_token,
    verify_password,
    verify_refresh_token,
)
from ..services import db_helpers as db

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=EMAIL_PATTERN)
    password: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)
    password: str = Field(min_length=1)


class RefreshIn(BaseModel):
    refreshToken: str = Field(min_length=1)


class ForgotIn(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)


class ResetIn(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=1)


MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _find_user_by_email(email: str) -> dict | None:
    return db.one(
        "SELECT * FROM users WHERE email = :email COLLATE NOCASE", {"email": email}
    )


def _find_user_by_id(user_id: str) -> dict | None:
    return db.one("SELECT * FROM users WHERE id = :id", {"id": user_id})


def _public_user(row: dict) -> dict:
    return {k: v for k, v in row.items() if k not in ("password_hash", "failed_login_attempts", "locked_until")}


def _is_locked(row: dict) -> bool:
    """Check if the account is currently locked."""
    locked_until = row.get("locked_until")
    if not locked_until:
        return False
    try:
        expires = datetime.fromisoformat(locked_until)
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return expires.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)
    except (ValueError, TypeError):
        return False


def _record_login(user_id: str, success: bool, ip: str | None = None, ua: str | None = None) -> None:
    """Record a login attempt in login_history."""
    db.execute(
        "INSERT INTO login_history (id, user_id, ip_address, user_agent, success, created_at) "
        "VALUES (:id, :user_id, :ip, :ua, :success, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "ip": ip,
            "ua": ua,
            "success": 1 if success else 0,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )


def _handle_failed_login(user_id: str) -> None:
    """Increment failed attempts and lock if threshold reached."""
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, updated_at = :now WHERE id = :id",
        {"now": now, "id": user_id},
    )
    user = _find_user_by_id(user_id)
    if user and user.get("failed_login_attempts", 0) >= MAX_FAILED_ATTEMPTS:
        lock_until = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
        db.execute(
            "UPDATE users SET locked_until = :lock WHERE id = :id",
            {"lock": lock_until, "id": user_id},
        )


def _reset_failed_login(user_id: str) -> None:
    """Reset failed attempts on successful login."""
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = :now WHERE id = :id",
        {"now": now, "id": user_id},
    )


def _issue_tokens(user: dict) -> dict:
    """Fresh token pair + store the hashed refresh token."""
    access_token = sign_access_token(user["id"], user["role"])
    refresh_token = sign_refresh_token(user["id"], user["role"])
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    db.execute(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) "
        "VALUES (:id, :user_id, :token_hash, :expires, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "token_hash": hash_token(refresh_token),
            "expires": expires,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {"accessToken": access_token, "refreshToken": refresh_token}


@router.post("/register", status_code=201)
def register(body: RegisterIn):
    strength_error = password_strength_error(body.password)
    if strength_error:
        raise AppError(strength_error, 422, "VALIDATION_ERROR")
    if _find_user_by_email(body.email):
        raise AppError("An account with this email already exists.", 409, "CONFLICT")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO users (id, name, email, password_hash, role, is_active, failed_login_attempts, locked_until, created_at, updated_at) "
        "VALUES (:id, :name, :email, :hash, 'STUDENT', 1, 0, NULL, :now, :now)",
        {
            "id": user_id,
            "name": body.name.strip(),
            "email": body.email.strip(),
            "hash": hash_password(body.password),
            "now": now,
        },
    )
    user = _find_user_by_id(user_id)
    return ok({"user": _public_user(user), **_issue_tokens(user)}, 201)


@router.post("/login")
def login(body: LoginIn, request: Request):  # noqa: B008
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    user = _find_user_by_email(body.email.strip())
    # Same error for unknown email / wrong password (no user enumeration).
    if not user or not verify_password(body.password, user["password_hash"]):
        if user:
            _handle_failed_login(user["id"])
            _record_login(user["id"], False, ip, ua)
        raise AppError("Invalid email or password.", 401, "UNAUTHORIZED")
    if not user["is_active"]:
        _record_login(user["id"], False, ip, ua)
        raise AppError(
            "This account has been deactivated. Contact your administrator.",
            403,
            "FORBIDDEN",
        )
    if _is_locked(user):
        _record_login(user["id"], False, ip, ua)
        raise AppError(
            f"Account is locked due to too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes.",
            423,
            "LOCKED",
        )
    _reset_failed_login(user["id"])
    _record_login(user["id"], True, ip, ua)
    return ok({"user": _public_user(user), **_issue_tokens(user)})


@router.post("/refresh")
def refresh(body: RefreshIn):
    payload = verify_refresh_token(body.refreshToken)
    if not payload:
        raise AppError("Invalid or expired refresh token.", 401, "UNAUTHORIZED")
    row = db.one(
        "SELECT id FROM refresh_tokens WHERE user_id = :uid AND token_hash = :hash",
        {"uid": payload["sub"], "hash": hash_token(body.refreshToken)},
    )
    if not row:
        raise AppError("Refresh token has been revoked.", 401, "UNAUTHORIZED")
    user = _find_user_by_id(payload["sub"])
    if not user or not user["is_active"]:
        raise AppError("Account not found or deactivated.", 401, "UNAUTHORIZED")
    # Rotate: revoke the old token, issue a new pair.
    db.execute("DELETE FROM refresh_tokens WHERE id = :id", {"id": row["id"]})
    return ok({"user": _public_user(user), **_issue_tokens(user)})


@router.post("/logout")
def logout(body: RefreshIn):
    payload = verify_refresh_token(body.refreshToken)
    if payload:
        db.execute(
            "DELETE FROM refresh_tokens WHERE user_id = :uid AND token_hash = :hash",
            {"uid": payload["sub"], "hash": hash_token(body.refreshToken)},
        )
    return ok({"message": "Logged out successfully."})


@router.get("/me")
def me(user: CurrentUser):
    row = _find_user_by_id(user.id)
    return ok({"user": _public_user(row) if row else None})


@router.post("/forgot-password")
def forgot_password(body: ForgotIn):
    user = _find_user_by_email(body.email.strip())
    if not user:
        # Identical response whether or not the account exists (no enumeration).
        return ok(
            {"message": "If an account exists for that email, a reset link has been generated."}
        )
    token = random_token()
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    db.execute(
        "INSERT INTO reset_tokens (id, user_id, token_hash, expires_at, used, created_at) "
        "VALUES (:id, :user_id, :token_hash, :expires, 0, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "token_hash": hash_token(token),
            "expires": expires,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    # Try to send the reset email via SMTP. When SMTP is not configured,
    # the email is logged in dev mode and the token is returned for testing.
    try:
        from ..services.email import send_email, template_password_reset
        from ..core.config import settings as _cfg
        reset_url = f"{_cfg.frontend_url}/reset-password?token={token}"
        subject, html = template_password_reset(user["name"], reset_url)
        send_email(user["email"], subject, html)
    except Exception:
        pass  # Best effort — don't fail the endpoint if email sending fails.
    result: dict = {
        "message": "If an account exists for that email, a reset link has been generated."
    }
    if not settings.is_production:
        result["demoResetToken"] = token
    return ok(result)


@router.post("/reset-password")
def reset_password(body: ResetIn):
    strength_error = password_strength_error(body.password)
    if strength_error:
        raise AppError(strength_error, 422, "VALIDATION_ERROR")
    row = db.one(
        "SELECT * FROM reset_tokens WHERE token_hash = :hash AND used = 0",
        {"hash": hash_token(body.token)},
    )
    if not row:
        raise AppError("Invalid or already-used reset token.", 400, "BAD_REQUEST")
    try:
        expires = datetime.fromisoformat(row["expires_at"])
    except ValueError:
        expires = datetime.min.replace(tzinfo=timezone.utc)
    if expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise AppError("This reset token has expired. Request a new one.", 400, "BAD_REQUEST")

    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE users SET password_hash = :hash, updated_at = :now WHERE id = :id",
        {"hash": hash_password(body.password), "now": now, "id": row["user_id"]},
    )
    db.execute("UPDATE reset_tokens SET used = 1 WHERE id = :id", {"id": row["id"]})
    db.execute("DELETE FROM refresh_tokens WHERE user_id = :uid", {"uid": row["user_id"]})
    return ok({"message": "Password updated. You can now sign in with your new password."})


@router.get("/status")
def auth_status(user: CurrentUser):
    """Return current authentication status with session details."""
    row = _find_user_by_id(user.id)
    if not row:
        return ok({"authenticated": False, "user": None})
    # Count active refresh tokens (sessions)
    session_count = db.scalar(
        "SELECT COUNT(*) AS n FROM refresh_tokens WHERE user_id = :uid",
        {"uid": user.id},
    )
    return ok({
        "authenticated": True,
        "user": _public_user(row),
        "sessions": session_count,
        "is_locked": _is_locked(row),
        "failed_attempts": row.get("failed_login_attempts", 0),
    })


@router.get("/login-history")
def login_history(user: CurrentUser):
    """Return recent login history for the current user (admin can see all)."""
    rows = db.q(
        "SELECT * FROM login_history WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20",
        {"uid": user.id},
    )
    return ok({"history": rows})
