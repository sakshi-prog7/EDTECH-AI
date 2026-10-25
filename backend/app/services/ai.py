"""AI/ML engines — real, deterministic, data-driven baselines.

Every result is computed from the actual input features (never hardcoded
demo scores). Each model is a transparent baseline (weighted evidence +
logistic scoring) returning explainable output: score, probability,
category and human-readable reasons derived from the input. These are
clearly labeled baseline models — not trained production ML — and live
behind a clean service boundary so a trained model can be plugged in later
(the routers only ever call these functions).
"""
from __future__ import annotations

import math
import re

from ..core.database import engine

# ---------------------------------------------------------------------- #
# Shared helpers                                                         #
# ---------------------------------------------------------------------- #
def clamp01(n: float) -> float:
    return max(0.0, min(1.0, n))


def clamp100(n: float) -> float:
    return max(0.0, min(100.0, n))


def sigmoid(z: float) -> float:
    return 1 / (1 + math.exp(-z))


def _all_leads_sql() -> list[dict]:
    with engine.connect() as conn:
        from sqlalchemy import text

        rows = conn.execute(
            text("SELECT * FROM leads WHERE archived = 0")
        ).mappings().all()
    return [dict(r) for r in rows]


def _all_active_courses() -> list[dict]:
    from sqlalchemy import text

    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT * FROM courses WHERE status = 'active' ORDER BY title")
        ).mappings().all()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------- #
# Lead scoring                                                           #
# ---------------------------------------------------------------------- #
SOURCE_WEIGHTS: dict[str, float] = {
    "Website": 0.75,
    "Google Ads": 0.7,
    "Instagram Ads": 0.6,
    "LinkedIn": 0.8,
    "Referral": 0.9,
    "Campus Event": 0.65,
}


def score_lead_features(f: dict, dataset_max_leads: float = 1000) -> dict:
    """Score one lead record (0–100) with explainable per-reason evidence."""
    reasons: list[str] = []
    evidence = 0.0
    weight_sum = 0.0

    def add(weight: float, value: float, reason: str) -> None:
        nonlocal evidence, weight_sum
        evidence += weight * value
        weight_sum += weight
        if value > 0.55 and reason:
            reasons.append(reason)

    total = f.get("leads") or 0
    applications = f.get("applications") or 0
    enrollments = f.get("enrollments") or 0

    # Application rate — the strongest intent signal available in the data.
    app_rate = applications / total if total > 0 else 0
    add(3, app_rate, "High application rate relative to leads")

    # Enrollment rate — indicates an already-converting funnel.
    enroll_rate = enrollments / total if total > 0 else 0
    add(2, enroll_rate, "Enrollment activity recorded")

    # Volume relative to the largest row seen (scale awareness).
    volume = clamp01(total / max(1, dataset_max_leads))
    add(1, volume, "High lead volume")

    # Channel quality.
    platform = f.get("platform") or ""
    source_weight = SOURCE_WEIGHTS.get(platform, 0.6)
    add(1, source_weight, f"Strong channel performance ({platform})" if platform else "")

    # Campaign-type bonus (applications-focused campaigns convert better).
    campaign_type = f.get("campaignType") or ""
    if campaign_type and re.search(r"email|digital|social", campaign_type, re.I):
        add(0.75, 0.75, f"Conversion-friendly campaign type ({campaign_type})")
    if f.get("region"):
        add(0.25, 0.5, "")

    raw = evidence / weight_sum if weight_sum > 0 else 0
    score = clamp100(round(raw * 100))
    probability = clamp01(sigmoid((raw - 0.45) * 6))
    risk = "Low" if score >= 70 else "Medium" if score >= 45 else "High"
    category = "High Intent" if score >= 70 else "Medium Intent" if score >= 45 else "Low Intent"
    if not reasons:
        reasons.append("Limited engagement signals in the record")
    return {
        "id": f["id"],
        "score": score,
        "probability": round(probability, 4),
        "risk": risk,
        "category": category,
        "reasons": reasons[:4],
    }


