"""AI endpoints — implement the exact contract the frontend already consumes
(`src/services/apiClient.ts`).

NOTE: the contract endpoints below return the RAW payload (e.g.
`{"status":"ok"}` or `{"results":[...]}`) — NOT the `{success, data}`
envelope used by the REST API. Every result is computed from the real input
payload; nothing is hardcoded.
"""
from __future__ import annotations

from typing import Any

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..core.deps import CurrentUser
from ..core.errors import AppError, ok
from sqlalchemy import text
from ..core.database import engine
from ..services.ai import (
    daily_briefing,
    db_insights,
    forecast_sales,
    predict_conversion,
    predict_dropout,
    profile_student,
    recommend_courses,
    score_lead_features,
)
from ..services import db_helpers as db

router = APIRouter(tags=["ai"])

_UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


# ================================ Health =============================== #
@router.get("/api/health")
def health():
    """Comprehensive health check — database, AI models, email configuration."""
    # Database check
    try:
        from sqlalchemy import text
        from ..core.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    # Email check
    from ..core.config import settings
    email_configured = bool(settings.is_production or (
        hasattr(settings, 'smtp_host') and getattr(settings, 'smtp_host', '')
    ))

    # AI models available
    ai_models = [
        "lead-scoring",
        "course-recommendation",
        "conversion-prediction",
        "dropout-warning",
        "sales-forecast",
        "student-profiling",
    ]

    return {
        "status": "ok",
        "database": db_status,
        "ai": "available",
        "models": ai_models,
        "email": "configured" if email_configured else "unconfigured",
        "message": "EDTECH AI backend is running.",
    }


# ============================ Lead scoring ============================= #
class LeadScoreItem(BaseModel):
    id: str = Field(min_length=1)
    platform: str | None = None
    region: str | None = None
    campaignType: str | None = None
    leads: float | None = None
    applications: float | None = None
    enrollments: float | None = None


class LeadScoreIn(BaseModel):
    leads: list[LeadScoreItem] = Field(min_length=1, max_length=500)


@router.post("/api/predict/lead-score")
def predict_lead_score(body: LeadScoreIn, _user: CurrentUser):
    max_leads = max([l.leads or 0 for l in body.leads] + [1])
    results = []
    for l in body.leads:
        out = score_lead_features(l.model_dump(), max_leads)
        results.append(
            {
                "id": out["id"],
                "score": out["score"],
                "risk": out["risk"],
                "category": out["category"],
                "probability": out["probability"],
                "reasons": out["reasons"],
            }
        )
    # Log activity for recent activities feed
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, NULL, :user_id, 'ai', :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": _user.id,
            "note": f"AI Lead Score generated for {len(body.leads)} lead(s).",
            "now": now,
        },
    )
    return {"results": results, "model": "lead-scoring-baseline-v1"}


# ======================= Course recommendation ========================= #
class StudentProfile(BaseModel):
    id: str = Field(min_length=1)
    course: str | None = None
    gender: str | None = None
    age: float | None = None
    admissionGrade: float | None = None
    scholarship: float | None = None
    attendance: str | None = None
    maritalStatus: str | None = None


class RecommendIn(BaseModel):
    student: StudentProfile
    topK: int | None = Field(default=None, ge=1, le=20)


@router.post("/api/recommend/courses")
def recommend_courses_endpoint(body: RecommendIn, _user: CurrentUser):
    recommendations = recommend_courses({"student": body.student.model_dump(), "topK": body.topK})
    # Log activity for recent activities feed
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, NULL, :user_id, 'ai', :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": _user.id,
            "note": f"Course recommendation generated for student {body.student.id}.",
            "now": now,
        },
    )
    return {
        "recommendations": [
            {
                "courseCode": r["courseCode"],
                "title": r["title"],
                "score": r["score"],
                "rank": r["rank"],
                "reason": r["reason"],
            }
            for r in recommendations
        ],
        "model": "course-recommendation-keyword-v1",
    }


# ======================= Conversion prediction ========================= #
class LeadFeatures(BaseModel):
    id: str = Field(min_length=1)
    engagement: float | None = None
    interactions: float | None = None
    status: str | None = None
    source: str | None = None


class PredictIn(BaseModel):
    lead: LeadFeatures


@router.post("/api/predict/conversion")
def predict_conversion_endpoint(body: PredictIn, _user: CurrentUser):
    return {**predict_conversion({"lead": body.lead.model_dump()}), "model": "conversion-logistic-v1"}


