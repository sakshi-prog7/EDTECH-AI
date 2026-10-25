"""Students — list (search/pagination), detail (with linked lead + enrollments),
create, update, delete (admin/admissions only).

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

router = APIRouter(prefix="/api/students", tags=["students"])


def _log_audit(user_id: str, action: str, resource_id: str | None = None, meta: dict | None = None) -> None:
    db.execute(
        "INSERT INTO audit_logs (id, user_id, action, resource, resource_id, ip_address, meta, created_at) "
        "VALUES (:id, :user_id, :action, 'student', :resource_id, NULL, :meta, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "resource_id": resource_id,
            "meta": json.dumps(meta) if meta else None,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )

_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
_UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


class StudentIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str | None = Field(default=None, pattern=_EMAIL)
    phone: str | None = Field(default=None, max_length=30)
    academicLevel: str | None = Field(default=None, max_length=80)
    interests: str | None = Field(default=None, max_length=500)
    leadId: str | None = Field(default=None, pattern=_UUID)


def _list_students(search: str | None, limit: int, offset: int) -> dict:
    where = ""
    params: dict = {"limit": limit, "offset": offset}
    if search:
        where = "WHERE (name LIKE :search OR email LIKE :search OR interests LIKE :search)"
        params["search"] = f"%{search}%"
    total = db.scalar(f"SELECT COUNT(*) AS n FROM students {where}", params)
    items = db.q(
        f"SELECT * FROM students {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return {"items": items, "total": total}


@router.get("")
def list_students(
    _user: CurrentUser,
    search: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_students(search=search, limit=pageSize, offset=(page - 1) * pageSize)
    return ok(
        {
            "items": result["items"],
            "total": result["total"],
            "page": page,
            "pageSize": pageSize,
            "pages": (result["total"] + pageSize - 1) // pageSize,
        }
    )


@router.get("/{student_id}")
def get_student(student_id: str, _user: CurrentUser):
    student = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    if not student:
        raise AppError("Student not found.", 404, "NOT_FOUND")
    lead = (
        db.one(
            "SELECT id, name, email, status, score, source FROM leads WHERE id = :id",
            {"id": student["lead_id"]},
        )
        if student["lead_id"]
        else None
    )
    enrollments = db.q(
        "SELECT e.id, e.status, e.application_date, e.enrollment_date, e.payment_status, "
        "c.code, c.title, c.fees FROM enrollments e JOIN courses c ON c.id = e.course_id "
        "WHERE e.student_id = :id ORDER BY e.created_at DESC",
        {"id": student_id},
    )
    return ok({"student": student, "lead": lead, "enrollments": enrollments})


@router.post("", status_code=201)
def create_student(body: StudentIn, user: CurrentUser):
    student_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO students (id, name, email, phone, academic_level, interests, lead_id, created_at, updated_at) "
        "VALUES (:id, :name, :email, :phone, :level, :interests, :lead_id, :now, :now)",
        {
            "id": student_id,
            "name": body.name.strip(),
            "email": (body.email or "").strip() or None,
            "phone": (body.phone or "").strip() or None,
            "level": (body.academicLevel or "").strip() or None,
            "interests": (body.interests or "").strip() or None,
            "lead_id": body.leadId,
            "now": now,
        },
    )
    student = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    # Log activity for recent activities feed
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, :lead_id, :user_id, 'student', :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "lead_id": body.leadId,
            "user_id": user.id,
            "note": f"New student created: {body.name.strip()}.",
            "now": now,
        },
    )
    _log_audit(user.id, "create", student_id, {"name": body.name.strip()})
    return ok({"student": student}, 201)


class StudentPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    email: str | None = Field(default=None, pattern=_EMAIL)
    phone: str | None = Field(default=None, max_length=30)
    academicLevel: str | None = Field(default=None, max_length=80)
    interests: str | None = Field(default=None, max_length=500)
    leadId: str | None = Field(default=None, pattern=_UUID)


@router.patch("/{student_id}")
def update_student(student_id: str, body: StudentPatch, user: CurrentUser):
    current = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    if not current:
        raise AppError("Student not found.", 404, "NOT_FOUND")

    def _pick(value, current, empty_to_none=False):
        if value is None:
            return current
        return (value or "").strip() or None if empty_to_none else value

    db.execute(
        "UPDATE students SET name = :name, email = :email, phone = :phone, academic_level = :level, "
        "interests = :interests, lead_id = :lead_id, updated_at = :now WHERE id = :id",
        {
            "id": student_id,
            "name": _pick(body.name, current["name"]),
            "email": _pick(body.email, current["email"], empty_to_none=True),
            "phone": _pick(body.phone, current["phone"], empty_to_none=True),
            "level": _pick(body.academicLevel, current["academic_level"], empty_to_none=True),
            "interests": _pick(body.interests, current["interests"], empty_to_none=True),
            "lead_id": body.leadId if body.leadId is not None else current["lead_id"],
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    student = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    _log_audit(user.id, "update", student_id)
    return ok({"student": student})


@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    if not db.one("SELECT id FROM students WHERE id = :id", {"id": student_id}):
        raise AppError("Student not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM students WHERE id = :id", {"id": student_id})
    _log_audit(user.id, "delete", student_id)
    return ok({"message": "Student deleted."})