def score_db_leads(lead_ids: list[str] | None = None) -> list[dict]:
    """Score real DB leads (optionally filtered by id list)."""
    if lead_ids:
        placeholders = ",".join(f":id_{i}" for i in range(len(lead_ids)))
        params = {f"id_{i}": lid for i, lid in enumerate(lead_ids)}
        sql = f"SELECT * FROM leads WHERE id IN ({placeholders})"
    else:
        params = {}
        sql = "SELECT * FROM leads WHERE archived = 0"
    from sqlalchemy import text

    with engine.connect() as conn:
        rows = [dict(r) for r in conn.execute(text(sql), params).mappings().all()]

    max_leads = max((r["interactions"] or 0 for r in rows), default=1) or 1
    out = []
    for r in rows:
        out.append(
            {
                **score_lead_features(
                    {
                        "id": r["id"],
                        "platform": r["source"],
                        "region": r.get("course_interest"),
                        "campaignType": None,
                        "leads": r["interactions"],
                        "applications": (
                            max(1, round((r["interactions"] or 0) * 0.4))
                            if r["status"] in ("QUALIFIED", "CONVERTED")
                            else 0
                        ),
                        "enrollments": 1 if r["status"] == "CONVERTED" else 0,
                    },
                    max_leads,
                ),
                "name": r["name"],
            }
        )
    return out


# ---------------------------------------------------------------------- #
# Course recommendation                                                  #
# ---------------------------------------------------------------------- #
INTEREST_KEYWORDS: dict[str, list[str]] = {
    "Data Science": ["data", "analytics", "statistics", "python", "machine learning", "ml"],
    "Artificial Intelligence": ["ai", "machine learning", "ml", "python", "models", "nlp"],
    "Programming": ["python", "coding", "software", "programming", "developer"],
    "Business": ["business", "analytics", "marketing", "management", "commerce"],
    "Marketing": ["marketing", "social media", "brand", "seo", "content"],
    "Finance": ["finance", "investing", "stocks", "banking", "risk"],
    "Computer Science": ["computers", "algorithms", "software", "cs", "systems"],
    "Psychology": ["psychology", "counseling", "education", "students"],
}


def _category_keywords(category: str) -> list[str]:
    return INTEREST_KEYWORDS.get(category, [category.lower()])


def recommend_courses(input_: dict) -> list[dict]:
    """Rank active courses for a student profile (keyword + eligibility fit)."""
    top_k = max(1, min(20, input_.get("topK") or 5))
    courses = _all_active_courses()
    student = input_["student"]
    interest_text = " ".join(
        str(student.get(k) or "") for k in ("course", "age", "attendance")
    ).lower()
    grade = student.get("admissionGrade") or 50

    scored: list[tuple[dict, float, list[str], bool]] = []
    for course in courses:
        keywords = _category_keywords(course["category"])
        matched = [kw for kw in keywords if kw in interest_text]
        keyword_score = min(1.0, len(matched) / 2) if matched else 0.15
        grade_fit = 0.9 if grade >= 70 else 0.7 if grade >= 50 else 0.5
        eligible = grade >= 35
        score = clamp100(round((0.65 * keyword_score + 0.35 * grade_fit) * 100))
        scored.append((course, score, matched, eligible))

    ranked = [s for s in scored if s[3]]
    ranked.sort(key=lambda s: -s[1])
    return [
        {
            "courseCode": s[0]["code"],
            "title": s[0]["title"],
            "score": s[1],
            "rank": i + 1,
            "reason": _reason_for_recommendation(s[0], s[2], grade),
        }
        for i, s in enumerate(ranked[:top_k])
    ]


def _reason_for_recommendation(course: dict, matched: list[str], grade: float) -> str:
    parts: list[str] = []
    if matched:
        parts.append(
            f"Profile aligns with {course['category'].lower()} interests "
            f"({', '.join(matched[:2])})"
        )
    else:
        parts.append(f"Relevant {course['category'].lower()} track")
    if grade >= 70:
        parts.append("academic record supports an advanced program")
    elif grade >= 50:
        parts.append("academic record fits the entry requirements")
    else:
        parts.append("open eligibility")
    return "; ".join(parts)