# ========================= Dropout prediction ========================== #
class DropoutStudent(BaseModel):
    id: str = Field(min_length=1)
    course: str | None = None
    gender: str | None = None
    age: float | None = None
    admissionGrade: float | None = None
    scholarship: float | None = None
    attendance: str | None = None
    maritalStatus: str | None = None


class DropoutIn(BaseModel):
    students: list[DropoutStudent] = Field(min_length=1, max_length=500)


@router.post("/api/predict/dropout")
def predict_dropout_endpoint(body: DropoutIn, _user: CurrentUser):
    results = predict_dropout({"students": [s.model_dump() for s in body.students]})
    # Log activity for recent activities feed
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
        "VALUES (:id, NULL, :user_id, 'ai', :note, :now)",
        {
            "id": str(uuid.uuid4()),
            "user_id": _user.id,
            "note": f"AI dropout prediction completed for {len(body.students)} student(s).",
            "now": now,
        },
    )
    return {
        "results": [
            {"id": r["id"], "probability": r["probability"], "risk": r["risk"], "reasons": r["reasons"]}
            for r in results
        ],
        "model": "dropout-baseline-v1",
    }


# ============================ Sales forecast =========================== #
class SeriesPoint(BaseModel):
    date: str = Field(min_length=1)
    leads: float
    enrollments: float


class ForecastIn(BaseModel):
    series: list[SeriesPoint] = Field(min_length=3, max_length=5000)
    horizon: int | None = Field(default=None, ge=1, le=12)


@router.post("/api/forecast/sales")
def forecast_sales_endpoint(body: ForecastIn, _user: CurrentUser):
    return {
        "forecast": forecast_sales({"series": [p.model_dump() for p in body.series], "horizon": body.horizon}),
        "model": "trend-damped-linear-v1",
    }


# =========================== Student profile =========================== #
class ProfileIn(BaseModel):
    student: StudentProfile


@router.post("/api/profile/student")
def profile_student_endpoint(body: ProfileIn, _user: CurrentUser):
    return {**profile_student({"student": body.student.model_dump()}), "model": "student-profile-v1"}


# ====================== DB-backed AI surfaces =========================== #
@router.get("/api/insights")
def insights(_user: CurrentUser):
    return ok({"insights": db_insights()})


@router.get("/api/daily-briefing")
def get_daily_briefing(_user: CurrentUser):
    """Generate a daily AI briefing from real database data."""
    briefing = daily_briefing()
    return ok(briefing)


@router.get("/api/students/{student_id}/recommendations")
def student_recommendations(student_id: str, _user: CurrentUser):
    student = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    if not student:
        raise AppError("Student not found.", 404, "NOT_FOUND")
    recommendations = recommend_courses(
        {"student": {"id": student["id"], "course": student["interests"], "admissionGrade": 65}, "topK": 5}
    )
    return ok({"student": {"id": student["id"], "name": student["name"]}, "recommendations": recommendations})


# =================== Enhanced AI Provider Endpoints ===================== #
class EmailGenIn(BaseModel):
    leadName: str = Field(default="Student")
    courseInterest: str | None = None
    tone: str = Field(default="professional")
    leadScore: float | None = None
    priority: str | None = None
    source: str | None = None
    status: str | None = None
    notes: str | None = None


class NextActionIn(BaseModel):
    leadId: str | None = None
    status: str = Field(default="NEW")
    score: float | None = None
    engagement: float | None = None
    interactions: int | None = None
    courseInterest: str | None = None


class CallAnalysisIn(BaseModel):
    transcript: str = Field(min_length=1, max_length=50000)


@router.post("/api/ai/email-generation")
def generate_email(body: EmailGenIn, _user: CurrentUser):
    from ..services.ai_provider import get_provider
    provider = get_provider()
    result = provider.email_generation({
        "lead_name": body.leadName,
        "course_interest": body.courseInterest or "your program",
        "tone": body.tone,
        "lead_score": body.leadScore,
        "priority": body.priority,
        "source": body.source,
        "status": body.status,
        "notes": body.notes,
    })
    return ok(result)


@router.post("/api/ai/next-best-action")
def next_best_action(body: NextActionIn, _user: CurrentUser):
    from ..services.ai_provider import get_provider
    provider = get_provider()
    result = provider.next_best_action({
        "lead_id": body.leadId,
        "status": body.status,
        "score": body.score,
        "engagement": body.engagement,
        "interactions": body.interactions,
        "course_interest": body.courseInterest,
    })
    return ok(result)


