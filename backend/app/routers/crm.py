"""CRM modules — opportunities, tasks, meetings (full CRUD) and counselor
performance. Tasks/meetings/opportunity updates log activity on the linked
lead; deletes are role-gated.
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

router = APIRouter(prefix="/api/crm", tags=["crm"])

_UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
_DATETIME = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$"


def _paginated(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


def _add_activity(lead_id: str | None, user_id: str, kind: str, note: str) -> None:
    if not lead_id:
        return
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, :lead_id, :user_id, :kind, :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "user_id": user_id,
            "kind": kind,
            "note": note,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )


# ============================ Opportunities ============================ #
OPP_STAGES = ["discovery", "proposal", "negotiation", "won", "lost"]


class OpportunityIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    leadId: str | None = Field(default=None, pattern=_UUID)
    value: float = Field(default=0, ge=0)
    stage: str = Field(default="discovery")
    expectedClose: str | None = Field(default=None, pattern=_DATETIME)
    ownerId: str | None = Field(default=None, pattern=_UUID)
    notes: str | None = Field(default=None, max_length=2000)


class OpportunityPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    leadId: str | None = Field(default=None, pattern=_UUID)
    value: float | None = Field(default=None, ge=0)
    stage: str | None = None
    expectedClose: str | None = Field(default=None, pattern=_DATETIME)
    ownerId: str | None = Field(default=None, pattern=_UUID)
    notes: str | None = Field(default=None, max_length=2000)


@router.get("/counselors")
def counselor_performance(_user: CurrentUser):
    rows = db.q(
        "SELECT u.id AS user_id, u.name, u.email, u.role, "
        "COUNT(l.id) AS leads, "
        "COALESCE(SUM(CASE WHEN l.status IN ('QUALIFIED','NURTURING','CONVERTED') THEN 1 ELSE 0 END), 0) AS qualified, "
        "COALESCE(SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END), 0) AS converted, "
        "(SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status IN ('pending','in_progress')) AS open_tasks, "
        "CASE WHEN COUNT(l.id) > 0 THEN ROUND(100.0 * SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) / COUNT(l.id), 1) "
        "ELSE NULL END AS conversion_rate "
        "FROM users u LEFT JOIN leads l ON l.counselor_id = u.id AND l.archived = 0 "
        "WHERE u.role IN ('COUNSELOR','ADMISSIONS') GROUP BY u.id "
        "ORDER BY conversion_rate DESC NULLS LAST, leads DESC"
    )
    return ok({"counselors": rows})


@router.get("/opportunities")
def list_opportunities(
    _user: CurrentUser,
    search: str | None = None,
    stage: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where: list[str] = []
    params: dict = {"limit": pageSize, "offset": (page - 1) * pageSize}
    if stage:
        where.append("o.stage = :stage")
        params["stage"] = stage
    if search:
        where.append("(o.name LIKE :search OR l.name LIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(
        f"SELECT COUNT(*) AS n FROM opportunities o LEFT JOIN leads l ON l.id = o.lead_id {where_sql}",
        params,
    )
    items = db.q(
        f"SELECT o.*, l.name AS lead_name, u.name AS owner_name FROM opportunities o "
        f"LEFT JOIN leads l ON l.id = o.lead_id LEFT JOIN users u ON u.id = o.owner_id "
        f"{where_sql} ORDER BY o.updated_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return ok(_paginated(items, total, page, pageSize))


@router.get("/opportunities/{item_id}")
def get_opportunity(item_id: str, _user: CurrentUser):
    item = db.one(
        "SELECT o.*, l.name AS lead_name, u.name AS owner_name FROM opportunities o "
        "LEFT JOIN leads l ON l.id = o.lead_id LEFT JOIN users u ON u.id = o.owner_id WHERE o.id = :id",
        {"id": item_id},
    )
    if not item:
        raise AppError("Opportunity not found.", 404, "NOT_FOUND")
    return ok({"opportunity": item})


@router.post("/opportunities", status_code=201)
def create_opportunity(body: OpportunityIn, user: CurrentUser):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO opportunities (id, name, lead_id, value, stage, expected_close, owner_id, notes, created_at, updated_at) "
        "VALUES (:id, :name, :lead_id, :value, :stage, :expected_close, :owner_id, :notes, :now, :now)",
        {
            "id": item_id,
            "name": body.name.strip(),
            "lead_id": body.leadId,
            "value": body.value,
            "stage": body.stage,
            "expected_close": body.expectedClose,
            "owner_id": body.ownerId,
            "notes": body.notes,
            "now": now,
        },
    )
    _add_activity(body.leadId, user.id, "contact",
                  f'Opportunity "{body.name.strip()}" created ({body.stage}).')
    log_audit(user.id, 'opportunity.create', f'opportunity:{item_id}', 'SUCCESS', f'Created opportunity: {body.name.strip()}')
    item = db.one(
        "SELECT o.*, l.name AS lead_name, u.name AS owner_name FROM opportunities o "
        "LEFT JOIN leads l ON l.id = o.lead_id LEFT JOIN users u ON u.id = o.owner_id WHERE o.id = :id",
        {"id": item_id},
    )
    return ok({"opportunity": item}, 201)


@router.patch("/opportunities/{item_id}")
def update_opportunity(item_id: str, body: OpportunityPatch, user: CurrentUser):
    current = db.one(
        "SELECT o.*, l.name AS lead_name, u.name AS owner_name FROM opportunities o "
        "LEFT JOIN leads l ON l.id = o.lead_id LEFT JOIN users u ON u.id = o.owner_id WHERE o.id = :id",
        {"id": item_id},
    )
    if not current:
        raise AppError("Opportunity not found.", 404, "NOT_FOUND")

    def _pick(value, current):
        return current if value is None else value

    db.execute(
        "UPDATE opportunities SET name = :name, lead_id = :lead_id, value = :value, stage = :stage, "
        "expected_close = :expected_close, owner_id = :owner_id, notes = :notes, updated_at = :now WHERE id = :id",
        {
            "id": item_id,
            "name": _pick(body.name, current["name"]),
            "lead_id": _pick(body.leadId, current["lead_id"]),
            "value": _pick(body.value, current["value"]),
            "stage": _pick(body.stage, current["stage"]),
            "expected_close": _pick(body.expectedClose, current["expected_close"]),
            "owner_id": _pick(body.ownerId, current["owner_id"]),
            "notes": _pick(body.notes, current["notes"]),
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    if body.stage is not None and body.stage != current["stage"]:
        _add_activity(current["lead_id"], user.id, "contact",
                      f'Opportunity moved to "{body.stage}".')
    item = db.one(
        "SELECT o.*, l.name AS lead_name, u.name AS owner_name FROM opportunities o "
        "LEFT JOIN leads l ON l.id = o.lead_id LEFT JOIN users u ON u.id = o.owner_id WHERE o.id = :id",
        {"id": item_id},
    )
    return ok({"opportunity": item})


@router.delete("/opportunities/{item_id}")
def delete_opportunity(
    item_id: str,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    if not db.one("SELECT id FROM opportunities WHERE id = :id", {"id": item_id}):
        raise AppError("Opportunity not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM opportunities WHERE id = :id", {"id": item_id})
    log_audit(_user.id, 'opportunity.delete', f'opportunity:{item_id}', 'SUCCESS', f'Deleted opportunity {item_id}')
    return ok({"message": "Opportunity deleted."})


# ================================ Tasks ================================ #
TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"]
TASK_PRIORITIES = ["Low", "Medium", "High"]


class TaskIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    leadId: str | None = Field(default=None, pattern=_UUID)
    dueDate: str | None = Field(default=None, pattern=_DATETIME)
    status: str = Field(default="pending")
    priority: str = Field(default="Medium")
    assigneeId: str | None = Field(default=None, pattern=_UUID)
    notes: str | None = Field(default=None, max_length=2000)


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    leadId: str | None = Field(default=None, pattern=_UUID)
    dueDate: str | None = Field(default=None, pattern=_DATETIME)
    status: str | None = None
    priority: str | None = None
    assigneeId: str | None = Field(default=None, pattern=_UUID)
    notes: str | None = Field(default=None, max_length=2000)


@router.get("/tasks")
def list_tasks(
    _user: CurrentUser,
    search: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where: list[str] = []
    params: dict = {"limit": pageSize, "offset": (page - 1) * pageSize}
    if status:
        where.append("t.status = :status")
        params["status"] = status
    if search:
        where.append("(t.title LIKE :search OR l.name LIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(
        f"SELECT COUNT(*) AS n FROM tasks t LEFT JOIN leads l ON l.id = t.lead_id {where_sql}",
        params,
    )
    items = db.q(
        f"SELECT t.*, l.name AS lead_name, u.name AS assignee_name FROM tasks t "
        f"LEFT JOIN leads l ON l.id = t.lead_id LEFT JOIN users u ON u.id = t.assignee_id "
        f"{where_sql} ORDER BY t.due_date IS NULL, t.due_date ASC LIMIT :limit OFFSET :offset",
        params,
    )
    counts = db.q("SELECT status, COUNT(*) AS count FROM tasks GROUP BY status")
    return ok({**_paginated(items, total, page, pageSize), "counts": counts})


@router.get("/tasks/{item_id}")
def get_task(item_id: str, _user: CurrentUser):
    item = db.one(
        "SELECT t.*, l.name AS lead_name, u.name AS assignee_name FROM tasks t "
        "LEFT JOIN leads l ON l.id = t.lead_id LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = :id",
        {"id": item_id},
    )
    if not item:
        raise AppError("Task not found.", 404, "NOT_FOUND")
    return ok({"task": item})


@router.post("/tasks", status_code=201)
def create_task(body: TaskIn, user: CurrentUser):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO tasks (id, title, lead_id, due_date, status, priority, assignee_id, notes, created_at, updated_at) "
        "VALUES (:id, :title, :lead_id, :due, :status, :priority, :assignee, :notes, :now, :now)",
        {
            "id": item_id,
            "title": body.title.strip(),
            "lead_id": body.leadId,
            "due": body.dueDate,
            "status": body.status,
            "priority": body.priority,
            "assignee": body.assigneeId,
            "notes": body.notes,
            "now": now,
        },
    )
    _add_activity(body.leadId, user.id, "followup", f'Task "{body.title.strip()}" created.')
    log_audit(user.id, 'task.create', f'task:{item_id}', 'SUCCESS', f'Created task: {body.title.strip()}')
    item = db.one(
        "SELECT t.*, l.name AS lead_name, u.name AS assignee_name FROM tasks t "
        "LEFT JOIN leads l ON l.id = t.lead_id LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = :id",
        {"id": item_id},
    )
    return ok({"task": item}, 201)


@router.patch("/tasks/{item_id}")
def update_task(item_id: str, body: TaskPatch, user: CurrentUser):
    current = db.one(
        "SELECT t.*, l.name AS lead_name, u.name AS assignee_name FROM tasks t "
        "LEFT JOIN leads l ON l.id = t.lead_id LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = :id",
        {"id": item_id},
    )
    if not current:
        raise AppError("Task not found.", 404, "NOT_FOUND")

    def _pick(value, current):
        return current if value is None else value

    db.execute(
        "UPDATE tasks SET title = :title, lead_id = :lead_id, due_date = :due, status = :status, "
        "priority = :priority, assignee_id = :assignee, notes = :notes, updated_at = :now WHERE id = :id",
        {
            "id": item_id,
            "title": _pick(body.title, current["title"]),
            "lead_id": _pick(body.leadId, current["lead_id"]),
            "due": _pick(body.dueDate, current["due_date"]),
            "status": _pick(body.status, current["status"]),
            "priority": _pick(body.priority, current["priority"]),
            "assignee": _pick(body.assigneeId, current["assignee_id"]),
            "notes": _pick(body.notes, current["notes"]),
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    if body.status is not None and body.status != current["status"]:
        _add_activity(current["lead_id"], user.id, "followup",
                      f'Task "{current["title"]}" marked {body.status.replace("_", " ")}.')
    item = db.one(
        "SELECT t.*, l.name AS lead_name, u.name AS assignee_name FROM tasks t "
        "LEFT JOIN leads l ON l.id = t.lead_id LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = :id",
        {"id": item_id},
    )
    return ok({"task": item})


@router.delete("/tasks/{item_id}")
def delete_task(item_id: str, _user: CurrentUser):
    if not db.one("SELECT id FROM tasks WHERE id = :id", {"id": item_id}):
        raise AppError("Task not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM tasks WHERE id = :id", {"id": item_id})
    log_audit(_user.id, 'task.delete', f'task:{item_id}', 'SUCCESS', f'Deleted task {item_id}')
    return ok({"message": "Task deleted."})


# =============================== Meetings ============================== #
MEETING_STATUSES = ["scheduled", "completed", "cancelled"]


class MeetingIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    leadId: str | None = Field(default=None, pattern=_UUID)
    scheduledAt: str = Field(pattern=_DATETIME)
    durationMin: int = Field(default=30, ge=5, le=480)
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    status: str = Field(default="scheduled")


class MeetingPatch(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    leadId: str | None = Field(default=None, pattern=_UUID)
    scheduledAt: str | None = Field(default=None, pattern=_DATETIME)
    durationMin: int | None = Field(default=None, ge=5, le=480)
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    status: str | None = None


@router.get("/meetings")
def list_meetings(
    _user: CurrentUser,
    search: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where: list[str] = []
    params: dict = {"limit": pageSize, "offset": (page - 1) * pageSize}
    if status:
        where.append("m.status = :status")
        params["status"] = status
    if search:
        where.append("(m.title LIKE :search OR l.name LIKE :search OR m.location LIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(f"SELECT COUNT(*) AS n FROM meetings m {where_sql}", params)
    items = db.q(
        f"SELECT m.*, l.name AS lead_name FROM meetings m LEFT JOIN leads l ON l.id = m.lead_id "
        f"{where_sql} ORDER BY m.scheduled_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return ok(_paginated(items, total, page, pageSize))


@router.get("/meetings/{item_id}")
def get_meeting(item_id: str, _user: CurrentUser):
    item = db.one(
        "SELECT m.*, l.name AS lead_name FROM meetings m LEFT JOIN leads l ON l.id = m.lead_id WHERE m.id = :id",
        {"id": item_id},
    )
    if not item:
        raise AppError("Meeting not found.", 404, "NOT_FOUND")
    return ok({"meeting": item})


@router.post("/meetings", status_code=201)
def create_meeting(body: MeetingIn, user: CurrentUser):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO meetings (id, title, lead_id, scheduled_at, duration_min, location, notes, status, created_at, updated_at) "
        "VALUES (:id, :title, :lead_id, :scheduled, :dur, :location, :notes, :status, :now, :now)",
        {
            "id": item_id,
            "title": body.title.strip(),
            "lead_id": body.leadId,
            "scheduled": body.scheduledAt,
            "dur": body.durationMin,
            "location": (body.location or "").strip() or None,
            "notes": body.notes,
            "status": body.status,
            "now": now,
        },
    )
    _add_activity(body.leadId, user.id, "contact", f'Meeting "{body.title.strip()}" scheduled.')
    log_audit(user.id, 'meeting.create', f'meeting:{item_id}', 'SUCCESS', f'Scheduled meeting: {body.title.strip()}')
    item = db.one(
        "SELECT m.*, l.name AS lead_name FROM meetings m LEFT JOIN leads l ON l.id = m.lead_id WHERE m.id = :id",
        {"id": item_id},
    )
    return ok({"meeting": item}, 201)


@router.patch("/meetings/{item_id}")
def update_meeting(item_id: str, body: MeetingPatch, user: CurrentUser):
    current = db.one(
        "SELECT m.*, l.name AS lead_name FROM meetings m LEFT JOIN leads l ON l.id = m.lead_id WHERE m.id = :id",
        {"id": item_id},
    )
    if not current:
        raise AppError("Meeting not found.", 404, "NOT_FOUND")

    def _pick(value, current, empty_to_none=False):
        if value is None:
            return current
        return (value or "").strip() or None if empty_to_none else value

    db.execute(
        "UPDATE meetings SET title = :title, lead_id = :lead_id, scheduled_at = :scheduled, duration_min = :dur, "
        "location = :location, notes = :notes, status = :status, updated_at = :now WHERE id = :id",
        {
            "id": item_id,
            "title": _pick(body.title, current["title"]),
            "lead_id": _pick(body.leadId, current["lead_id"]),
            "scheduled": _pick(body.scheduledAt, current["scheduled_at"]),
            "dur": _pick(body.durationMin, current["duration_min"]),
            "location": _pick(body.location, current["location"], empty_to_none=True),
            "notes": _pick(body.notes, current["notes"]),
            "status": _pick(body.status, current["status"]),
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    if body.status is not None and body.status != current["status"]:
        _add_activity(current["lead_id"], user.id, "contact",
                      f'Meeting "{current["title"]}" {body.status}.')
    item = db.one(
        "SELECT m.*, l.name AS lead_name FROM meetings m LEFT JOIN leads l ON l.id = m.lead_id WHERE m.id = :id",
        {"id": item_id},
    )
    return ok({"meeting": item})


@router.delete("/meetings/{item_id}")
def delete_meeting(
    item_id: str,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    if not db.one("SELECT id FROM meetings WHERE id = :id", {"id": item_id}):
        raise AppError("Meeting not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM meetings WHERE id = :id", {"id": item_id})
    log_audit(_user.id, 'meeting.delete', f'meeting:{item_id}', 'SUCCESS', f'Deleted meeting {item_id}')
    return ok({"message": "Meeting deleted."})


# ============================== Global Search ============================= #
@router.get("/search")
def global_search(
    q: str = Query(min_length=1, max_length=100),
    user: CurrentUser = None,  # noqa: B008
):
    """Search across leads, students, courses, enrollments, tasks, and meetings."""
    pattern = f"%{q.strip()}%"
    results: list[dict] = []

    # Leads
    leads = db.q(
        "SELECT id, name, email, status, source FROM leads WHERE archived = 0 "
        "AND (name LIKE :q OR email LIKE :q OR course_interest LIKE :q) LIMIT 5",
        {"q": pattern},
    )
    for lead in leads:
        results.append({"type": "lead", "id": lead["id"], "title": lead["name"],
                        "subtitle": f"{lead['status']} · {lead['source']}", "/to": "/leads"})

    # Students
    students = db.q(
        "SELECT id, name, email, interests FROM students "
        "WHERE (name LIKE :q OR email LIKE :q OR interests LIKE :q) LIMIT 5",
        {"q": pattern},
    )
    for s in students:
        results.append({"type": "student", "id": s["id"], "title": s["name"],
                        "subtitle": s.get("interests") or "", "/to": "/students"})

    # Courses
    courses = db.q(
        "SELECT id, code, title, category FROM courses WHERE status = 'active' "
        "AND (title LIKE :q OR code LIKE :q OR category LIKE :q) LIMIT 5",
        {"q": pattern},
    )
    for c in courses:
        results.append({"type": "course", "id": c["id"], "title": f"{c['code']} — {c['title']}",
                        "subtitle": c["category"], "/to": "/courses"})

    # Tasks
    tasks = db.q(
        "SELECT t.id, t.title, t.status FROM tasks t "
        "WHERE t.title LIKE :q LIMIT 5",
        {"q": pattern},
    )
    for t in tasks:
        results.append({"type": "task", "id": t["id"], "title": t["title"],
                        "subtitle": t["status"], "/to": "/tasks"})

    # Meetings
    meetings = db.q(
        "SELECT m.id, m.title, m.status FROM meetings m "
        "WHERE m.title LIKE :q OR m.location LIKE :q LIMIT 5",
        {"q": pattern},
    )
    for m in meetings:
        results.append({"type": "meeting", "id": m["id"], "title": m["title"],
                        "subtitle": m["status"], "/to": "/meetings"})

    return ok({"results": results, "total": len(results)})


# ========================== Counselors List =========================== #
@router.get("/counselors/list")
def list_counselors_list(_user: CurrentUser):
    """Lightweight list of counselors/admissions users for form dropdowns."""
    rows = db.q(
        "SELECT id, name, email, role FROM users "
        "WHERE role IN ('COUNSELOR','ADMISSIONS','ADMIN') AND is_active = 1 "
        "ORDER BY name ASC"
    )
    return ok({"users": rows})
