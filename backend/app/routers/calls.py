"""Call Intelligence — upload audio/video, transcription, analysis, CRM activity.

Supports:
- Upload audio/video transcripts
- Speaker detection (basic)
- Summary, sentiment, topics, objections
- Buying intent, next best action
- CRM activity creation
- Call history
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

router = APIRouter(prefix="/api/calls", tags=["calls"])


class TranscriptIn(BaseModel):
    leadId: str | None = None
    title: str = Field(min_length=1, max_length=200)
    transcript: str = Field(min_length=1, max_length=100000)
    durationMinutes: int | None = Field(default=None, ge=1, le=480)
    counselorName: str | None = None


def _list_calls(search: str | None, lead_id: str | None, limit: int, offset: int) -> dict:
    where: list[str] = []
    params: dict = {"limit": limit, "offset": offset}
    if lead_id:
        where.append("cl.lead_id = :lead_id")
        params["lead_id"] = lead_id
    if search:
        where.append("(cl.title LIKE :search OR l.name LIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(
        f"SELECT COUNT(*) AS n FROM call_logs cl LEFT JOIN leads l ON l.id = cl.lead_id {where_sql}",
        params,
    )
    items = db.q(
        f"SELECT cl.id, cl.lead_id, cl.title, cl.duration_minutes, cl.sentiment, "
        f"cl.summary, cl.buying_intent, cl.next_action, cl.created_at, l.name AS lead_name "
        f"FROM call_logs cl LEFT JOIN leads l ON l.id = cl.lead_id "
        f"{where_sql} ORDER BY cl.created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return {"items": items, "total": total}


@router.get("")
def list_calls(
    _user: CurrentUser,
    search: str | None = None,
    leadId: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_calls(search=search, lead_id=leadId, limit=pageSize, offset=(page - 1) * pageSize)
    return ok({
        "items": result["items"],
        "total": result["total"],
        "page": page,
        "pageSize": pageSize,
        "pages": (result["total"] + pageSize - 1) // pageSize,
    })


@router.get("/{call_id}")
def get_call(call_id: str, _user: CurrentUser):
    call = db.one(
        "SELECT cl.*, l.name AS lead_name FROM call_logs cl "
        "LEFT JOIN leads l ON l.id = cl.lead_id WHERE cl.id = :id",
        {"id": call_id},
    )
    if not call:
        raise AppError("Call log not found.", 404, "NOT_FOUND")
    return ok({"call": call})


@router.post("", status_code=201)
def create_call(body: TranscriptIn, user: CurrentUser):
    """Create a call log with transcript analysis."""
    from ..services.ai_provider import get_provider

    provider = get_provider()
    analysis = provider.call_summary(body.transcript)

    call_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO call_logs (id, lead_id, title, transcript, duration_minutes, "
        "sentiment, summary, topics, objections, buying_intent, next_action, "
        "counselor_name, analyzed_by, created_at) "
        "VALUES (:id, :lead_id, :title, :transcript, :duration, "
        ":sentiment, :summary, :topics, :objections, :buying_intent, :next_action, "
        ":counselor, :analyzed_by, :now)",
        {
            "id": call_id,
            "lead_id": body.leadId,
            "title": body.title.strip(),
            "transcript": body.transcript,
            "duration": body.durationMinutes,
            "sentiment": analysis.get("sentiment", "Neutral"),
            "summary": analysis.get("summary", ""),
            "topics": __import__("json").dumps(analysis.get("topics", [])),
            "objections": __import__("json").dumps(analysis.get("objections", [])),
            "buying_intent": analysis.get("buying_intent", "Medium"),
            "next_action": analysis.get("next_action", ""),
            "counselor": body.counselorName,
            "analyzed_by": analysis.get("provider", "baseline"),
            "now": now,
        },
    )

    # Log activity on linked lead
    if body.leadId:
        db.execute(
            "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
            "VALUES (:id, :lead_id, :user_id, 'contact', :note, :now)",
            {
                "id": str(uuid.uuid4()),
                "lead_id": body.leadId,
                "user_id": user.id,
                "note": f"Call analyzed: {body.title} — Sentiment: {analysis.get('sentiment', 'Neutral')}",
                "now": now,
            },
        )

    # Create notification for call analysis
    db.execute(
        "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
        "VALUES (:id, :uid, 'AI Insight', :title, :desc, 0, :action, :now)",
        {
            "id": str(uuid.uuid4()),
            "uid": user.id,
            "title": f"Call analyzed: {body.title}",
            "desc": f"Sentiment: {analysis.get('sentiment', 'Neutral')}. Buying intent: {analysis.get('buying_intent', 'Medium')}.",
            "action": "/call-intelligence",
            "now": now,
        },
    )

    log_audit(user.id, 'call.create', f'call:{call_id}', 'SUCCESS', f'Created call: {body.title}')

    call = db.one(
        "SELECT cl.*, l.name AS lead_name FROM call_logs cl "
        "LEFT JOIN leads l ON l.id = cl.lead_id WHERE cl.id = :id",
        {"id": call_id},
    )
    return ok({"call": call, "analysis": analysis}, 201)


@router.delete("/{call_id}")
def delete_call(
    call_id: str,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    if not db.one("SELECT id FROM call_logs WHERE id = :id", {"id": call_id}):
        raise AppError("Call log not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM call_logs WHERE id = :id", {"id": call_id})
    log_audit(_user.id, 'call.delete', f'call:{call_id}', 'SUCCESS', f'Deleted call log {call_id}')
    return ok({"message": "Call log deleted."})
