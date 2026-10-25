"""Executive dashboard — every number computed from real database rows.

Mirrors the exact shape the frontend consumes (`DashboardData`), so the app
can prefer this API and fall back to its local dataset computation when the
backend is unreachable.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from ..core.database import engine
from .ai import db_insights


def _fmt_int(n: float) -> str:
    return f"{round(n):,}"


def _fmt_pct(n: float) -> str:
    return f"{n:.1f}%"


def _fmt_compact(n: float) -> str:
    abs_n = abs(n)
    if abs_n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if abs_n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(round(n))


RANGE_DAYS: dict[str, int | None] = {"7d": 7, "30d": 30, "90d": 90, "all": None}


def _query(sql: str, params: dict | None = None) -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(text(sql), params or {}).mappings().all()
    return [dict(r) for r in rows]


def _scalar(sql: str, params: dict | None = None) -> int:
    with engine.connect() as conn:
        return int(conn.execute(text(sql), params or {}).scalar_one())


def _delta_for(series: list[dict], window_days: int) -> dict:
    """Percent change vs the previous equal-length window of a daily series."""
    recent = series[-window_days:]
    prev = series[-2 * window_days:-window_days]
    recent_sum = sum(p["count"] for p in recent)
    prev_sum = sum(p["count"] for p in prev)
    if prev_sum <= 0:
        return {"delta": 0, "available": False}
    return {"delta": (recent_sum - prev_sum) / prev_sum * 100, "available": True}


def _to_spark(series: list[dict], size: int = 12) -> list[int]:
    if len(series) <= size:
        return [p["count"] for p in series]
    step = math.ceil(len(series) / size)
    out = []
    for i in range(0, len(series), step):
        out.append(sum(p["count"] for p in series[i:i + step]))
    return out


def _windowed(series: list[dict], days: int | None) -> int:
    if days is None:
        return sum(p["count"] for p in series)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date().isoformat()
    return sum(p["count"] for p in series if p["date"] >= cutoff)


def _leads_daily_series() -> list[dict]:
    return _query(
        "SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count "
        "FROM leads WHERE archived = 0 GROUP BY date ORDER BY date"
    )


def _enrollment_series(days: int) -> list[dict]:
    rows = _query(
        "SELECT substr(enrollment_date, 1, 10) AS date, COUNT(*) AS count "
        "FROM enrollments WHERE enrollment_date IS NOT NULL GROUP BY date ORDER BY date"
    )
    by_date = {r["date"]: r["count"] for r in rows}
    out = []
    for d in range(days - 1, -1, -1):
        date = (datetime.now(timezone.utc) - timedelta(days=d)).date().isoformat()
        out.append({"date": date, "count": by_date.get(date, 0)})
    return out


def _time_ago(iso: str) -> str:
    try:
        ts = datetime.fromisoformat(iso)
    except ValueError:
        return "—"
    seconds = max(0, (datetime.now(timezone.utc) - ts).total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds / 60
    if minutes < 60:
        return f"{int(minutes)}m ago"
    hours = minutes / 60
    if hours < 24:
        return f"{int(hours)}h ago"
    days = hours / 24
    if days < 30:
        return f"{int(days)}d ago"
    months = days / 30
    if months < 12:
        return f"{int(months)}mo ago"
    return f"{int(months / 12)}y ago"


def _lead_status_counts() -> dict[str, int]:
    return {r["status"]: r["count"] for r in _query(
        "SELECT status, COUNT(*) AS count FROM leads WHERE archived = 0 GROUP BY status"
    )}


def dashboard_stats(range_: str = "30d") -> dict:
    days = RANGE_DAYS.get(range_, 30)

    # ------------------------------- KPIs ------------------------------ #
    counts = _lead_status_counts()
    total_leads = sum(counts.values())
    qualified = counts.get("QUALIFIED", 0)
    converted = counts.get("CONVERTED", 0)
    active = sum(counts.get(s, 0) for s in ("NEW", "CONTACTED", "NURTURING"))
    total_students = _scalar("SELECT COUNT(*) FROM students")
    total_courses = _scalar("SELECT COUNT(*) FROM courses WHERE status = 'active'")
    enrolled_count = _scalar("SELECT COUNT(*) FROM enrollments WHERE status = 'enrolled'")
    revenue = round(_scalar("SELECT COALESCE(SUM(revenue), 0) FROM campaign_daily"))

    leads_series = _leads_daily_series()
    enroll_series = _enrollment_series(90)
    leads_delta = _delta_for(leads_series, days or 30)
    conversion_rate = converted / total_leads * 100 if total_leads > 0 else 0

    kpis = [
        {
            "id": "total-leads",
            "label": "Total Leads",
            "value": _fmt_int(_windowed(leads_series, days)),
            "delta": round(leads_delta["delta"], 1),
            "deltaAvailable": leads_delta["available"],
            "caption": "All time" if days is None else f"Last {days} days",
            "accent": "indigo",
            "icon": "users",
            "spark": _to_spark(leads_series[-(days if days else 60):]),
        },
        {
            "id": "qualified-leads",
            "label": "Qualified Leads",
            "value": _fmt_int(qualified),
            "delta": round(qualified / total_leads * 100, 1) if total_leads > 0 else 0,
            "deltaAvailable": total_leads > 0,
            "caption": f"{(qualified / max(1, total_leads)) * 100:.1f}% of total leads",
            "accent": "violet",
            "icon": "user-check",
            "spark": [],
        },
        {
            "id": "enrollment-conversion",
            "label": "Enrollment Conversion",
            "value": _fmt_pct(conversion_rate),
            "delta": 0,
            "deltaAvailable": False,
            "caption": "Converted / total leads",
            "accent": "emerald",
            "icon": "percent",
            "spark": [],
        },
        {
            "id": "active-opportunities",
            "label": "Active Opportunities",
            "value": _fmt_int(active),
            "delta": 0,
            "deltaAvailable": False,
            "caption": "New + contacted + nurturing",
            "accent": "sky",
            "icon": "briefcase",
            "spark": [],
        },
        {
            "id": "total-students",
            "label": "Total Students",
            "value": _fmt_int(total_students),
            "delta": 0,
            "deltaAvailable": False,
            "caption": f"{total_courses} active courses",
            "accent": "amber",
            "icon": "graduation-cap",
            "spark": [],
        },
        {
            "id": "revenue-pipeline",
            "label": "Revenue Pipeline",
            "value": _fmt_compact(revenue),
            "delta": 0,
            "deltaAvailable": False,
            "caption": "Recorded campaign revenue",
            "accent": "rose",
            "icon": "indian-rupee",
            "spark": [],
        },
    ]

    # ------------------------------ Trends ----------------------------- #
    enroll_by_date = {p["date"]: p["count"] for p in enroll_series}
    lead_by_date = {p["date"]: p["count"] for p in leads_series}
    dates = sorted(set(list(lead_by_date.keys()) + list(enroll_by_date.keys())))
    trend_points = [
        {
            "label": date[5:],
            "leads": lead_by_date.get(date, 0),
            "qualified": None,
            "enrollments": enroll_by_date.get(date, 0),
        }
        for date in dates[-45:]
    ]
    trends = {
        "30d": trend_points[-30:],
        "90d": trend_points[-60:],
        "6m": trend_points,
        "1y": trend_points,
    }

    # ------------------------------ Funnel ----------------------------- #
    applications = _scalar(
        "SELECT COUNT(*) FROM enrollments WHERE status IN ('application','enrolled')"
    )
    stage_defs = [
        {"id": "new", "name": "New Leads", "count": total_leads},
        {"id": "qualified", "name": "Qualified", "count": qualified},
        {"id": "application", "name": "Applications", "count": applications},
        {"id": "enrolled", "name": "Enrolled", "count": enrolled_count},
    ]
    visible = [s for s in stage_defs if s["count"] > 0]
    funnel = []
    for index, stage in enumerate(visible):
        first = visible[0]["count"] or 1
        prev = first if index == 0 else visible[index - 1]["count"]
        funnel.append(
            {
                "id": stage["id"],
                "name": stage["name"],
                "count": stage["count"],
                "pctOfTotal": round(stage["count"] / first * 100, 1),
                "conversion": round(stage["count"] / prev * 100, 1),
            }
        )

    # --------------------------- Course perf --------------------------- #
    course_rows = _query(
        "SELECT c.id, c.title AS name, COUNT(e.id) AS enrollments, "
        "COALESCE(SUM(CASE WHEN e.payment_status = 'paid' THEN c.fees ELSE 0 END), 0) AS revenue "
        "FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'enrolled' "
        "WHERE c.status = 'active' GROUP BY c.id ORDER BY enrollments DESC LIMIT 6"
    )
    courses = [
        {
            "id": c["id"],
            "name": c["name"],
            "enrollments": c["enrollments"],
            "revenue": _fmt_compact(c["revenue"]),
        }
        for c in course_rows
    ]

    # --------------------------- Recent leads -------------------------- #
    recent_rows = _query(
        "SELECT l.*, u.name AS counselor_name FROM leads l "
        "LEFT JOIN users u ON u.id = l.counselor_id "
        "WHERE l.archived = 0 ORDER BY l.created_at DESC LIMIT 8"
    )
    recent = [
        {
            "id": r["id"],
            "name": r["name"],
            "course": r["course_interest"] or "—",
            "score": r["score"] or 0,
            "status": r["status"][0] + r["status"][1:].lower(),
            "source": r["source"],
            "lastActivity": _time_ago(r["last_activity"]) if r["last_activity"] else "—",
        }
        for r in recent_rows
    ]

    # ------------------------- Recent activity ------------------------- #
    activity_rows = _query(
        "SELECT a.*, u.name AS user_name, l.name AS lead_name FROM activities a "
        "LEFT JOIN users u ON u.id = a.user_id LEFT JOIN leads l ON l.id = a.lead_id "
        "ORDER BY a.created_at DESC LIMIT 10"
    )
    activity = [
        {"id": a["id"], "type": a["kind"], "text": a["note"], "time": _time_ago(a["created_at"])}
        for a in activity_rows
    ]

    # ---------------------- Enrollment trends (monthly) ----------------- #
    monthly: dict[str, int] = {}
    for p in enroll_series:
        month = p["date"][:7]
        monthly[month] = monthly.get(month, 0) + p["count"]
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    enrollment_trends = []
    for month in sorted(monthly)[-12:]:
        enrollment_trends.append(
            {
                "label": month_names[int(month[5:7]) - 1],
                "newEnrollments": monthly[month],
            }
        )

    return {
        "kpis": kpis,
        "trends": trends,
        "funnel": funnel,
        "enrollmentTrends": enrollment_trends,
        "aiInsights": db_insights(),
        "recentLeads": recent,
        "courses": courses,
        "recentActivity": activity,
    }


# ===================== Enhanced Analytics ========================= #


def _enrollment_status_counts() -> dict[str, int]:
    return {r["status"]: r["count"] for r in _query(
        "SELECT status, COUNT(*) AS count FROM enrollments GROUP BY status"
    )}


def _lead_source_distribution() -> list[dict]:
    return _query(
        "SELECT source, COUNT(*) AS count FROM leads WHERE archived = 0 "
        "GROUP BY source ORDER BY count DESC"
    )


def _counselor_leaderboard() -> list[dict]:
    return _query(
        "SELECT u.name, u.email, u.role, "
        "COUNT(l.id) AS leads, "
        "SUM(CASE WHEN l.status IN ('QUALIFIED','NURTURING','CONVERTED') THEN 1 ELSE 0 END) AS qualified, "
        "SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted, "
        "(SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status IN ('pending','in_progress')) AS open_tasks, "
        "CASE WHEN COUNT(l.id) > 0 THEN ROUND(100.0 * SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) / COUNT(l.id), 1) ELSE NULL END AS conversion_rate "
        "FROM users u LEFT JOIN leads l ON l.counselor_id = u.id AND l.archived = 0 "
        "WHERE u.role IN ('COUNSELOR','ADMISSIONS') GROUP BY u.id ORDER BY conversion_rate DESC NULLS LAST"
    )


def _application_status_distribution() -> list[dict]:
    return _query(
        "SELECT status, COUNT(*) AS count FROM enrollments GROUP BY status ORDER BY count DESC"
    )


def _dropout_risk_distribution() -> list[dict]:
    from .ai import predict_dropout
    students = _query("SELECT id, interests FROM students LIMIT 200")
    risk_counts = {"High": 0, "Medium": 0, "Low": 0}
    for s in students:
        result = predict_dropout({"students": [{"id": s["id"], "course": s.get("interests"), "admissionGrade": 65}]})
        if result:
            risk = result[0].get("risk", "Low")
            risk_counts[risk] = risk_counts.get(risk, 0) + 1
    return [{"risk": k, "count": v} for k, v in risk_counts.items() if v > 0]


def _active_students_count() -> int:
    return _scalar("SELECT COUNT(*) FROM students")


def _at_risk_students_count() -> int:
    from .ai import predict_dropout
    students = _query("SELECT id, interests FROM students LIMIT 200")
    count = 0
    for s in students:
        result = predict_dropout({"students": [{"id": s["id"], "course": s.get("interests"), "admissionGrade": 65}]})
        if result and result[0].get("risk") == "High":
            count += 1
    return count


def _application_count() -> int:
    return _scalar("SELECT COUNT(*) FROM enrollments WHERE status IN ('application', 'enrolled')")


def enhanced_dashboard_stats(range_: str = "30d") -> dict:
    """Full analytics dashboard with all charts, KPIs and period comparison."""
    base = dashboard_stats(range_)
    days = RANGE_DAYS.get(range_, 30)

    # --- Enhanced KPIs ---
    total_leads = _scalar("SELECT COUNT(*) FROM leads WHERE archived = 0")
    qualified = _scalar("SELECT COUNT(*) FROM leads WHERE status = 'QUALIFIED'")
    applications = _application_count()
    enrolled = _scalar("SELECT COUNT(*) FROM enrollments WHERE status = 'enrolled'")
    active_students = _active_students_count()
    at_risk = _at_risk_students_count()
    revenue = round(_scalar("SELECT COALESCE(SUM(revenue), 0) FROM campaign_daily"))
    conversion_rate = round(qualified / max(1, total_leads) * 100, 1)
    total_enrolled = _scalar("SELECT COUNT(*) FROM enrollments")

    # --- Period comparison ---
    prev_kpis = {}
    if days:
        leads_series = _leads_daily_series()
        cutoff_recent = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        cutoff_prev = (datetime.now(timezone.utc) - timedelta(days=days * 2)).date().isoformat()
        recent_count = sum(p["count"] for p in leads_series if p["date"] >= cutoff_recent)
        prev_count = sum(p["count"] for p in leads_series if cutoff_prev <= p["date"] < cutoff_recent)
        if prev_count > 0:
            prev_kpis = {
                "leads": {"current": recent_count, "previous": prev_count, "change_pct": round((recent_count - prev_count) / prev_count * 100, 1)},
            }

    base["enhancedKpis"] = {
        "total_leads": total_leads,
        "qualified_leads": qualified,
        "applications": applications,
        "enrollments": enrolled,
        "total_enrolled": total_enrolled,
        "conversion_rate": conversion_rate,
        "active_students": active_students,
        "at_risk_students": at_risk,
        "revenue": revenue,
        "period_comparison": prev_kpis,
    }

    base["sourceDistribution"] = _lead_source_distribution()
    base["counselorLeaderboard"] = _counselor_leaderboard()
    base["applicationStatusDistribution"] = _application_status_distribution()
    base["dropoutRiskDistribution"] = _dropout_risk_distribution()

    # Enhanced funnel with all stages
    stages = []
    if total_leads > 0:
        stages.append({"id": "new", "name": "New Leads", "count": total_leads})
    if qualified > 0:
        stages.append({"id": "qualified", "name": "Qualified", "count": qualified})
    if applications > 0:
        stages.append({"id": "applications", "name": "Applications", "count": applications})
    if enrolled > 0:
        stages.append({"id": "enrolled", "name": "Enrolled", "count": enrolled})
    enhanced_funnel = []
    for i, stage in enumerate(stages):
        first = stages[0]["count"] or 1
        prev = first if i == 0 else stages[i - 1]["count"]
        enhanced_funnel.append({
            "id": stage["id"],
            "name": stage["name"],
            "count": stage["count"],
            "pctOfTotal": round(stage["count"] / first * 100, 1),
            "conversion": round(stage["count"] / prev * 100, 1),
        })
    base["enhancedFunnel"] = enhanced_funnel

    return base


def kpi_summary() -> dict:
    stats = dashboard_stats()
    enrolled = next(
        (s["count"] for s in _query("SELECT status, COUNT(*) AS count FROM enrollments GROUP BY status")
         if s["status"] == "enrolled"), 0)
    return {
        "totalLeads": stats["kpis"][0]["value"],
        "qualifiedLeads": stats["kpis"][1]["value"],
        "conversion": stats["kpis"][2]["value"],
        "activeOpportunities": stats["kpis"][3]["value"],
        "totalStudents": stats["kpis"][4]["value"],
        "enrollments": enrolled,
        "revenue": stats["kpis"][5]["value"],
    }
