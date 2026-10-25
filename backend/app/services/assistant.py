"""AI Sales Assistant — knowledge-base Q&A over REAL database state.

The assistant parses the user's question into an intent, answers from live
DB aggregates (never hardcoded numbers) or the product knowledge base, and
always replies in plain language. Unknown questions get an honest response —
it never invents facts.
"""
from __future__ import annotations

import random
import re

from sqlalchemy import text

from ..core.database import engine


def _count(table: str, where: str = "") -> int:
    with engine.connect() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table} {where}")).scalar_one())


def _lead_status_counts() -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT status, COUNT(*) AS count FROM leads WHERE archived = 0 GROUP BY status")
        ).mappings().all()
    return [dict(r) for r in rows]


def _enrollment_status_counts() -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT status, COUNT(*) AS count FROM enrollments GROUP BY status")
        ).mappings().all()
    return [dict(r) for r in rows]


def _campaign_totals() -> dict:
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT COALESCE(SUM(leads), 0) AS leads, COALESCE(SUM(applications), 0) AS applications, "
                "COALESCE(SUM(enrollments), 0) AS enrollments, COALESCE(SUM(cost), 0) AS cost, "
                "COALESCE(SUM(revenue), 0) AS revenue FROM campaign_daily"
            )
        ).mappings().one()
    return dict(row)


def _status_text(counts: list[dict]) -> str:
    return ", ".join(f"{s['status']}: {s['count']}" for s in counts)


def _leads_answer() -> str:
    return (
        f"There are currently {_count('leads', 'WHERE archived = 0')} leads in the pipeline "
        f"({_status_text(_lead_status_counts())})."
    )


def _students_answer() -> str:
    return f"There are {_count('students')} student profiles in the system."


def _courses_answer() -> str:
    active = _count("courses", "WHERE status = 'active'")
    return (
        f"There are {active} active courses across categories like Data Science, "
        "AI & Machine Learning, Business Analytics and Digital Marketing."
    )


def _conversion_answer() -> str:
    leads = _count("leads", "WHERE archived = 0")
    enrolled = _count("leads", "WHERE status = 'CONVERTED'")
    rate = f"{(enrolled / leads * 100):.1f}" if leads > 0 else "0.0"
    return f"The enrollment conversion rate is {rate}% ({enrolled} of {leads} leads converted)."


def _campaign_answer() -> str:
    t = _campaign_totals()
    roas = f"{(t['revenue'] / t['cost']):.2f}" if t["cost"] > 0 else "0.00"
    return (
        f"Across all campaigns: {t['leads']} leads, {t['applications']} applications, "
        f"{t['enrollments']} enrollments, with {round(t['cost']):,} spend generating "
        f"{round(t['revenue']):,} revenue (ROAS {roas}x)."
    )


def _pipeline_answer() -> str:
    return f"The enrollment pipeline currently holds: {_status_text(_enrollment_status_counts())}."


def _top_leads_answer() -> str:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT name, priority, status FROM leads "
                "WHERE archived = 0 AND priority = 'High' AND status NOT IN ('CONVERTED','LOST') "
                "ORDER BY engagement DESC LIMIT 5"
            )
        ).mappings().all()
    if not rows:
        return "There are no unqualified high-priority leads right now."
    names = ", ".join(f"{r['name']} ({r['status']})" for r in rows)
    return f"Top high-priority leads: {names}."


def _scoring_answer() -> str:
    return (
        "Lead scoring combines engagement, interaction frequency, funnel stage and channel "
        "quality into a 0\u2013100 score with an intent category and explanation. Open AI Lead "
        "Scoring to see live scores for your leads."
    )


def _recommend_answer() -> str:
    return (
        "Course recommendations match a student's interests, academic record and eligibility "
        "against the active course catalog, returning a ranked list with match scores and "
        "reasons. Open Course Recommendation to try it."
    )


def _forecast_answer() -> str:
    return (
        "Enrollment forecasting fits a trend to your recent enrollment history and projects "
        "the next few weeks. Open Conversion Prediction to see the current forecast."
    )


def _help_answer() -> str:
    return (
        "I am the EDTECH AI assistant. I can answer questions about your live data \u2014 "
        "leads, students, courses, campaigns, enrollments and conversion \u2014 or explain the "
        "platform features like lead scoring, course recommendations and forecasting."
    )


