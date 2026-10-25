"""Auth dependencies — get_current_user + role guard.

The user's role is always loaded from the database row (never trusted from
the token or the client), so deactivated users are rejected immediately and
role changes take effect on the next request.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.entities import User
from .database import get_db
from .errors import AppError
from .security import verify_access_token


@dataclass
class AuthedUser:
    id: str
    name: str
    email: str
    role: str


def get_current_user(
    request: Request, db: Annotated[Session, Depends(get_db)]
) -> AuthedUser:
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer "):
        raise AppError(
            "Authentication required. Provide a valid access token.",
            401,
            "UNAUTHORIZED",
        )
    payload = verify_access_token(header[len("Bearer "):])
    if not payload:
        raise AppError("Invalid or expired access token.", 401, "UNAUTHORIZED")

    user = db.execute(select(User).where(User.id == payload["sub"])).scalar_one_or_none()
    if not user or not user.is_active:
        raise AppError("Account not found or deactivated.", 401, "UNAUTHORIZED")
    return AuthedUser(id=user.id, name=user.name, email=user.email, role=user.role)


CurrentUser = Annotated[AuthedUser, Depends(get_current_user)]


def require_roles(*roles: str):
    """Dependency factory — restrict a route to the given roles (403 otherwise)."""

    def checker(user: CurrentUser) -> AuthedUser:
        if user.role not in roles:
            raise AppError(
                "You do not have permission to perform this action.", 403, "FORBIDDEN"
            )
        return user

    return checker