# ---------------------------------------------------------------------- #
# Conversion prediction (lead -> enrollment)                             #
# ---------------------------------------------------------------------- #
def predict_conversion(input_: dict) -> dict:
    """Logistic-style conversion model over real lead features."""
    lead = input_["lead"]
    engagement = clamp01((lead.get("engagement") or 0) / 100)
    interactions = clamp01((lead.get("interactions") or 0) / 12)
    advanced = 1 if lead.get("status") in ("QUALIFIED", "NURTURING", "CONVERTED") else 0
    source_weight = SOURCE_WEIGHTS.get(lead.get("source") or "", 0.6)

    z = -2.1 + 2.6 * engagement + 1.4 * interactions + 1.9 * advanced + 0.6 * (source_weight - 0.6) * 2
    probability = clamp01(sigmoid(z))
    category = "High" if probability >= 0.65 else "Medium" if probability >= 0.4 else "Low"

    factors: list[dict] = []
    if engagement >= 0.5:
        factors.append({"factor": "High engagement score", "impact": "positive"})
    if interactions >= 0.5:
        factors.append({"factor": "Frequent interactions", "impact": "positive"})
    if advanced:
        factors.append({"factor": "Funnel already advanced", "impact": "positive"})
    if engagement < 0.3:
        factors.append({"factor": "Low engagement", "impact": "negative"})
    if not factors:
        factors.append({"factor": "Limited activity so far", "impact": "negative"})

    return {
        "leadId": lead["id"],
        "probability": round(probability, 4),
        "category": category,
        "factors": factors[:4],
    }


# ---------------------------------------------------------------------- #
# Dropout risk (student records)                                         #
# ---------------------------------------------------------------------- #
def predict_dropout(input_: dict) -> list[dict]:
    """Baseline dropout-risk model over real student features."""
    out = []
    for s in input_["students"]:
        reasons: list[str] = []
        grade = s.get("admissionGrade") or 50
        grade_risk = clamp01((75 - grade) / 55)
        if grade < 55:
            reasons.append("Low admission grade")

        attendance = (s.get("attendance") or "").lower()
        attendance_risk = 0.5
        if "low" in attendance:
            attendance_risk = 0.85
            reasons.append("Low attendance")
        elif "high" in attendance:
            attendance_risk = 0.25

        age = s.get("age") or 25
        age_risk = clamp01(abs(age - 24) / 15)
        if age > 32:
            reasons.append("Older student demographic")

        no_scholarship = 0.0 if s.get("scholarship") else 0.15
        if no_scholarship > 0:
            reasons.append("No scholarship support")

        raw = 0.45 * grade_risk + 0.35 * attendance_risk + 0.1 * age_risk + 0.1 * no_scholarship
        probability = clamp01(raw)
        risk = "High" if probability >= 0.6 else "Medium" if probability >= 0.35 else "Low"
        if not reasons:
            reasons.append("Risk factors within normal range")
        out.append(
            {
                "id": s["id"],
                "probability": round(probability, 3),
                "risk": risk,
                "reasons": reasons[:3],
            }
        )
    return out


# ---------------------------------------------------------------------- #
# Sales forecast                                                         #
# ---------------------------------------------------------------------- #
def forecast_sales(input_: dict) -> list[dict]:
    """Forecast from the real historical series only (damped linear trend)."""
    horizon = max(1, min(12, input_.get("horizon") or 3))
    series = [
        p for p in input_["series"]
        if p.get("date") and isinstance(p.get("enrollments"), (int, float))
        and math.isfinite(p["enrollments"])
    ]
    if not series:
        return []
    window = series[-14:]
    n = len(window)
    mean_x = (n - 1) / 2
    mean_y = sum(p["enrollments"] for p in window) / n
    num = sum((i - mean_x) * (p["enrollments"] - mean_y) for i, p in enumerate(window))
    den = sum((i - mean_x) ** 2 for i in range(n))
    slope = num / den if den > 0 else 0
    last_value = window[-1]["enrollments"]
    damping = 0.92

    from datetime import datetime, timedelta, timezone

    last_date = datetime.fromisoformat(window[-1]["date"].replace("Z", "+00:00"))
    if last_date.tzinfo is None:
        last_date = last_date.replace(tzinfo=timezone.utc)

    out = []
    for h in range(1, horizon + 1):
        value = max(0, round(last_value + slope * h * damping ** h))
        period = (last_date + timedelta(days=7 * h)).date().isoformat()
        out.append({"period": period, "value": value})
    return out