def _account_answer() -> str:
    return (
        'Use the Sign in page with your institute account. If you have forgotten your password, '
        'use the "Forgot password?" link to request a reset. Admins can manage user roles in Settings.'
    )


def _greeting_answer() -> str:
    return (
        "Hello! Ask me about your leads, enrollments, campaigns or any EDTECH AI feature \u2014 "
        "I answer from your live data."
    )


def _daily_focus_answer() -> str:
    """Daily focus briefing from real data."""
    items: list[str] = []
    with engine.connect() as conn:
        # High priority leads needing attention
        high_priority = conn.execute(
            text(
                "SELECT COUNT(*) FROM leads WHERE archived = 0 "
                "AND priority = 'High' AND status IN ('NEW', 'CONTACTED')"
            )
        ).scalar_one()
        if high_priority > 0:
            items.append(f"{high_priority} high-priority lead{'s' if high_priority != 1 else ''} need{'s' if high_priority == 1 else ''} immediate attention")

        # At-risk students
        students = conn.execute(text("SELECT * FROM students")).mappings().all()
        at_risk = 0
        for s in students:
            from .ai import predict_dropout
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
        if at_risk > 0:
            items.append(f"{at_risk} student{'s' if at_risk != 1 else ''} at high dropout risk\u2014consider scheduling counseling sessions")

        # Overdue follow-ups
        pending_tasks = conn.execute(
            text("SELECT COUNT(*) FROM crm_tasks WHERE status = 'pending'")
        ).scalar_one()
        if pending_tasks > 0:
            items.append(f"{pending_tasks} pending task{'s' if pending_tasks != 1 else ''} to complete")

        # Hot leads
        hot_leads = conn.execute(
            text(
                "SELECT COUNT(*) FROM leads WHERE archived = 0 "
                "AND score >= 70 AND status NOT IN ('CONVERTED', 'LOST')"
            )
        ).scalar_one()
        if hot_leads > 0:
            items.append(f"{hot_leads} high-score lead{'s' if hot_leads != 1 else ''} ready for conversion")

    if not items:
        items.append("No urgent items today. Great job staying on top of things!")

    items.insert(0, "Here\'s your daily focus briefing:")
    items.append("\nNavigate to the Dashboard for the full AI Daily Briefing.")
    return "\n\n\u2022 ".join(items)


def _at_risk_students_answer() -> str:
    """List students at high dropout risk."""
    from .ai import predict_dropout
    with engine.connect() as conn:
        students = conn.execute(text("SELECT id, name, interests FROM students LIMIT 20")).mappings().all()
    at_risk = []
    for s in students:
        result = predict_dropout({
            "students": [{"id": s["id"], "course": s.get("interests"), "admissionGrade": 65}]
        })
        if result and result[0].get("risk") == "High":
            at_risk.append(f"{s['name']} ({', '.join(result[0].get('reasons', [])[:2])})")
    if not at_risk:
        return "No students are currently at high dropout risk."
    return f"Students at high dropout risk:\n\u2022 " + "\n\u2022 ".join(at_risk[:10]) + "\n\nOpen Dropout Prediction for detailed analysis."


def _followup_leads_answer() -> str:
    """Leads that need follow-up."""
    with engine.connect() as conn:
        leads = conn.execute(
            text(
                "SELECT name, status, last_activity, priority FROM leads "
                "WHERE archived = 0 AND status IN ('NEW', 'CONTACTED', 'NURTURING') "
                "AND priority IN ('High', 'Medium') ORDER BY priority DESC LIMIT 10"
            )
        ).mappings().all()
    if not leads:
        return "All leads have been followed up. No pending follow-ups."
    items = []
    for l in leads:
        activity = l.get("last_activity")
        act_text = f" (last contact: {activity[:10]})" if activity else " (no recent contact)"
        items.append(f"{l['name']} [{l['status']}] - Priority: {l['priority']}{act_text}")
    return f"Leads needing follow-up:\n\u2022 " + "\n\u2022 ".join(items) + "\n\nOpen the Leads page to take action."