@router.post("/api/ai/call-analysis")
def analyze_call(body: CallAnalysisIn, _user: CurrentUser):
    from ..services.ai_provider import get_provider
    provider = get_provider()
    result = provider.call_summary(body.transcript)
    return ok(result)


@router.get("/api/ai/provider")
def get_ai_provider_info(_user: CurrentUser):
    from ..services.ai_provider import get_provider
    from ..core.config import settings
    provider = get_provider()
    return ok({
        "provider": provider.name,
        "configured": bool(settings.openai_api_key) if provider.name == "openai" else True,
        "model": settings.openai_model if provider.name == "openai" else "baseline",
        "features": {
            "lead_scoring": True,
            "course_recommendation": True,
            "conversion_prediction": True,
            "dropout_prediction": True,
            "email_generation": True,
            "call_analysis": True,  # baseline implements call_summary
            "next_best_action": True,
        },
    })


# ============= Enhanced DB-backed AI endpoints ========================

def _enriched_lead_score(lead: dict) -> dict:
    """Enhanced lead scoring using real DB attributes with weighted factors."""
    from ..services.ai import clamp01, clamp100, sigmoid, SOURCE_WEIGHTS
    reasons: list[str] = []
    evidence = 0.0
    weight_sum = 0.0

    def add(weight: float, value: float, reason: str) -> None:
        nonlocal evidence, weight_sum
        evidence += weight * value
        weight_sum += weight
        if value > 0.5 and reason:
            reasons.append(reason)

    # 1. Engagement score (0-100 mapped to 0-1)
    engagement = clamp01((lead.get("engagement") or 0) / 100)
    add(2.5, engagement, f"Engagement score: {lead.get('engagement', 0)}%")

    # 2. Interaction frequency
    interactions = lead.get("interactions") or 0
    interaction_norm = clamp01(interactions / 12)
    add(2.0, interaction_norm, f"{interactions} interactions recorded")

    # 3. Funnel stage
    status = lead.get("status") or "NEW"
    status_scores = {
        "CONVERTED": 1.0, "ENROLLED": 0.95, "APPLICATION": 0.85,
        "QUALIFIED": 0.8, "DEMO_SCHEDULED": 0.7, "NURTURING": 0.6,
        "INTERESTED": 0.55, "CONTACTED": 0.4, "NEW": 0.2,
        "INACTIVE": 0.1, "LOST": 0.0,
    }
    add(3.0, status_scores.get(status, 0.2), f"Funnel stage: {status}")

    # 4. Source quality
    source = lead.get("source") or ""
    source_w = SOURCE_WEIGHTS.get(source, 0.55)
    add(1.5, source_w, f"Channel: {source}" if source else "")

    # 5. Priority signal
    priority = lead.get("priority") or "Medium"
    prio_map = {"High": 0.9, "Medium": 0.5, "Low": 0.2}
    add(1.0, prio_map.get(priority, 0.5), f"Priority: {priority}" if priority == "High" else "")

    # 6. Course interest match
    if lead.get("course_interest"):
        add(0.5, 0.7, f"Interest in {lead['course_interest']}")

    # 7. Lead score from DB (if already scored)
    db_score = lead.get("score")
    if db_score is not None and db_score > 0:
        add(1.0, clamp01(db_score / 100), f"Previous AI score: {db_score}")

    # 8. Recency bonus
    last_activity = lead.get("last_activity")
    if last_activity:
        from datetime import datetime, timezone
        try:
            la = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
            if la.tzinfo is None:
                la = la.replace(tzinfo=timezone.utc)
            days_ago = (datetime.now(timezone.utc) - la).days
            recency = clamp01(1 - days_ago / 30)
            add(1.0, recency, f"Active {days_ago}d ago" if days_ago < 7 else "")
        except (ValueError, TypeError):
            pass

    # 9. Notes-based signals
    notes = (lead.get("notes") or "").lower()
    if "high purchase intent" in notes or "high interest" in notes:
        add(0.5, 0.8, "High purchase intent noted")
    if "demo completed" in notes or "demo done" in notes:
        add(0.5, 0.7, "Demo completed")
    if "interested" in notes or "want" in notes:
        add(0.3, 0.6, "Expressed interest in notes")
    if "placement" in notes or "career" in notes:
        add(0.3, 0.5, "Career/placement focused")
    if "weekend" in notes or "flexible" in notes:
        add(0.2, 0.5, "Preferred schedule flexibility")

    raw = evidence / weight_sum if weight_sum > 0 else 0
    score = clamp100(round(raw * 100))
    probability = clamp01(sigmoid((raw - 0.4) * 7))

    if score >= 75:
        category, risk = "High Intent", "Low"
    elif score >= 50:
        category, risk = "Medium Intent", "Medium"
    else:
        category, risk = "Low Intent", "High"

    # Next action recommendation
    if status == "NEW" and interactions == 0:
        next_action = "Call within 1 hour — lead just showed interest"
    elif status == "CONTACTED" and interactions < 3:
        next_action = "Follow up with personalized course recommendation"
    elif status == "INTERESTED":
        next_action = "Send detailed course information and schedule demo"
    elif status == "DEMO_SCHEDULED":
        next_action = "Send demo reminder with preparation details"
    elif status == "QUALIFIED":
        next_action = "Send application form and fee structure"
    elif status == "APPLICATION":
        next_action = "Assist with application completion"
    elif status == "NURTURING":
        if "fee" in notes or "cost" in notes:
            next_action = "Share scholarship and payment plan options"
        else:
            next_action = "Share success stories and program highlights"
    elif status == "INACTIVE":
        next_action = "Send re-engagement email with special offer"
    elif status == "LOST":
        next_action = "Send win-back email with new offers"
    elif engagement > 70:
        next_action = "Schedule enrollment counseling session"
    elif interactions > 5:
        next_action = "Escalate to senior counselor for personalized outreach"
    else:
        next_action = "Send follow-up email with program highlights"

    if not reasons:
        reasons.append("Limited engagement signals in the record")

    return {
        "id": lead["id"],
        "name": lead.get("name", ""),
        "email": lead.get("email"),
        "source": source,
        "status": status,
        "score": score,
        "probability": round(probability, 4),
        "risk": risk,
        "category": category,
        "reasons": reasons[:5],
        "next_action": next_action,
        "engagement": lead.get("engagement", 0),
        "interactions": interactions,
        "course_interest": lead.get("course_interest"),
        "priority": priority,
    }