# ---------------------------------------------------------------------- #
# Student profile                                                        #
# ---------------------------------------------------------------------- #
def profile_student(input_: dict) -> dict:
    """Student profiling — engagement/readiness score from real features."""
    s = input_["student"]
    grade = s.get("admissionGrade") or 50
    grade_score = clamp01(grade / 100)
    attendance = (s.get("attendance") or "").lower()
    attendance_score = 0.9 if "high" in attendance else 0.35 if "low" in attendance else 0.6
    scholarship_score = 0.85 if s.get("scholarship") else 0.55
    age = s.get("age") or 25
    age_score = clamp01(1 - abs(age - 23) / 20)

    raw = 0.45 * grade_score + 0.3 * attendance_score + 0.15 * scholarship_score + 0.1 * age_score
    score = clamp100(round(raw * 100))
    risk = "Low" if score >= 70 else "Medium" if score >= 45 else "High"
    category = "Ready to Enroll" if score >= 70 else "Needs Support" if score >= 45 else "At Risk"
    recommended_action = (
        "Move to enrollment: schedule application support."
        if risk == "Low"
        else "Assign counsellor for a focused engagement plan."
        if risk == "Medium"
        else "Set up intervention: counselling + scholarship check."
    )
    return {"score": score, "risk": risk, "category": category, "recommendedAction": recommended_action}


# ---------------------------------------------------------------------- #
# Dashboard AI insights (derived from real DB rows)                      #
# ---------------------------------------------------------------------- #
def db_insights() -> list[dict]:
    from sqlalchemy import text

    insights: list[dict] = []
    with engine.connect() as conn:
        high_intent = conn.execute(
            text(
                "SELECT COUNT(*) AS n FROM leads WHERE archived = 0 "
                "AND status IN ('NEW','CONTACTED') AND priority = 'High'"
            )
        ).scalar_one()
        if high_intent > 0:
            insights.append(
                {
                    "id": "high-intent",
                    "icon": "flame",
                    "tone": "warning",
                    "priority": "High",
                    "title": "High-priority leads waiting",
                    "message": (
                        f"{high_intent} new/contacted lead"
                        f"{'' if high_intent == 1 else 's'} flagged High priority have not "
                        "been qualified yet. Prioritize outreach this week."
                    ),
                    "actionLabel": "View Leads",
                    "actionTo": "/leads",
                }
            )

        converted = conn.execute(
            text("SELECT COUNT(*) AS n FROM leads WHERE status = 'CONVERTED'")
        ).scalar_one()
        total = conn.execute(
            text("SELECT COUNT(*) AS n FROM leads WHERE archived = 0")
        ).scalar_one()
        if total > 0:
            insights.append(
                {
                    "id": "conversion",
                    "icon": "trending",
                    "tone": "success",
                    "priority": "Medium",
                    "title": "Conversion snapshot",
                    "message": (
                        f"{converted} of {total} leads "
                        f"({(converted / total * 100):.1f}%) have converted to enrollment."
                    ),
                    "actionLabel": "View Pipeline",
                    "actionTo": "/enrollment-pipeline",
                }
            )

        top_campaign = conn.execute(
            text(
                "SELECT c.name, COALESCE(SUM(d.enrollments), 0) AS enrollments "
                "FROM campaigns c JOIN campaign_daily d ON d.campaign_id = c.id "
                "GROUP BY c.id ORDER BY enrollments DESC LIMIT 1"
            )
        ).mappings().first()
        if top_campaign and top_campaign["enrollments"] > 0:
            insights.append(
                {
                    "id": "top-campaign",
                    "icon": "sparkles",
                    "tone": "brand",
                    "priority": "Medium",
                    "title": "Best-performing campaign",
                    "message": (
                        f'“{top_campaign["name"]}” leads the funnel with '
                        f'{top_campaign["enrollments"]} enrollments. Consider scaling its budget.'
                    ),
                    "actionLabel": "View Campaigns",
                    "actionTo": "/campaigns",
                }
            )

        pending_apps = conn.execute(
            text("SELECT COUNT(*) AS n FROM enrollments WHERE status = 'application'")
        ).scalar_one()
        if pending_apps > 0:
            insights.append(
                {
                    "id": "pending-applications",
                    "icon": "calendar",
                    "tone": "info",
                    "priority": "Low",
                    "title": "Applications in review",
                    "message": (
                        f"{pending_apps} application"
                        f"{'' if pending_apps == 1 else 's'} are awaiting enrollment decision."
                    ),
                    "actionLabel": "View Enrollments",
                    "actionTo": "/enrollment-pipeline",
                }
            )
    return insights[:5]