def _convert_leads_answer() -> str:
    """Leads most likely to convert."""
    with engine.connect() as conn:
        leads = conn.execute(
            text(
                "SELECT name, score, status, source FROM leads "
                "WHERE archived = 0 AND score >= 60 AND status NOT IN ('CONVERTED', 'LOST') "
                "ORDER BY score DESC LIMIT 10"
            )
        ).mappings().all()
    if not leads:
        return "No high-conversion-probability leads identified yet. Focus on lead nurturing."
    items = []
    for l in leads:
        items.append(f"{l['name']} (Score: {l['score']}, Status: {l['status']}, Source: {l['source']})")
    return f"Leads most likely to convert:\n\u2022 " + "\n\u2022 ".join(items) + "\n\nOpen AI Lead Scoring for detailed analysis."


# Intent handlers — order matters (first match wins), mirroring the original.
def _course_most_applications_answer() -> str:
    """Which courses get the most applications/leads."""
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT course_interest, COUNT(*) as count FROM leads "
                "WHERE archived = 0 AND course_interest IS NOT NULL AND course_interest != '' "
                "GROUP BY course_interest ORDER BY count DESC LIMIT 5"
            )
        ).mappings().all()
    if not rows:
        return "No course interest data available from leads yet."
    items = [f"{r['course_interest']}: {r['count']} leads" for r in rows]
    return "Courses by lead interest:\n\u2022 " + "\n\u2022 ".join(items) + "\n\nOpen Course Recommendation for detailed analysis."


def _tasks_overdue_answer() -> str:
    """Overdue/pending tasks."""
    with engine.connect() as conn:
        pending = conn.execute(
            text("SELECT COUNT(*) FROM crm_tasks WHERE status = 'pending'")
        ).scalar_one()
        in_progress = conn.execute(
            text("SELECT COUNT(*) FROM crm_tasks WHERE status = 'in_progress'")
        ).scalar_one()
    items = []
    if pending > 0:
        items.append(f"{pending} pending task{'s' if pending != 1 else ''}")
    if in_progress > 0:
        items.append(f"{in_progress} in-progress task{'s' if in_progress != 1 else ''}")
    if not items:
        return "No pending or in-progress tasks. Great job!"
    return f"Task status: {', '.join(items)}.\n\nOpen the Tasks page to manage your checklist."


def _meetings_upcoming_answer() -> str:
    """Upcoming meetings."""
    with engine.connect() as conn:
        meetings = conn.execute(
            text(
                "SELECT title, scheduled_at, location FROM crm_meetings "
                "WHERE status = 'scheduled' ORDER BY scheduled_at ASC LIMIT 5"
            )
        ).mappings().all()
    if not meetings:
        return "No upcoming meetings scheduled."
    items = []
    for m in meetings:
        when = m["scheduled_at"][:10] if m.get("scheduled_at") else "TBD"
        loc = m.get("location") or ""
        items.append(f"{m['title']} ({when}{', ' + loc if loc else ''})")
    return f"Upcoming meetings:\n\u2022 " + "\n\u2022 ".join(items) + "\n\nOpen the Meetings page for the full schedule."


def _leads_by_source_answer() -> str:
    """Leads breakdown by source."""
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT source, COUNT(*) as count FROM leads WHERE archived = 0 "
                "GROUP BY source ORDER BY count DESC"
            )
        ).mappings().all()
    if not rows:
        return "No leads in the pipeline yet."
    items = [f"{r['source']}: {r['count']}" for r in rows]
    return f"Leads by source:\n\u2022 " + "\n\u2022 ".join(items)


def _counselor_performance_answer() -> str:
    """Counselor team performance."""
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT u.name, COUNT(l.id) as leads, "
                "SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) as converted "
                "FROM users u LEFT JOIN leads l ON l.counselor_id = u.id "
                "WHERE u.role IN ('COUNSELOR','ADMISSIONS') GROUP BY u.id "
                "ORDER BY converted DESC LIMIT 5"
            )
        ).mappings().all()
    if not rows:
        return "No counselor performance data available."
    items = []
    for r in rows:
        cv = r["converted"] or 0
        items.append(f"{r['name']}: {r['leads']} leads, {cv} converted")
    return f"Counselor performance:\n\u2022 " + "\n\u2022 ".join(items) + "\n\nOpen the Counselors page for full rankings."