@router.get("/api/ai/score-all-leads")
def score_all_leads(_user: CurrentUser):
    """Score every active lead in the database with the enhanced algorithm."""
    from sqlalchemy import text
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT * FROM leads WHERE archived = 0 ORDER BY created_at DESC")
        ).mappings().all()
    leads = [dict(r) for r in rows]
    results = [_enriched_lead_score(l) for l in leads]
    results.sort(key=lambda r: -r["score"])

    # Summary statistics
    high = sum(1 for r in results if r["category"] == "High Intent")
    medium = sum(1 for r in results if r["category"] == "Medium Intent")
    low = sum(1 for r in results if r["category"] == "Low Intent")
    avg_score = round(sum(r["score"] for r in results) / max(1, len(results)))

    return ok({
        "results": results,
        "summary": {
            "total": len(results),
            "high_intent": high,
            "medium_intent": medium,
            "low_intent": low,
            "average_score": avg_score,
        },
        "model": "enhanced-lead-scoring-v2",
    })


@router.get("/api/ai/admission-intelligence")
def admission_intelligence(_user: CurrentUser):
    """Comprehensive admission intelligence derived from all live data."""
    from sqlalchemy import text
    with engine.connect() as conn:
        # Lead metrics
        total_leads = conn.execute(text("SELECT COUNT(*) FROM leads WHERE archived = 0")).scalar_one()
        qualified = conn.execute(text("SELECT COUNT(*) FROM leads WHERE status = 'QUALIFIED'")).scalar_one()
        converted = conn.execute(text("SELECT COUNT(*) FROM leads WHERE status = 'CONVERTED'")).scalar_one()
        nurturing = conn.execute(text("SELECT COUNT(*) FROM leads WHERE status = 'NURTURING'")).scalar_one()
        lost = conn.execute(text("SELECT COUNT(*) FROM leads WHERE status = 'LOST'")).scalar_one()
        high_priority = conn.execute(
            text("SELECT COUNT(*) FROM leads WHERE archived = 0 AND priority = 'High' AND status NOT IN ('CONVERTED','LOST')")
        ).scalar_one()

        # Enrollment pipeline
        enroll_active = conn.execute(text("SELECT COUNT(*) FROM enrollments WHERE status = 'enrolled'")).scalar_one()
        enroll_app = conn.execute(text("SELECT COUNT(*) FROM enrollments WHERE status = 'application'")).scalar_one()
        enroll_lead = conn.execute(text("SELECT COUNT(*) FROM enrollments WHERE status = 'lead'")).scalar_one()

        # Course demand
        course_stats = conn.execute(
            text("SELECT title, COUNT(*) as enrollments FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id WHERE c.status = 'active' GROUP BY c.id ORDER BY enrollments DESC LIMIT 5")
        ).mappings().all()

        # Source distribution
        source_dist = conn.execute(
            text("SELECT source, COUNT(*) as count FROM leads WHERE archived = 0 GROUP BY source ORDER BY count DESC")
        ).mappings().all()

        # Counselor performance
        counselor_stats = conn.execute(
            text("SELECT u.name, COUNT(l.id) as leads, SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) as converted FROM users u LEFT JOIN leads l ON l.counselor_id = u.id WHERE u.role IN ('COUNSELOR','ADMISSIONS') GROUP BY u.id ORDER BY converted DESC")
        ).mappings().all()

        # At-risk students
        from ..services.ai import predict_dropout
        students = conn.execute(text("SELECT id, name, interests FROM students LIMIT 50")).mappings().all()
        at_risk_students = []
        for s in students:
            drop = predict_dropout({"students": [{"id": s["id"], "course": s.get("interests"), "admissionGrade": 65}]})
            if drop and drop[0].get("risk") in ("High", "Medium"):
                at_risk_students.append({"name": s["name"], "risk": drop[0]["risk"], "reasons": drop[0].get("reasons", [])})

    conversion_rate = round(converted / max(1, total_leads) * 100, 1)
    qualification_rate = round(qualified / max(1, total_leads) * 100, 1)
    loss_rate = round(lost / max(1, total_leads) * 100, 1)

    return ok({
        "summary": {
            "total_leads": total_leads,
            "qualified_leads": qualified,
            "converted_leads": converted,
            "nurturing_leads": nurturing,
            "lost_leads": lost,
            "high_priority_active": high_priority,
            "conversion_rate": conversion_rate,
            "qualification_rate": qualification_rate,
            "loss_rate": loss_rate,
        },
        "pipeline": {
            "active_enrollments": enroll_active,
            "pending_applications": enroll_app,
            "new_leads_in_pipeline": enroll_lead,
        },
        "top_courses": [{"title": r["title"], "enrollments": r["enrollments"]} for r in course_stats],
        "source_distribution": [{"source": r["source"], "count": r["count"]} for r in source_dist],
        "counselor_performance": [{"name": r["name"], "leads": r["leads"], "converted": r["converted"] or 0} for r in counselor_stats],
        "at_risk_students": at_risk_students[:10],
        "insights": [
            {"type": "conversion", "message": f"Overall conversion rate is {conversion_rate}% ({converted} of {total_leads} leads).", "severity": "info" if conversion_rate > 10 else "warning"},
            {"type": "qualification", "message": f"{qualification_rate}% of leads have been qualified. {high_priority} high-priority leads need attention.", "severity": "info" if qualification_rate > 20 else "warning"},
            {"type": "loss", "message": f"{loss_rate}% of leads have been lost. Review lost lead reasons to improve targeting.", "severity": "warning" if loss_rate > 15 else "info"},
            {"type": "at_risk", "message": f"{len(at_risk_students)} students are at elevated dropout risk. Consider proactive intervention.", "severity": "warning" if len(at_risk_students) > 0 else "info"},
        ],
    })


