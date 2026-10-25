"""Data Import/Export — CSV import for leads, students, courses with validation.

Supports:
- CSV import with validation (total, valid, invalid, duplicates, errors)
- Downloadable error reports
- CSV export for all entity types
- Bulk operations
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..core.deps import AuthedUser, CurrentUser, require_roles
from ..core.errors import AppError, ok
from ..services import db_helpers as db

router = APIRouter(prefix="/api/data", tags=["data"])


# ── CSV Import ─────────────────────────────────────────────────────────────


class CsvImportIn(BaseModel):
    entityType: str = Field(pattern=r"^(leads|students|courses)$")
    csvData: str = Field(min_length=1, max_length=10_000_000)  # Max 10MB


def _validate_lead_row(row: dict, index: int) -> tuple[dict | None, str | None]:
    """Validate a lead row. Returns (valid_row, error_message)."""
    name = (row.get("name") or "").strip()
    if not name or len(name) < 2:
        return None, f"Row {index}: Name is required (min 2 characters)."
    email = (row.get("email") or "").strip()
    if email and not __import__("re").match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return None, f"Row {index}: Invalid email format."
    return {
        "name": name,
        "email": email or None,
        "phone": (row.get("phone") or "").strip() or None,
        "source": (row.get("source") or "Import").strip() or "Import",
        "status": (row.get("status") or "NEW").strip().upper() or "NEW",
        "priority": (row.get("priority") or "Medium").strip() or "Medium",
        "course_interest": (row.get("course_interest") or row.get("courseInterest") or "").strip() or None,
        "notes": (row.get("notes") or "").strip() or None,
    }, None


def _validate_student_row(row: dict, index: int) -> tuple[dict | None, str | None]:
    name = (row.get("name") or "").strip()
    if not name or len(name) < 2:
        return None, f"Row {index}: Name is required (min 2 characters)."
    email = (row.get("email") or "").strip()
    if email and not __import__("re").match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return None, f"Row {index}: Invalid email format."
    return {
        "name": name,
        "email": email or None,
        "phone": (row.get("phone") or "").strip() or None,
        "academic_level": (row.get("academic_level") or row.get("academicLevel") or "").strip() or None,
        "interests": (row.get("interests") or "").strip() or None,
    }, None


def _validate_course_row(row: dict, index: int) -> tuple[dict | None, str | None]:
    code = (row.get("code") or "").strip().upper()
    if not code or len(code) < 2:
        return None, f"Row {index}: Course code is required (min 2 characters)."
    title = (row.get("title") or "").strip()
    if not title or len(title) < 3:
        return None, f"Row {index}: Course title is required (min 3 characters)."
    category = (row.get("category") or "").strip()
    if not category:
        return None, f"Row {index}: Category is required."
    try:
        duration = int(row.get("duration_weeks") or row.get("durationWeeks") or 12)
    except (ValueError, TypeError):
        duration = 12
    try:
        fees = float(row.get("fees") or 0)
    except (ValueError, TypeError):
        fees = 0
    return {
        "code": code,
        "title": title,
        "category": category,
        "duration_weeks": duration,
        "fees": fees,
        "eligibility": (row.get("eligibility") or "").strip() or None,
        "description": (row.get("description") or "").strip() or None,
    }, None


@router.post("/import")
def import_csv(
    body: CsvImportIn,
    user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    """Import CSV data with validation."""
    entity_type = body.entityType
    now = datetime.now(timezone.utc).isoformat()

    # Parse CSV
    reader = csv.DictReader(io.StringIO(body.csvData))
    rows = list(reader)

    total = len(rows)
    valid_rows = []
    errors = []
    duplicates = 0

    for i, row in enumerate(rows, start=2):  # Start at 2 (header is row 1)
        if entity_type == "leads":
            validated, error = _validate_lead_row(row, i)
        elif entity_type == "students":
            validated, error = _validate_student_row(row, i)
        elif entity_type == "courses":
            validated, error = _validate_course_row(row, i)
        else:
            return {"success": False, "message": f"Unknown entity type: {entity_type}"}

        if error:
            errors.append(error)
            continue
        if validated:
            valid_rows.append(validated)

    # Insert valid rows
    inserted = 0
    for row in valid_rows:
        try:
            if entity_type == "leads":
                # Check for duplicate email
                if row.get("email"):
                    existing = db.one(
                        "SELECT id FROM leads WHERE email = :email", {"email": row["email"]}
                    )
                    if existing:
                        duplicates += 1
                        continue
                lead_id = str(uuid.uuid4())
                db.execute(
                    "INSERT INTO leads (id, name, email, phone, source, status, priority, "
                    "course_interest, engagement, interactions, archived, created_at, updated_at) "
                    "VALUES (:id, :name, :email, :phone, :source, :status, :priority, "
                    ":interest, 0, 0, 0, :now, :now)",
                    {
                        "id": lead_id, "name": row["name"], "email": row.get("email"),
                        "phone": row.get("phone"), "source": row.get("source", "Import"),
                        "status": row.get("status", "NEW"), "priority": row.get("priority", "Medium"),
                        "interest": row.get("course_interest"), "now": now,
                    },
                )
                inserted += 1

            elif entity_type == "students":
                if row.get("email"):
                    existing = db.one(
                        "SELECT id FROM students WHERE email = :email", {"email": row["email"]}
                    )
                    if existing:
                        duplicates += 1
                        continue
                student_id = str(uuid.uuid4())
                db.execute(
                    "INSERT INTO students (id, name, email, phone, academic_level, interests, created_at, updated_at) "
                    "VALUES (:id, :name, :email, :phone, :level, :interests, :now, :now)",
                    {
                        "id": student_id, "name": row["name"], "email": row.get("email"),
                        "phone": row.get("phone"), "level": row.get("academic_level"),
                        "interests": row.get("interests"), "now": now,
                    },
                )
                inserted += 1

            elif entity_type == "courses":
                existing = db.one(
                    "SELECT id FROM courses WHERE code = :code", {"code": row["code"]}
                )
                if existing:
                    duplicates += 1
                    continue
                course_id = str(uuid.uuid4())
                db.execute(
                    "INSERT INTO courses (id, code, title, category, duration_weeks, fees, "
                    "eligibility, description, status, created_at, updated_at) "
                    "VALUES (:id, :code, :title, :category, :dur, :fees, :elig, :desc, 'active', :now, :now)",
                    {
                        "id": course_id, "code": row["code"], "title": row["title"],
                        "category": row["category"], "dur": row["duration_weeks"],
                        "fees": row["fees"], "elig": row.get("eligibility"),
                        "desc": row.get("description"), "now": now,
                    },
                )
                inserted += 1
        except Exception as exc:
            errors.append(f"Row insert failed: {str(exc)}")

    return ok({
        "entityType": entity_type,
        "totalRows": total,
        "validRows": len(valid_rows),
        "insertedRows": inserted,
        "duplicateRows": duplicates,
        "errorRows": len(errors),
        "errors": errors[:50],  # Limit error list
        "message": f"Imported {inserted} {entity_type} ({duplicates} duplicates, {len(errors)} errors).",
    })


# ── CSV Export ─────────────────────────────────────────────────────────────


def _generate_csv(rows: list[dict], filename: str) -> StreamingResponse:
    """Generate a CSV download from a list of row dicts."""
    if not rows:
        rows = [{}]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/leads")
def export_leads(
    user: CurrentUser,
    status: str | None = None,
    source: str | None = None,
):
    where: list[str] = ["archived = 0"]
    params: dict = {}
    if status:
        where.append("status = :status")
        params["status"] = status
    if source:
        where.append("source = :source")
        params["source"] = source
    where_sql = f"WHERE {' AND '.join(where)}"
    rows = db.q(f"SELECT * FROM leads {where_sql} ORDER BY created_at DESC", params)
    # Clean up for CSV
    clean_rows = []
    for r in rows:
        clean_rows.append({
            "name": r["name"],
            "email": r.get("email", ""),
            "phone": r.get("phone", ""),
            "source": r.get("source", ""),
            "status": r.get("status", ""),
            "priority": r.get("priority", ""),
            "course_interest": r.get("course_interest", ""),
            "engagement": r.get("engagement", 0),
            "interactions": r.get("interactions", 0),
            "created_at": r.get("created_at", ""),
        })
    return _generate_csv(clean_rows, f"leads-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


@router.get("/export/students")
def export_students(user: CurrentUser):
    rows = db.q("SELECT * FROM students ORDER BY created_at DESC")
    clean_rows = []
    for r in rows:
        clean_rows.append({
            "name": r["name"],
            "email": r.get("email", ""),
            "phone": r.get("phone", ""),
            "academic_level": r.get("academic_level", ""),
            "interests": r.get("interests", ""),
            "created_at": r.get("created_at", ""),
        })
    return _generate_csv(clean_rows, f"students-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


@router.get("/export/courses")
def export_courses(user: CurrentUser):
    rows = db.q("SELECT * FROM courses ORDER BY title ASC")
    clean_rows = []
    for r in rows:
        clean_rows.append({
            "code": r["code"],
            "title": r["title"],
            "category": r.get("category", ""),
            "duration_weeks": r.get("duration_weeks", 0),
            "fees": r.get("fees", 0),
            "eligibility": r.get("eligibility", ""),
            "description": r.get("description", ""),
            "status": r.get("status", "active"),
        })
    return _generate_csv(clean_rows, f"courses-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")