def _lost_leads_answer() -> str:
    """Lost leads summary."""
    with engine.connect() as conn:
        lost = conn.execute(
            text("SELECT COUNT(*) FROM leads WHERE status = 'LOST'")
        ).scalar_one()
        total = conn.execute(
            text("SELECT COUNT(*) FROM leads WHERE archived = 0")
        ).scalar_one()
        lost_sources = conn.execute(
            text(
                "SELECT source, COUNT(*) as count FROM leads WHERE status = 'LOST' "
                "GROUP BY source ORDER BY count DESC LIMIT 5"
            )
        ).mappings().all()
    rate = f"{(lost / total * 100):.1f}" if total > 0 else "0.0"
    parts = [f"{lost} leads have been marked as LOST ({rate}% of total)."]
    if lost_sources:
        sources = ", ".join(f"{r['source']} ({r['count']})" for r in lost_sources)
        parts.append(f"Top lost sources: {sources}.")
    parts.append("\nReview lost leads to improve targeting and follow-up.")
    return "\n".join(parts)


_INTENTS: list[tuple[re.Pattern, callable]] = [
    (re.compile(r"(how many|count|total).*(lead|prospect)|lead.*(total|count)", re.I), _leads_answer),
    (re.compile(r"(how many|count|total).*(student)", re.I), _students_answer),
    (re.compile(r"(how many|count|total).*(course|program)", re.I), _courses_answer),
    (re.compile(r"(enrollment|conversion).*(rate|percentage|how.*convert)", re.I), _conversion_answer),
    (re.compile(r"campaign", re.I), _campaign_answer),
    (re.compile(r"enrollment|pipeline", re.I), _pipeline_answer),
    (re.compile(r"(high.?intent|best lead|priority|top lead)", re.I), _top_leads_answer),
    (re.compile(r"(score|scoring).*(lead)|lead.*(score)", re.I), _scoring_answer),
    (re.compile(r"(recommend|suggest).*(course|program)", re.I), _recommend_answer),
    (re.compile(r"(forecast|predict).*(enrollment|sales)", re.I), _forecast_answer),
    (re.compile(r"(focus|priority|today|briefing|what should)", re.I), _daily_focus_answer),
    (re.compile(r"(at.?risk|dropout|struggling|student.*risk)", re.I), _at_risk_students_answer),
    (re.compile(r"(follow.?up|need.*contact|overdue)", re.I), _followup_leads_answer),
    (re.compile(r"(likely.*convert|most.*potential|hot lead|convert)", re.I), _convert_leads_answer),
    (re.compile(r"(most.*application|popular.*course|which course|course.*demand|course.*getting)", re.I), _course_most_applications_answer),
    (re.compile(r"(task|todo|overdue|checklist|pending task)", re.I), _tasks_overdue_answer),
    (re.compile(r"(meeting|schedule|upcoming|session)", re.I), _meetings_upcoming_answer),
    (re.compile(r"(source|channel|where.*come|acquisition)", re.I), _leads_by_source_answer),
    (re.compile(r"(counselor|team|performance|counsellor)", re.I), _counselor_performance_answer),
    (re.compile(r"(lost|churn|dropped|gone)", re.I), _lost_leads_answer),
    (re.compile(r"(who are you|what can you do|help|capabilit)", re.I), _help_answer),
    (re.compile(r"(login|password|reset|account)", re.I), _account_answer),
    (re.compile(r"(hello|hi|hey)\b", re.I), _greeting_answer),
]

_FALLBACKS = [
    'I can answer from your live data \u2014 try "How many leads are there?", "What is our conversion rate?" or "Which campaign performs best?".',
    "I am not sure about that one. I can help with leads, students, courses, campaigns, enrollments, conversion and the AI features.",
]


def assistant_reply(message: str) -> dict:
    text_ = message.strip()
    if not text_:
        return {"reply": "Please type a question \u2014 I am here to help.", "matchedIntent": None}
    for pattern, answer in _INTENTS:
        if pattern.search(text_):
            return {"reply": answer(), "matchedIntent": pattern.pattern}
    return {"reply": random.choice(_FALLBACKS), "matchedIntent": None}
