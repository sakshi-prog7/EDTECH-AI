"""Courses — list (search/category/status + pagination), categories, get,
create/update/delete (admin only).
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

router = APIRouter(prefix="/api/courses", tags=["courses"])


class CourseIn(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    title: str = Field(min_length=3, max_length=120)
    category: str = Field(min_length=2, max_length=60)
    durationWeeks: int = Field(ge=1, le=156)
    fees: float = Field(ge=0)
    mode: str | None = Field(default=None, max_length=30)
    capacity: int | None = Field(default=None, ge=1)
    instructor: str | None = Field(default=None, max_length=100)
    eligibility: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: str = Field(default="active")


def _list_courses(search: str | None, category: str | None, status: str | None,
                  limit: int, offset: int) -> dict:
    where: list[str] = []
    params: dict = {"limit": limit, "offset": offset}
    if search:
        where.append("(title LIKE :search OR code LIKE :search OR category LIKE :search)")
        params["search"] = f"%{search}%"
    if category:
        where.append("category = :category")
        params["category"] = category
    if status:
        where.append("status = :status")
        params["status"] = status
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    total = db.scalar(f"SELECT COUNT(*) AS n FROM courses {where_sql}", params)
    items = db.q(
        f"SELECT * FROM courses {where_sql} ORDER BY title ASC LIMIT :limit OFFSET :offset",
        params,
    )
    return {"items": items, "total": total}


@router.get("")
def list_courses(
    _user: CurrentUser,
    search: str | None = None,
    category: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_courses(search=search, category=category, status=status,
                           limit=pageSize, offset=(page - 1) * pageSize)
    return ok(
        {
            "items": result["items"],
            "total": result["total"],
            "page": page,
            "pageSize": pageSize,
            "pages": (result["total"] + pageSize - 1) // pageSize,
        }
    )


@router.get("/categories")
def course_categories(_user: CurrentUser):
    rows = db.q("SELECT DISTINCT category FROM courses ORDER BY category")
    return ok({"categories": [r["category"] for r in rows]})


@router.get("/{course_id}")
def get_course(course_id: str, _user: CurrentUser):
    course = db.one("SELECT * FROM courses WHERE id = :id", {"id": course_id})
    if not course:
        raise AppError("Course not found.", 404, "NOT_FOUND")
    return ok({"course": course})


@router.post("", status_code=201)
def create_course(
    body: CourseIn, _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "COUNSELOR", "ADMISSIONS"))]
):
    code = body.code.strip().upper()
    if db.one("SELECT id FROM courses WHERE code = :code", {"code": code}):
        raise AppError("A course with this code already exists.", 409, "CONFLICT")
    course_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO courses (id, code, title, category, duration_weeks, fees, mode, capacity, instructor, eligibility, description, status, created_at, updated_at) "
        "VALUES (:id, :code, :title, :category, :dur, :fees, :mode, :capacity, :instructor, :elig, :desc, :status, :now, :now)",
        {
            "id": course_id,
            "code": code,
            "title": body.title.strip(),
            "category": body.category.strip(),
            "dur": body.durationWeeks,
            "fees": body.fees,
            "mode": (body.mode or "").strip() or None,
            "capacity": body.capacity,
            "instructor": (body.instructor or "").strip() or None,
            "elig": (body.eligibility or "").strip() or None,
            "desc": (body.description or "").strip() or None,
            "status": body.status,
            "now": now,
        },
    )
    course = db.one("SELECT * FROM courses WHERE id = :id", {"id": course_id})
    log_audit(_user.id, "create", "course", course_id, {"code": code, "title": body.title.strip()})
    return ok({"course": course}, 201)


class CoursePatch(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=20)
    title: str | None = Field(default=None, min_length=3, max_length=120)
    category: str | None = Field(default=None, min_length=2, max_length=60)
    durationWeeks: int | None = Field(default=None, ge=1, le=156)
    fees: float | None = Field(default=None, ge=0)
    mode: str | None = Field(default=None, max_length=30)
    capacity: int | None = Field(default=None, ge=1)
    instructor: str | None = Field(default=None, max_length=100)
    eligibility: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = None


@router.patch("/{course_id}")
def update_course(
    course_id: str,
    body: CoursePatch,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "COUNSELOR", "ADMISSIONS"))],
):
    current = db.one("SELECT * FROM courses WHERE id = :id", {"id": course_id})
    if not current:
        raise AppError("Course not found.", 404, "NOT_FOUND")

    def _pick(value, current, empty_to_none=False):
        if value is None:
            return current
        return (value or "").strip() or None if empty_to_none else value

    code = _pick(body.code, current["code"]).strip().upper() if body.code else current["code"]
    if code != current["code"] and db.one("SELECT id FROM courses WHERE code = :code", {"code": code}):
        raise AppError("A course with this code already exists.", 409, "CONFLICT")

    db.execute(
        "UPDATE courses SET code = :code, title = :title, category = :category, duration_weeks = :dur, "
        "fees = :fees, mode = :mode, capacity = :capacity, instructor = :instructor, "
        "eligibility = :elig, description = :desc, status = :status, updated_at = :now WHERE id = :id",
        {
            "id": course_id,
            "code": code,
            "title": _pick(body.title, current["title"]),
            "category": _pick(body.category, current["category"]),
            "dur": _pick(body.durationWeeks, current["duration_weeks"]),
            "fees": _pick(body.fees, current["fees"]),
            "mode": _pick(body.mode, current.get("mode"), empty_to_none=True) if current.get("mode") is not None or body.mode is not None else None,
            "capacity": _pick(body.capacity, current.get("capacity")) if current.get("capacity") is not None or body.capacity is not None else None,
            "instructor": _pick(body.instructor, current.get("instructor"), empty_to_none=True) if current.get("instructor") is not None or body.instructor is not None else None,
            "elig": _pick(body.eligibility, current["eligibility"], empty_to_none=True),
            "desc": _pick(body.description, current["description"], empty_to_none=True),
            "status": _pick(body.status, current["status"]),
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    course = db.one("SELECT * FROM courses WHERE id = :id", {"id": course_id})
    log_audit(_user.id, "update", "course", course_id)
    return ok({"course": course})


@router.delete("/{course_id}")
def delete_course(
    course_id: str, _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "COUNSELOR", "ADMISSIONS"))]
):
    if not db.one("SELECT id FROM courses WHERE id = :id", {"id": course_id}):
        raise AppError("Course not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM courses WHERE id = :id", {"id": course_id})
    log_audit(_user.id, "delete", "course", course_id)
    return ok({"message": "Course deleted."})