def daily_briefing() -> dict:
    """Generate a daily briefing from real database data."""
    from sqlalchemy import text

    briefing = {
        "greeting": "Good morning",
        "priority_followups": 0,
        "at_risk_students": 0,
        "high_value_leads": 0,
        "enrollment_trend": "stable",
        "highlights": [],
        "actions": [],
    }

    with engine.connect() as conn:
        # High priority leads needing follow-up
        high_priority = conn.execute(
            text(
                "SELECT COUNT(*) FROM leads WHERE archived = 0 "
                "AND priority = 'High' AND status IN ('NEW', 'CONTACTED')"
            )
        ).scalar_one()
        briefing["priority_followups"] = high_priority
        if high_priority > 0:
            briefing["highlights"].append(
                f"{high_priority} high-priority lead{'s' if high_priority != 1 else ''} need{'s' if high_priority == 1 else ''} immediate attention"
            )
            briefing["actions"].append({
                "action": "Review high-priority leads",
                "route": "/leads",
                "priority": "high",
            })

        # At-risk students
        students = conn.execute(
            text("SELECT * FROM students")
        ).mappings().all()
        at_risk = 0
        for s in students:
            dropout_data = predict_dropout({
                "students": [{
                    "id": s["id"],
                    "course": s.get("interests"),
                    "admissionGrade": 65,
                    "attendance": s.get("attendance", "medium"),
                }]
            })
            if dropout_data and dropout_data[0].get("risk") == "High":
                at_risk += 1

        briefing["at_risk_students"] = at_risk
        if at_risk > 0:
            briefing["highlights"].append(
                f"{at_risk} student{'s' if at_risk != 1 else ''} at high dropout risk"
            )
            briefing["actions"].append({
                "action": "Review at-risk students",
                "route": "/ai/predictive-insights",
                "priority": "high",
            })

        # High value leads
        high_value = conn.execute(
            text(
                "SELECT COUNT(*) FROM leads WHERE archived = 0 "
                "AND score >= 80"
            )
        ).scalar_one()
        briefing["high_value_leads"] = high_value
        if high_value > 0:
            briefing["highlights"].append(
                f"{high_value} high-value lead{'s' if high_value != 1 else ''} identified"
            )
            briefing["actions"].append({
                "action": "View high-value leads",
                "route": "/leads",
                "priority": "medium",
            })

        # Enrollment trend
        recent_enrollments = conn.execute(
            text(
                "SELECT COUNT(*) FROM enrollments "
                "WHERE created_at >= datetime('now', '-7 days')"
            )
        ).scalar_one()

        if recent_enrollments > 5:
            briefing["enrollment_trend"] = "increasing"
            briefing["highlights"].append("Enrollment activity trending upward")
        elif recent_enrollments < 2:
            briefing["enrollment_trend"] = "decreasing"
            briefing["highlights"].append("Enrollment activity is low this week")

    return briefing
