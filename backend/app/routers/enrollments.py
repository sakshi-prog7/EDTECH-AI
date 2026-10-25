"""Enrollments — list (status/search + pagination), stats, get, create, and
funnel transitions that mirror the new stage onto the linked lead.
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

router = APIRouter(prefix="/api/enrollments", tags=["enrollments"])

STATUSES = ["lead", "qualified", "application", "enrolled"]
_UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"

_ENROLLMENT_LIST_SQL = (
    "SELECT e.*, l.name AS lead_name, s.name AS student_name, c.code AS course_code, "
    "c.title AS course_title, u.name AS counselor_name "
    "FROM enrollments e "
    "LEFT JOIN leads l ON l.id = e.lead_id "
    "LEFT JOIN students s ON s.id = e.student_id "
    "LEFT JOIN courses c ON c.id = e.course_id "
    "LEFT JOIN users u ON u.id = e.counselor_id "
)


class EnrollmentIn(BaseModel):
    leadId: str | None = Field(default=None, pattern=_UUID)
    studentId: str | None = Field(default=None, pattern=_UUID)
    courseId: str = Field(pattern=_UUID)
    status: str = Field(default="lead")


class TransitionIn(BaseModel):
    status: str


def _list_enrollments(status: str | None, search: str | None, limit: int, offset: int) -> dict:
    where: list[str] = []
    params: dict = {"limit": limit, "offset": offset}
    if status:
        where.append("e.status = :status")
        params["status"] = status
    if search:
        where.append("(l.name LIKE :search OR s.name LIKE :search OR c.title LIKE :search OR c.code LIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(f"SELECT COUNT(*) AS n FROM enrollments e {where_sql}", params)
    items = db.q(
        f"{_ENROLLMENT_LIST_SQL} {where_sql} ORDER BY e.created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return {"items": items, "total": total}


@router.get("")
def list_enrollments(
    _user: CurrentUser,
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_enrollments(status=status, search=search, limit=pageSize, offset=(page - 1) * pageSize)
    return ok(
        {
            "items": result["items"],
            "total": result["total"],
            "page": page,
            "pageSize": pageSize,
            "pages": (result["total"] + pageSize - 1) // pageSize,
        }
    )


@router.get("/stats")
def enrollment_stats(_user: CurrentUser):
    rows = db.q("SELECT status, COUNT(*) AS count FROM enrollments GROUP BY status")
    return ok({"byStatus": rows})


@router.get("/{enrollment_id}")
def get_enrollment(enrollment_id: str, _user: CurrentUser):
    enrollment = db.one(f"{_ENROLLMENT_LIST_SQL} WHERE e.id = :id", {"id": enrollment_id})
    if not enrollment:
        raise AppError("Enrollment not found.", 404, "NOT_FOUND")
    return ok({"enrollment": enrollment})


@router.post("", status_code=201)
def create_enrollment(body: EnrollmentIn, user: CurrentUser):
    if not (body.leadId or body.studentId):
        raise AppError("Provide either leadId or studentId.", 422, "VALIDATION_ERROR")
    if body.leadId and not db.one("SELECT id FROM leads WHERE id = :id", {"id": body.leadId}):
        raise AppError("Lead not found.", 404, "NOT_FOUND")
    if body.studentId and not db.one("SELECT id FROM students WHERE id = :id", {"id": body.studentId}):
        raise AppError("Student not found.", 404, "NOT_FOUND")
    if not db.one("SELECT id FROM courses WHERE id = :id", {"id": body.courseId}):
        raise AppError("Course not found.", 404, "NOT_FOUND")

    now = datetime.now(timezone.utc).isoformat()
    application_date = now[:10] if body.status in ("application", "enrolled") else None
    enrollment_date = now[:10] if body.status == "enrolled" else None
    enrollment_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO enrollments (id, lead_id, student_id, course_id, status, application_date, enrollment_date, "
        "counselor_id, payment_status, created_at, updated_at) "
        "VALUES (:id, :lead_id, :student_id, :course_id, :status, :applied, :enrolled, :counselor, 'pending', :now, :now)",
        {
            "id": enrollment_id,
            "lead_id": body.leadId,
            "student_id": body.studentId,
            "course_id": body.courseId,
            "status": body.status,
            "applied": application_date,
            "enrolled": enrollment_date,
            "counselor": user.id,
            "now": now,
        },
    )
    if body.leadId:
        db.execute(
            "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
            "VALUES (:id, :lead_id, :user_id, 'application', :note, :now)",
            {
                "id": str(uuid.uuid4()),
                "lead_id": body.leadId,
                "user_id": user.id,
                "note": f"Enrollment record created (stage: {body.status}).",
                "now": now,
            },
        )
    # Notification for enrollment creation
    db.execute(
        "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
        "VALUES (:id, :uid, 'System', :title, :desc, 0, '/enrollment-pipeline', :now)",
        {
            "id": str(uuid.uuid4()),
            "uid": user.id,
            "title": f"Enrollment created ({body.status})",
            "desc": f"New enrollment record at stage: {body.status}.",
            "now": now,
        },
    )
    enrollment = db.one(f"{_ENROLLMENT_LIST_SQL} WHERE e.id = :id", {"id": enrollment_id})
    log_audit(user.id, "create", "enrollment", enrollment_id, {"status": body.status, "courseId": body.courseId})
    return ok({"enrollment": enrollment}, 201)


@router.patch("/{enrollment_id}/status")
def transition_status(
    enrollment_id: str,
    body: TransitionIn,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS", "COUNSELOR"))],
):
    current = db.one(f"{_ENROLLMENT_LIST_SQL} WHERE e.id = :id", {"id": enrollment_id})
    if not current:
        raise AppError("Enrollment not found.", 404, "NOT_FOUND")

    now = datetime.now(timezone.utc).isoformat()
    application_date = (
        current["application_date"] or now[:10]
        if body.status in ("application", "enrolled")
        else current["application_date"]
    )
    enrollment_date = (
        current["enrollment_date"] or now[:10]
        if body.status == "enrolled"
        else current["enrollment_date"]
    )
    db.execute(
        "UPDATE enrollments SET status = :status, application_date = :applied, enrollment_date = :enrolled, updated_at = :now WHERE id = :id",
        {
            "id": enrollment_id,
            "status": body.status,
            "applied": application_date,
            "enrolled": enrollment_date,
            "now": now,
        },
    )
    if current["lead_id"]:
        lead_status = (
            "CONVERTED" if body.status == "enrolled"
            else "QUALIFIED" if body.status == "application"
            else "CONTACTED" if body.status == "qualified"
            else "NEW"
        )
        db.execute(
            "UPDATE leads SET status = :status, updated_at = :now WHERE id = :id",
            {"status": lead_status, "now": now, "id": current["lead_id"]},
        )
        db.execute(
            "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
            "VALUES (:id, :lead_id, :user_id, :kind, :note, :now)",
            {
                "id": str(uuid.uuid4()),
                "lead_id": current["lead_id"],
                "user_id": user.id,
                "kind": "enrollment" if body.status == "enrolled" else "application",
                "note": f"Enrollment moved from {current['status']} to {body.status}.",
                "now": now,
            },
        )
    # Notification for enrollment transition
    if body.status == "enrolled":
        db.execute(
            "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
            "VALUES (:id, :uid, 'AI Insight', :title, :desc, 0, '/enrollment-pipeline', :now)",
            {
                "id": str(uuid.uuid4()),
                "uid": user.id,
                "title": f"Enrollment confirmed: {current.get('lead_name') or 'Student'}",
                "desc": f"Moved from {current['status']} to {body.status}.",
                "now": now,
            },
        )
    enrollment = db.one(f"{_ENROLLMENT_LIST_SQL} WHERE e.id = :id", {"id": enrollment_id})
    log_audit(user.id, "update", "enrollment", enrollment_id, {"from": current["status"], "to": body.status})
    return ok({"enrollment": enrollment})
