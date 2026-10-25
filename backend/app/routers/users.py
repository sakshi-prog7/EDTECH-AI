"""Admin user management — admin-only, verified server-side.

A normal user can never call these endpoints (403). Self-role-change and
self-deactivation are blocked.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..core.deps import AuthedUser, CurrentUser, require_roles
from ..core.errors import AppError, ok
from ..core.security import hash_password, password_strength_error
from ..services import db_helpers as db

router = APIRouter(prefix="/api/users", tags=["users"])

ROLES = ["ADMIN", "COUNSELOR", "ADMISSIONS", "STUDENT"]
_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class UserIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=_EMAIL)
    password: str = Field(min_length=1)
    role: str


class RoleIn(BaseModel):
    role: str


class ActiveIn(BaseModel):
    active: bool


@router.get("")
def list_users(_user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))]):
    rows = db.q("SELECT * FROM users ORDER BY created_at DESC")
    users = [{k: v for k, v in r.items() if k != "password_hash"} for r in rows]
    return ok({"users": users})


@router.post("", status_code=201)
def create_user(
    body: UserIn, _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))]
):
    strength_error = password_strength_error(body.password)
    if strength_error:
        raise AppError(strength_error, 422, "VALIDATION_ERROR")
    if db.one("SELECT id FROM users WHERE email = :email COLLATE NOCASE", {"email": body.email.strip()}):
        raise AppError("An account with this email already exists.", 409, "CONFLICT")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO users (id, name, email, password_hash, role, is_active, failed_login_attempts, locked_until, created_at, updated_at) "
        "VALUES (:id, :name, :email, :hash, :role, 1, 0, NULL, :now, :now)",
        {
            "id": user_id,
            "name": body.name.strip(),
            "email": body.email.strip(),
            "hash": hash_password(body.password),
            "role": body.role,
            "now": now,
        },
    )
    user = db.one("SELECT * FROM users WHERE id = :id", {"id": user_id})
    return ok(
        {"user": {k: v for k, v in user.items() if k != "password_hash"}},
        201,
    )


@router.patch("/{user_id}/role")
def set_role(
    user_id: str,
    body: RoleIn,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    if user_id == user.id:
        raise AppError("You cannot change your own role.", 400, "BAD_REQUEST")
    db.execute(
        "UPDATE users SET role = :role, updated_at = :now WHERE id = :id",
        {"role": body.role, "now": datetime.now(timezone.utc).isoformat(), "id": user_id},
    )
    return ok({"message": "Role updated."})


@router.patch("/{user_id}/active")
def set_active(
    user_id: str,
    body: ActiveIn,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    if user_id == user.id and not body.active:
        raise AppError("You cannot deactivate your own account.", 400, "BAD_REQUEST")
    db.execute(
        "UPDATE users SET is_active = :active, updated_at = :now WHERE id = :id",
        {"active": 1 if body.active else 0, "now": datetime.now(timezone.utc).isoformat(), "id": user_id},
    )
    return ok({"message": "Account activated." if body.active else "Account deactivated."})