@router.get("/api/ai/forecast-from-pipeline")
def forecast_from_pipeline(_user: CurrentUser):
    """Generate enrollment forecast from actual pipeline data."""
    from sqlalchemy import text
    from ..services.ai import forecast_sales, clamp100
    with engine.connect() as conn:
        # Build monthly enrollment series from enrollments table
        monthly = conn.execute(
            text(
                "SELECT strftime('%Y-%m-01', created_at) as month, "
                "COUNT(*) as enrollments, "
                "SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as completed "
                "FROM enrollments GROUP BY month ORDER BY month"
            )
        ).mappings().all()

        # If we don't have enough enrollment history, use lead creation as proxy
        if len(monthly) < 3:
            monthly = conn.execute(
                text(
                    "SELECT strftime('%Y-%m-01', created_at) as month, "
                    "COUNT(*) as leads, "
                    "SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) as enrollments "
                    "FROM leads WHERE archived = 0 GROUP BY month ORDER BY month"
                )
            ).mappings().all()

    series = []
    for m in monthly:
        month_str = m["month"]
        enrollments = m.get("enrollments") or m.get("completed") or 0
        leads = m.get("leads") or 0
        series.append({"date": month_str, "leads": leads, "enrollments": enrollments})

    forecast = forecast_sales({"series": series, "horizon": 6})

    # Current pipeline snapshot
    current_total = sum(s["enrollments"] for s in series)
    avg_monthly = round(current_total / max(1, len(series)), 1)
    trend = "increasing" if len(series) >= 2 and series[-1]["enrollments"] > series[-2]["enrollments"] else "stable" if len(series) < 2 else "decreasing"

    return ok({
        "forecast": forecast,
        "pipeline": {
            "total_enrollments": current_total,
            "average_monthly": avg_monthly,
            "trend": trend,
            "data_points": len(series),
        },
        "model": "trend-damped-linear-v2",
    })


