"""Campaigns — list (status/search + pagination, with performance aggregates),
get, create/update (admin/admissions), delete (admin).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..core.deps import AuthedUser, CurrentUser, require_roles
from ..core.errors import AppError, ok
from ..services import db_helpers as db
from ..services.audit import log_audit

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

_LIST_SQL = (
    "SELECT c.*, COALESCE(SUM(d.leads), 0) AS leads, COALESCE(SUM(d.applications), 0) AS applications, "
    "COALESCE(SUM(d.enrollments), 0) AS enrollments, COALESCE(SUM(d.cost), 0) AS cost, "
    "COALESCE(SUM(d.revenue), 0) AS revenue "
    "FROM campaigns c LEFT JOIN campaign_daily d ON d.campaign_id = c.id "
)


class CampaignIn(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    type: str = Field(default="Digital", min_length=2, max_length=60)
    status: str = Field(default="draft")
    platform: str | None = Field(default=None, max_length=60)
    audience: str | None = Field(default=None, max_length=300)
    budget: float = Field(default=0, ge=0)
    startsAt: str | None = None
    endsAt: str | None = None


def _list_campaigns(status: str | None, search: str | None, limit: int, offset: int) -> dict:
    where: list[str] = []
    params: dict = {"limit": limit, "offset": offset}
    if status:
        where.append("c.status = :status")
        params["status"] = status
    if search:
        where.append("c.name LIKE :search")
        params["search"] = f"%{search}%"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(f"SELECT COUNT(*) AS n FROM campaigns c {where_sql}", params)
    items = db.q(
        f"{_LIST_SQL} {where_sql} GROUP BY c.id ORDER BY c.created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return {"items": items, "total": total}


@router.get("")
def list_campaigns(
    _user: CurrentUser,
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_campaigns(status=status, search=search, limit=pageSize, offset=(page - 1) * pageSize)
    return ok(
        {
            "items": result["items"],
            "total": result["total"],
            "page": page,
            "pageSize": pageSize,
            "pages": (result["total"] + pageSize - 1) // pageSize,
        }
    )


@router.get("/{campaign_id}")
def get_campaign(campaign_id: str, _user: CurrentUser):
    campaign = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": campaign_id})
    if not campaign:
        raise AppError("Campaign not found.", 404, "NOT_FOUND")
    return ok({"campaign": campaign})


@router.post("", status_code=201)
def create_campaign(
    body: CampaignIn,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO campaigns (id, name, type, status, platform, audience, budget, starts_at, ends_at, created_at, updated_at) "
        "VALUES (:id, :name, :type, :status, :platform, :audience, :budget, :starts, :ends, :now, :now)",
        {
            "id": campaign_id,
            "name": body.name.strip(),
            "type": body.type,
            "status": body.status,
            "platform": (body.platform or "").strip() or None,
            "audience": (body.audience or "").strip() or None,
            "budget": body.budget,
            "starts": (body.startsAt or "").strip() or None,
            "ends": (body.endsAt or "").strip() or None,
            "now": now,
        },
    )
    campaign = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": campaign_id})
    # Log activity for recent activities feed
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, NULL, :user_id, 'campaign', :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": _user.id,
            "note": f"Campaign created: {body.name.strip()}.",
            "now": now,
        },
    )
    log_audit(_user.id, "create", "campaign", campaign_id, {"name": body.name.strip()})
    return ok({"campaign": campaign}, 201)


class CampaignPatch(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    type: str | None = Field(default=None, min_length=2, max_length=60)
    status: str | None = None
    platform: str | None = Field(default=None, max_length=60)
    audience: str | None = Field(default=None, max_length=300)
    budget: float | None = Field(default=None, ge=0)
    startsAt: str | None = None
    endsAt: str | None = None


@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: str,
    body: CampaignPatch,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    current = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": campaign_id})
    if not current:
        raise AppError("Campaign not found.", 404, "NOT_FOUND")

    def _pick(value, current, empty_to_none=False):
        if value is None:
            return current
        return (value or "").strip() or None if empty_to_none else value

    db.execute(
        "UPDATE campaigns SET name = :name, type = :type, status = :status, platform = :platform, "
        "audience = :audience, budget = :budget, starts_at = :starts, ends_at = :ends, updated_at = :now WHERE id = :id",
        {
            "id": campaign_id,
            "name": _pick(body.name, current["name"]),
            "type": _pick(body.type, current["type"]),
            "status": _pick(body.status, current["status"]),
            "platform": _pick(body.platform, current["platform"], empty_to_none=True),
            "audience": _pick(body.audience, current["audience"], empty_to_none=True),
            "budget": _pick(body.budget, current["budget"]),
            "starts": _pick(body.startsAt, current["starts_at"], empty_to_none=True),
            "ends": _pick(body.endsAt, current["ends_at"], empty_to_none=True),
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    campaign = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": campaign_id})
    log_audit(_user.id, "update", "campaign", campaign_id)
    return ok({"campaign": campaign})


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: str, _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))]
):
    if not db.one("SELECT id FROM campaigns WHERE id = :id", {"id": campaign_id}):
        raise AppError("Campaign not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM campaign_emails WHERE campaign_id = :id", {"id": campaign_id})
    db.execute("DELETE FROM campaign_daily WHERE campaign_id = :id", {"id": campaign_id})
    db.execute("DELETE FROM campaigns WHERE id = :id", {"id": campaign_id})
    log_audit(_user.id, "delete", "campaign", campaign_id)
    return ok({"message": "Campaign deleted."})


# ======================== Email Campaign Sending ========================= #
class CampaignEmailIn(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    recipients: list[dict] = Field(default_factory=list)  # [{email, name}]


class CampaignAIEmailIn(BaseModel):
    leadName: str = Field(default="Student")
    courseInterest: str | None = None
    tone: str = Field(default="professional")


@router.post("/{campaign_id}/send-emails")
def send_campaign_emails(
    campaign_id: str,
    body: CampaignEmailIn,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    campaign = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": campaign_id})
    if not campaign:
        raise AppError("Campaign not found.", 404, "NOT_FOUND")
    if campaign["status"] == "completed":
        raise AppError("Cannot send emails for a completed campaign.", 400, "BAD_REQUEST")

    from ..services.email import send_email, template_campaign_email

    sent_count = 0
    for recipient in body.recipients:
        email_addr = recipient.get("email", "")
        name = recipient.get("name", "Student")
        if not email_addr:
            continue

        subject, html = template_campaign_email(name, body.subject, body.body, campaign["name"])
        result = send_email(email_addr, subject, html)

        db.execute(
            "INSERT INTO campaign_emails (id, campaign_id, recipient_email, recipient_name, subject, status, sent_at, created_at) "
            "VALUES (:id, :cid, :email, :name, :subject, :status, :sent_at, :now)",
            {
                "id": str(uuid.uuid4()),
                "cid": campaign_id,
                "email": email_addr,
                "name": name,
                "subject": body.subject,
                "status": "sent" if result.get("success") else "bounced",
                "sent_at": datetime.now(timezone.utc).isoformat() if result.get("success") else None,
                "now": datetime.now(timezone.utc).isoformat(),
            },
        )
        if result.get("success"):
            sent_count += 1

    # Update campaign status to active if it was draft
    if campaign["status"] == "draft":
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "UPDATE campaigns SET status = 'active', updated_at = :now WHERE id = :id",
            {"now": now, "id": campaign_id},
        )

    return ok({"sent": sent_count, "total": len(body.recipients), "message": f"{sent_count} email(s) sent."})


@router.get("/{campaign_id}/emails")
def list_campaign_emails(
    campaign_id: str,
    _user: CurrentUser,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    if not db.one("SELECT id FROM campaigns WHERE id = :id", {"id": campaign_id}):
        raise AppError("Campaign not found.", 404, "NOT_FOUND")
    where = "WHERE campaign_id = :cid"
    params: dict = {"cid": campaign_id, "limit": pageSize, "offset": (page - 1) * pageSize}
    if status:
        where += " AND status = :status"
        params["status"] = status
    total = db.scalar(f"SELECT COUNT(*) AS n FROM campaign_emails {where}", params)
    items = db.q(
        f"SELECT * FROM campaign_emails {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    # Aggregate stats
    stats = db.q(
        "SELECT status, COUNT(*) AS count FROM campaign_emails WHERE campaign_id = :cid GROUP BY status",
        {"cid": campaign_id},
    )
    return ok({
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "pages": (total + pageSize - 1) // pageSize,
        "stats": {s["status"]: s["count"] for s in stats},
    })


@router.post("/{campaign_id}/duplicate")
def duplicate_campaign(
    campaign_id: str,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    current = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": campaign_id})
    if not current:
        raise AppError("Campaign not found.", 404, "NOT_FOUND")
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO campaigns (id, name, type, status, platform, audience, budget, starts_at, ends_at, created_at, updated_at) "
        "VALUES (:id, :name, :type, 'draft', :platform, :audience, :budget, NULL, NULL, :now, :now)",
        {
            "id": new_id,
            "name": f"{current['name']} (Copy)",
            "type": current["type"],
            "platform": current["platform"],
            "audience": current["audience"],
            "budget": current["budget"],
            "now": now,
        },
    )
    campaign = db.one(f"{_LIST_SQL} WHERE c.id = :id GROUP BY c.id", {"id": new_id})
    return ok({"campaign": campaign}, 201)


@router.post("/ai/generate-email")
def ai_generate_email(
    body: CampaignAIEmailIn,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    from ..services.ai_provider import get_provider
    provider = get_provider()
    result = provider.email_generation({
        "lead_name": body.leadName,
        "course_interest": body.courseInterest or "your program",
        "tone": body.tone,
    })
    return ok(result)
