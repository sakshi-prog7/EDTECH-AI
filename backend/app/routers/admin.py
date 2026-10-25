"""Admin panel — user management, sessions, audit logs, system health.

Admin-only endpoints for managing users, viewing sessions, login history,
audit logs, and system health checks.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..core.deps import AuthedUser, require_roles
from ..core.errors import AppError, ok
from ..core.config import settings
from ..services import db_helpers as db

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── User Management ────────────────────────────────────────────────────────


@router.get("/users")
def admin_list_users(
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
    search: str | None = None,
    role: str | None = None,
):
    where: list[str] = []
    params: dict = {}
    if search:
        where.append("(name LIKE :search OR email LIKE :search)")
        params["search"] = f"%{search}%"
    if role:
        where.append("role = :role")
        params["role"] = role
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    rows = db.q(f"SELECT * FROM users {where_sql} ORDER BY created_at DESC", params)
    users = [{k: v for k, v in r.items() if k != "password_hash"} for r in rows]
    return ok({"users": users})


@router.get("/users/{user_id}")
def admin_get_user(
    user_id: str,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    user = db.one("SELECT * FROM users WHERE id = :id", {"id": user_id})
    if not user:
        raise AppError("User not found.", 404, "NOT_FOUND")
    return ok({"user": {k: v for k, v in user.items() if k != "password_hash"}})


@router.patch("/users/{user_id}/role")
def admin_set_role(
    user_id: str,
    body: dict,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    role = body.get("role", "")
    if role not in ("ADMIN", "COUNSELOR", "ADMISSIONS", "STUDENT"):
        raise AppError("Invalid role.", 422, "VALIDATION_ERROR")
    if user_id == user.id:
        raise AppError("You cannot change your own role.", 400, "BAD_REQUEST")
    db.execute(
        "UPDATE users SET role = :role, updated_at = :now WHERE id = :id",
        {"role": role, "now": datetime.now(timezone.utc).isoformat(), "id": user_id},
    )
    _log_audit(user.id, "role_change", "user", user_id, {"new_role": role})
    return ok({"message": f"Role updated to {role}."})


@router.patch("/users/{user_id}/active")
def admin_set_active(
    user_id: str,
    body: dict,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    active = body.get("active", True)
    if user_id == user.id and not active:
        raise AppError("You cannot deactivate your own account.", 400, "BAD_REQUEST")
    db.execute(
        "UPDATE users SET is_active = :active, updated_at = :now WHERE id = :id",
        {"active": 1 if active else 0, "now": datetime.now(timezone.utc).isoformat(), "id": user_id},
    )
    _log_audit(user.id, "deactivate" if not active else "activate", "user", user_id)
    return ok({"message": "Account activated." if active else "Account deactivated."})


# ── Sessions ───────────────────────────────────────────────────────────────


@router.get("/users/{user_id}/sessions")
def admin_user_sessions(
    user_id: str,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    sessions = db.q(
        "SELECT id, created_at, expires_at FROM refresh_tokens WHERE user_id = :uid ORDER BY created_at DESC",
        {"uid": user_id},
    )
    return ok({"sessions": sessions, "total": len(sessions)})


@router.post("/users/{user_id}/revoke-all")
def admin_revoke_all_sessions(
    user_id: str,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    count = db.execute("DELETE FROM refresh_tokens WHERE user_id = :uid", {"uid": user_id})
    _log_audit(user.id, "revoke_sessions", "user", user_id, {"revoked": count})
    return ok({"message": f"Revoked {count} session(s)."})


# ── Login History ──────────────────────────────────────────────────────────


@router.get("/login-history")
def admin_login_history(
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
    userId: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200),
):
    where = ""
    params: dict = {"limit": pageSize, "offset": (page - 1) * pageSize}
    if userId:
        where = "WHERE lh.user_id = :uid"
        params["uid"] = userId
    total = db.scalar(f"SELECT COUNT(*) AS n FROM login_history lh {where}", params)
    rows = db.q(
        f"SELECT lh.*, u.name AS user_name, u.email AS user_email "
        f"FROM login_history lh LEFT JOIN users u ON u.id = lh.user_id "
        f"{where} ORDER BY lh.created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return ok({
        "items": rows,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "pages": (total + pageSize - 1) // pageSize,
    })


# ── Audit Logs ─────────────────────────────────────────────────────────────


@router.get("/audit-logs")
def admin_audit_logs(
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
    userId: str | None = None,
    action: str | None = None,
    resource: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200),
):
    where: list[str] = []
    params: dict = {"limit": pageSize, "offset": (page - 1) * pageSize}
    if userId:
        where.append("a.user_id = :uid")
        params["uid"] = userId
    if action:
        where.append("a.action = :action")
        params["action"] = action
    if resource:
        where.append("a.resource = :resource")
        params["resource"] = resource
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(f"SELECT COUNT(*) AS n FROM audit_logs a {where_sql}", params)
    rows = db.q(
        f"SELECT a.*, u.name AS user_name, u.email AS user_email "
        f"FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id "
        f"{where_sql} ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return ok({
        "items": rows,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "pages": (total + pageSize - 1) // pageSize,
    })


# ── System Health ──────────────────────────────────────────────────────────


@router.get("/health")
def admin_health(_user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "COUNSELOR", "ADMISSIONS", "STUDENT"))]):
    """System health check — accessible to all authenticated users."""
    health = {
        "database": _check_db_health(),
        "ai": _check_ai_health(),
        "email": _check_email_health(),
        "system": {
            "version": "1.0.0",
            "environment": settings.node_env,
            "uptime": "active",
        },
    }
    return ok(health)


def _check_db_health() -> dict:
    try:
        from sqlalchemy import text
        from ..core.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        user_count = db.scalar("SELECT COUNT(*) FROM users")
        lead_count = db.scalar("SELECT COUNT(*) FROM leads")
        return {"status": "healthy", "users": user_count, "leads": lead_count}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def _check_ai_health() -> dict:
    from ..services.ai_provider import get_provider
    provider = get_provider()
    return {
        "status": "healthy",
        "provider": provider.name,
        "model": settings.openai_model if provider.name == "openai" else "baseline",
    }


def _check_email_health() -> dict:
    from ..services.email import is_email_configured
    configured = is_email_configured()
    return {
        "status": "healthy" if configured else "degraded",
        "mode": "smtp" if configured else "dev",
        "configured": configured,
    }


# ── Settings ───────────────────────────────────────────────────────────────


@router.get("/settings")
def admin_get_settings(_user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))]):
    """Get current system settings."""
    return ok({
        "workspace": {
            "name": "EDTECH AI",
            "timezone": "UTC",
            "language": "en",
            "currency": "INR",
        },
        "email": {
            "configured": bool(settings.smtp_host),
            "host": settings.smtp_host or None,
            "from": settings.smtp_from or None,
        },
        "ai": {
            "provider": settings.ai_provider,
            "configured": bool(settings.openai_api_key) if settings.ai_provider == "openai" else True,
        },
        "security": {
            "jwt_access_expires": settings.jwt_access_expires,
            "jwt_refresh_expires": settings.jwt_refresh_expires,
            "production_mode": settings.is_production,
        },
        "database": {
            "type": "SQLite" if "sqlite" in settings.resolved_database_url.lower() else "PostgreSQL",
            "url_configured": bool(settings.database_url),
        },
    })


# ── Helper: Audit Log ──────────────────────────────────────────────────────


def _log_audit(
    user_id: str | None,
    action: str,
    resource: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an audit log entry."""
    db.execute(
        "INSERT INTO audit_logs (id, user_id, action, resource, resource_id, ip_address, meta, created_at) "
        "VALUES (:id, :user_id, :action, :resource, :resource_id, :ip, :meta, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "resource": resource,
            "resource_id": resource_id,
            "ip": ip_address,
            "meta": __import__("json").dumps(metadata) if metadata else None,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