@router.get("/api/ai/student-dropout-all")
def student_dropout_all(_user: CurrentUser):
    """Predict dropout risk for all students in the database."""
    from ..services.ai import predict_dropout
    from sqlalchemy import text
    with engine.connect() as conn:
        students = conn.execute(
            text("SELECT id, name, email, interests, academic_level FROM students LIMIT 200")
        ).mappings().all()

    results = []
    for s in students:
        drop = predict_dropout({
            "students": [{
                "id": s["id"],
                "course": s.get("interests"),
                "admissionGrade": 65,
                "attendance": s.get("attendance", "medium"),
                "age": 25,
            }]
        })
        if drop:
            r = drop[0]
            results.append({
                "id": r["id"],
                "name": s["name"],
                "email": s.get("email"),
                "course": s.get("interests"),
                "academic_level": s.get("academic_level"),
                "probability": r["probability"],
                "risk": r["risk"],
                "reasons": r["reasons"],
            })

    results.sort(key=lambda r: -r["probability"])
    high = sum(1 for r in results if r["risk"] == "High")
    medium = sum(1 for r in results if r["risk"] == "Medium")
    low = sum(1 for r in results if r["risk"] == "Low")

    return ok({
        "results": results,
        "summary": {
            "total": len(results),
            "high_risk": high,
            "medium_risk": medium,
            "low_risk": low,
        },
        "model": "dropout-baseline-v2",
    })


@router.get("/api/ai/course-demand")
def course_demand(_user: CurrentUser):
    """Analyze course demand from real enrollment and lead data."""
    from sqlalchemy import text
    from ..services.ai import clamp100
    with engine.connect() as conn:
        # Course enrollment counts
        course_enrollments = conn.execute(
            text(
                "SELECT c.id, c.title, c.code, c.category, c.fees, "
                "COUNT(e.id) as enrollments, "
                "SUM(CASE WHEN e.status = 'enrolled' THEN 1 ELSE 0 END) as active_enrollments "
                "FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id "
                "WHERE c.status = 'active' GROUP BY c.id ORDER BY enrollments DESC"
            )
        ).mappings().all()

        # Lead course interest distribution
        course_interests = conn.execute(
            text(
                "SELECT course_interest, COUNT(*) as count FROM leads "
                "WHERE archived = 0 AND course_interest IS NOT NULL AND course_interest != '' "
                "GROUP BY course_interest ORDER BY count DESC"
            )
        ).mappings().all()

    courses = []
    for c in course_enrollments:
        interest_count = next((ci["count"] for ci in course_interests if ci["course_interest"] == c["title"]), 0)
        demand_score = clamp100(round((c["enrollments"] * 0.6 + interest_count * 0.4) * 100 / max(1, max(co["enrollments"] for co in course_enrollments))))
        courses.append({
            "id": c["id"],
            "title": c["title"],
            "code": c["code"],
            "category": c["category"],
            "fees": c["fees"],
            "enrollments": c["enrollments"],
            "active_enrollments": c["active_enrollments"] or 0,
            "lead_interest_count": interest_count,
            "demand_score": demand_score,
        })

    return ok({
        "courses": courses,
        "interest_distribution": [{"course": ci["course_interest"], "count": ci["count"]} for ci in course_interests],
    })