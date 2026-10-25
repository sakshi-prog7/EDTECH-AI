"""Tiny SQL helper layer for routers — mirrors the original typed model layer.

Queries use the same SQL as the original Node models (aliases included), so
row shapes match the frontend contract exactly. Writes run inside an
explicit transaction (committed on success).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import text

from ..core.database import engine


def q(sql: str, params: dict[str, Any] | None = None) -> list[dict]:
    """SELECT returning a list of row dicts."""
    with engine.connect() as conn:
        rows = conn.execute(text(sql), params or {}).mappings().all()
    return [dict(r) for r in rows]


def one(sql: str, params: dict[str, Any] | None = None) -> dict | None:
    """SELECT returning a single row dict (or None)."""
    rows = q(sql, params)
    return rows[0] if rows else None


def scalar(sql: str, params: dict[str, Any] | None = None) -> Any:
    """SELECT returning a single value."""
    with engine.connect() as conn:
        return conn.execute(text(sql), params or {}).scalar_one()


def execute(sql: str, params: dict[str, Any] | None = None) -> int:
    """INSERT/UPDATE/DELETE inside a transaction; returns rowcount."""
    with engine.begin() as conn:
        result = conn.execute(text(sql), params or {})
        return result.rowcount or 0
