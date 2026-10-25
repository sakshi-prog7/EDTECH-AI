"""Leads — list (search/filter/pagination), get, create, patch, archive,
activity history, and a live explainable AI score per lead.

All endpoints require authentication. Audit-logged mutations write to
audit_logs so admins can review who changed what.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..core.deps import AuthedUser, CurrentUser, require_roles
from ..core.errors import AppError, ok
from ..services import db_helpers as db
from ..services.ai import score_lead_features

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _log_audit(user_id: str, action: str, resource_id: str | None = None, meta: dict | None = None) -> None:
    db.execute(
        "INSERT INTO audit_logs (id, user_id, action, resource, resource_id, ip_address, meta, created_at) "
        "VALUES (:id, :user_id, :action, 'lead', :resource_id, NULL, :meta, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "resource_id": resource_id,
            "meta": json.dumps(meta) if meta else None,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )

STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NURTURING", "CONVERTED", "LOST"]
PRIORITIES = ["Low", "Medium", "High"]

_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
_UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


class LeadIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str | None = Field(default=None, pattern=_EMAIL)
    phone: str | None = Field(default=None, max_length=30)
    source: str = Field(default="Website", min_length=1, max_length=60)
    status: str = Field(default="NEW")
    priority: str = Field(default="Medium")
    courseInterest: str | None = Field(default=None, max_length=40)
    counselorId: str | None = Field(default=None, pattern=_UUID)
    engagement: float = Field(default=0, ge=0, le=100)
    interactions: int = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


def _paginated(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


def _list_leads(search: str | None, status: str | None, source: str | None,
                priority: str | None, counselor_id: str | None,
                include_archived: bool, limit: int, offset: int) -> dict:
    where: list[str] = []
    params: dict = {}
    if not include_archived:
        where.append("l.archived = 0")
    if search:
        where.append("(l.name LIKE :search OR l.email LIKE :search OR l.phone LIKE :search OR l.course_interest LIKE :search)")
        params["search"] = f"%{search}%"
    if status:
        where.append("l.status = :status")
        params["status"] = status
    if source:
        where.append("l.source = :source")
        params["source"] = source
    if priority:
        where.append("l.priority = :priority")
        params["priority"] = priority
    if counselor_id:
        where.append("l.counselor_id = :counselor_id")
        params["counselor_id"] = counselor_id
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    total = db.scalar(f"SELECT COUNT(*) AS n FROM leads l {where_sql}", params)
    items = db.q(
        f"SELECT l.*, u.name AS counselor_name FROM leads l "
        f"LEFT JOIN users u ON u.id = l.counselor_id {where_sql} "
        f"ORDER BY l.created_at DESC LIMIT :limit OFFSET :offset",
        {**params, "limit": limit, "offset": offset},
    )
    return {"items": items, "total": total}


@router.get("")
def list_leads(
    _user: CurrentUser,
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
    priority: str | None = None,
    counselorId: str | None = None,
    includeArchived: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_leads(
        search=search,
        status=status,
        source=source,
        priority=priority,
        counselor_id=counselorId,
        include_archived=includeArchived == "true",
        limit=pageSize,
        offset=(page - 1) * pageSize,
    )
    return ok(_paginated(result["items"], result["total"], page, pageSize))


@router.get("/sources")
def lead_sources(_user: CurrentUser):
    rows = db.q("SELECT DISTINCT source FROM leads ORDER BY source")
    return ok({"sources": [r["source"] for r in rows]})


@router.get("/{lead_id}")
def get_lead(lead_id: str, _user: CurrentUser):
    lead = db.one(
        "SELECT l.*, u.name AS counselor_name FROM leads l "
        "LEFT JOIN users u ON u.id = l.counselor_id WHERE l.id = :id",
        {"id": lead_id},
    )
    if not lead:
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    activities = db.q(
        "SELECT a.*, u.name AS user_name FROM activities a "
        "LEFT JOIN users u ON u.id = a.user_id WHERE a.lead_id = :id ORDER BY a.created_at DESC",
        {"id": lead_id},
    )
    return ok({"lead": lead, "activities": activities})


@router.post("", status_code=201)
def create_lead(body: LeadIn, user: CurrentUser):
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO leads (id, name, email, phone, source, status, priority, course_interest, counselor_id, "
        "engagement, interactions, last_activity, notes, score, score_reason, archived, created_at, updated_at) "
        "VALUES (:id, :name, :email, :phone, :source, :status, :priority, :interest, :counselor, "
        ":engagement, :interactions, NULL, :notes, NULL, NULL, 0, :now, :now)",
        {
            "id": lead_id,
            "name": body.name.strip(),
            "email": (body.email or "").strip() or None,
            "phone": (body.phone or "").strip() or None,
            "source": body.source,
            "status": body.status,
            "priority": body.priority,
            "interest": (body.courseInterest or "").strip() or None,
            "counselor": body.counselorId,
            "engagement": body.engagement,
            "interactions": body.interactions,
            "notes": body.notes,
            "now": now,
        },
    )
    lead = db.one(
        "SELECT l.*, u.name AS counselor_name FROM leads l "
        "LEFT JOIN users u ON u.id = l.counselor_id WHERE l.id = :id",
        {"id": lead_id},
    )
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, :lead_id, :user_id, 'lead', :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "user_id": user.id,
            "note": f"Lead created (status: {body.status}).",
            "now": now,
        },
    )
    # Notification for new lead
    db.execute(
        "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
        "VALUES (:id, :uid, 'System', :title, :desc, 0, '/leads', :now)",
        {
            "id": str(uuid.uuid4()),
            "uid": user.id,
            "title": f"New lead: {body.name.strip()}",
            "desc": f"Source: {body.source}. Course interest: {body.courseInterest or 'None'}.",
            "now": now,
        },
    )
    _log_audit(user.id, "create", lead_id, {"name": body.name.strip(), "source": body.source})

    # Auto-score the new lead using AI scoring
    try:
        from ..services.ai import score_lead_features as _score_features
        app_rate = (
            max(1, round((body.interactions or 0) * 0.4))
            if body.status in ("QUALIFIED", "CONVERTED")
            else 0
        )
        enrollments = 1 if body.status == "CONVERTED" else 0
        score_output = _score_features(
            {
                "id": lead_id,
                "platform": body.source,
                "region": (body.courseInterest or "").strip() or None,
                "campaignType": None,
                "leads": body.interactions,
                "applications": app_rate,
                "enrollments": enrollments,
            },
            max(1, body.interactions or 1),
        )
        db.execute(
            "UPDATE leads SET score = :score, score_reason = :reason, updated_at = :now WHERE id = :id",
            {"id": lead_id, "score": score_output["score"], "reason": score_output.get("category", ""), "now": now},
        )
        lead["score"] = score_output["score"]
        lead["score_reason"] = score_output.get("category", "")
    except Exception:
        # Never break lead creation if scoring fails
        pass

    return ok({"lead": lead}, 201)


class LeadPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    email: str | None = Field(default=None, pattern=_EMAIL)
    phone: str | None = Field(default=None, max_length=30)
    source: str | None = Field(default=None, min_length=1, max_length=60)
    status: str | None = None
    priority: str | None = None
    courseInterest: str | None = Field(default=None, max_length=40)
    counselorId: str | None = Field(default=None, pattern=_UUID)
    engagement: float | None = Field(default=None, ge=0, le=100)
    interactions: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


@router.patch("/{lead_id}")
def update_lead(lead_id: str, body: LeadPatch, user: CurrentUser):
    lead = db.one(
        "SELECT l.*, u.name AS counselor_name FROM leads l "
        "LEFT JOIN users u ON u.id = l.counselor_id WHERE l.id = :id",
        {"id": lead_id},
    )
    if not lead:
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    if lead["archived"]:
        raise AppError("This lead is archived.", 400, "BAD_REQUEST")

    def _pick(value, current, empty_to_none: bool = False):
        if value is None:
            return current
        return (value or "").strip() or None if empty_to_none else value

    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE leads SET name = :name, email = :email, phone = :phone, source = :source, status = :status, "
        "priority = :priority, course_interest = :interest, counselor_id = :counselor, engagement = :engagement, "
        "interactions = :interactions, notes = :notes, updated_at = :now WHERE id = :id",
        {
            "id": lead_id,
            "name": _pick(body.name, lead["name"]),
            "email": _pick(body.email, lead["email"], empty_to_none=True),
            "phone": _pick(body.phone, lead["phone"], empty_to_none=True),
            "source": _pick(body.source, lead["source"]),
            "status": _pick(body.status, lead["status"]),
            "priority": _pick(body.priority, lead["priority"]),
            "interest": _pick(body.courseInterest, lead["course_interest"], empty_to_none=True),
            "counselor": body.counselorId if body.counselorId is not None else lead["counselor_id"],
            "engagement": _pick(body.engagement, lead["engagement"]),
            "interactions": _pick(body.interactions, lead["interactions"]),
            "notes": _pick(body.notes, lead["notes"]),
            "now": now,
        },
    )
    updated = db.one(
        "SELECT l.*, u.name AS counselor_name FROM leads l "
        "LEFT JOIN users u ON u.id = l.counselor_id WHERE l.id = :id",
        {"id": lead_id},
    )
    if body.status is not None and body.status != lead["status"]:
        db.execute(
            "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
            "VALUES (:id, :lead_id, :user_id, 'contact', :note, :now)",
            {
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "user_id": user.id,
                "note": f"Status changed from {lead['status']} to {body.status}.",
                "now": now,
            },
        )
        # Notification for lead status change
        db.execute(
            "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
            "VALUES (:id, :uid, 'System', :title, :desc, 0, '/leads', :now)",
            {
                "id": str(uuid.uuid4()),
                "uid": user.id,
                "title": f"Lead {lead['name']} moved to {body.status}",
                "desc": f"Status changed from {lead['status']} to {body.status}.",
                "now": now,
            },
        )
    elif body.notes is not None:
        db.execute(
            "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
            "VALUES (:id, :lead_id, :user_id, 'note', 'Lead notes updated.', :now)",
            {"id": str(uuid.uuid4()), "lead_id": lead_id, "user_id": user.id, "now": now},
        )
    _log_audit(user.id, "update", lead_id)
    return ok({"lead": updated})


@router.post("/{lead_id}/archive")
def archive_lead(
    lead_id: str,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS", "COUNSELOR"))],
):
    if not db.one("SELECT id FROM leads WHERE id = :id", {"id": lead_id}):
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    changed = db.execute(
        "UPDATE leads SET archived = 1, updated_at = :now WHERE id = :id AND archived = 0",
        {"id": lead_id, "now": datetime.now(timezone.utc).isoformat()},
    )
    if not changed:
        raise AppError("Lead is already archived.", 400, "BAD_REQUEST")
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, :lead_id, :user_id, 'note', 'Lead archived.', :now)",
        {
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "user_id": user.id,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    _log_audit(user.id, "archive", lead_id)
    return ok({"message": "Lead archived."})


@router.get("/{lead_id}/activities")
def lead_activities(lead_id: str, _user: CurrentUser):
    if not db.one("SELECT id FROM leads WHERE id = :id", {"id": lead_id}):
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    activities = db.q(
        "SELECT a.*, u.name AS user_name FROM activities a "
        "LEFT JOIN users u ON u.id = a.user_id WHERE a.lead_id = :id ORDER BY a.created_at DESC",
        {"id": lead_id},
    )
    return ok({"activities": activities})


@router.get("/{lead_id}/score")
def lead_score(lead_id: str, _user: CurrentUser):
    lead = db.one(
        "SELECT l.*, u.name AS counselor_name FROM leads l "
        "LEFT JOIN users u ON u.id = l.counselor_id WHERE l.id = :id",
        {"id": lead_id},
    )
    if not lead:
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    output = score_lead_features(
        {
            "id": lead["id"],
            "platform": lead["source"],
            "region": lead["course_interest"],
            "campaignType": None,
            "leads": lead["interactions"],
            "applications": (
                max(1, round((lead["interactions"] or 0) * 0.4))
                if lead["status"] in ("QUALIFIED", "CONVERTED")
                else 0
            ),
            "enrollments": 1 if lead["status"] == "CONVERTED" else 0,
        },
        max(1, lead["interactions"] or 0),
    )
    return ok(
        {
            "score": output["score"],
            "probability": output["probability"],
            "risk": output["risk"],
            "category": output["category"],
            "reasons": output["reasons"],
        }
    )


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: str,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    if not db.one("SELECT id FROM leads WHERE id = :id", {"id": lead_id}):
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM leads WHERE id = :id", {"id": lead_id})
    _log_audit(user.id, "delete", lead_id)
    return ok({"message": "Lead deleted."})
