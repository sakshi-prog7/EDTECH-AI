"""Demo seed — deterministic, reproducible demo data the whole product runs on.

Values are generated with a seeded PRNG (mulberry32), so every install gets
the same numbers and tests stay stable. This is clearly *demo* data: real
customer data replaces it via the normal CRUD APIs. The dashboard computes
its stats from these actual rows — nothing here fakes analytics.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from ..core.database import engine
from ..core.security import hash_password

_COURSES = [
    {"code": "DS-101", "title": "Data Science & Analytics", "category": "Data Science", "durationWeeks": 24, "fees": 145000, "eligibility": "Graduate (any stream)", "description": "Statistics, Python and machine learning foundations for business."},
    {"code": "BA-102", "title": "Business Analytics", "category": "Business", "durationWeeks": 20, "fees": 120000, "eligibility": "Graduate (commerce/business preferred)", "description": "Decision analytics, dashboards and data storytelling."},
    {"code": "AI-201", "title": "AI & Machine Learning", "category": "Artificial Intelligence", "durationWeeks": 28, "fees": 165000, "eligibility": "Graduate (engineering/science preferred)", "description": "Supervised learning, NLP and deployment pipelines."},
    {"code": "PY-103", "title": "Python Programming", "category": "Programming", "durationWeeks": 12, "fees": 55000, "eligibility": "Open to all", "description": "From zero to job-ready Python for automation and analysis."},
    {"code": "DM-104", "title": "Digital Marketing", "category": "Marketing", "durationWeeks": 16, "fees": 90000, "eligibility": "Open to all", "description": "Search, social, content and performance marketing."},
    {"code": "FN-105", "title": "Finance & Risk Management", "category": "Finance", "durationWeeks": 22, "fees": 130000, "eligibility": "Graduate (commerce preferred)", "description": "Financial modelling, risk and portfolio analytics."},
    {"code": "CS-106", "title": "Computer Science Fundamentals", "category": "Computer Science", "durationWeeks": 20, "fees": 110000, "eligibility": "Open to all", "description": "Algorithms, data structures and systems thinking."},
    {"code": "PS-107", "title": "Educational Psychology", "category": "Psychology", "durationWeeks": 18, "fees": 85000, "eligibility": "Open to all", "description": "Learning science and student engagement for educators."},
]

_FIRST = ["Aarav", "Diya", "Rohan", "Ananya", "Kabir", "Meera", "Vihaan", "Ishita", "Arjun", "Sara", "Aditya", "Priya", "Reyansh", "Anika", "Karan", "Tara", "Nikhil", "Zara", "Dev", "Maya", "Rahul", "Nisha", "Sameer", "Pooja"]
_LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Singh", "Kumar", "Menon", "Das", "Bose", "Chopra", "Malhotra", "Verma", "Joshi", "Kapoor", "Mehta", "Rao", "Saxena", "Bhatia"]

_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NURTURING", "CONVERTED", "LOST"]
_SOURCES = ["Website", "Instagram Ads", "Google Ads", "Referral", "Campus Event", "LinkedIn"]
_PRIORITIES = ["Low", "Medium", "High"]
_CATEGORY_INTERESTS = {
    "Data Science": ["python", "analytics", "data", "statistics"],
    "Artificial Intelligence": ["ai", "machine learning", "python", "models"],
    "Programming": ["coding", "python", "software"],
    "Business": ["business", "analytics", "marketing"],
    "Marketing": ["marketing", "social media", "brand"],
    "Finance": ["finance", "investing", "stocks"],
    "Computer Science": ["computers", "algorithms", "software"],
    "Psychology": ["psychology", "counseling", "education"],
}

_NOTE_POOLS = {
    "lead": ["New lead captured from website form.", "Lead imported from campus event.", "Referral lead received."],
    "contact": ["Introductory call completed.", "Email sent with course brochure.", "WhatsApp follow-up sent."],
    "followup": ["Follow-up scheduled for next week.", "Reminder call completed."],
    "application": ["Application submitted for course.", "Documents requested from applicant."],
    "meeting": ["Campus visit meeting held.", "Virtual counselling session completed."],
    "enrollment": ["Enrollment confirmed.", "Fee payment received — enrollment finalized."],
}


def _mulberry32(seed: int):
    a = seed

    def rand() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (t | 61))) & 0xFFFFFFFF
        t ^= t >> 14
        return t / 4294967296

    return rand


def _days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_database() -> None:
    """Insert demo data when the users table is empty (never re-seeds)."""
    with engine.connect() as conn:
        user_count = int(conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one())
        if user_count > 0:
            return

    with engine.begin() as conn:
        rand = _mulberry32(20260214)
        pick = lambda arr: arr[int(rand() * len(arr))]  # noqa: E731
        # ----------------------------- Users ----------------------------- #
        demo_users = [
            ("Sakshi Tiwari", "admin@edtech.ai", "ADMIN"),
            ("Rahul Verma", "counselor@edtech.ai", "COUNSELOR"),
            ("Anjali Menon", "admissions@edtech.ai", "ADMISSIONS"),
            ("Demo Student", "student@edtech.ai", "STUDENT"),
        ]
        user_ids: dict[str, str] = {}
        for name, email, role in demo_users:
            uid = str(uuid.uuid4())
            user_ids[role] = uid
            conn.execute(
                text(
                    "INSERT INTO users (id, name, email, password_hash, role, is_active, failed_login_attempts, locked_until, created_at, updated_at) "
                    "VALUES (:id, :name, :email, :hash, :role, 1, 0, NULL, :now, :now)"
                ),
                {"id": uid, "name": name, "email": email,
                 "hash": hash_password("demo1234"), "role": role, "now": _now()},
            )

        # ---------------------------- Courses ---------------------------- #
        for c in _COURSES:
            conn.execute(
                text(
                    "INSERT INTO courses (id, code, title, category, duration_weeks, fees, eligibility, description, status, created_at, updated_at) "
                    "VALUES (:id, :code, :title, :category, :dur, :fees, :elig, :desc, 'active', :now, :now)"
                ),
                {"id": str(uuid.uuid4()), "code": c["code"], "title": c["title"],
                 "category": c["category"], "dur": c["durationWeeks"], "fees": c["fees"],
                 "elig": c["eligibility"], "desc": c["description"], "now": _now()},
            )
        courses = [dict(r) for r in conn.execute(text("SELECT * FROM courses")).mappings().all()]
        course_by_code = {c["code"]: c for c in courses}

        # ----------------------------- Leads ----------------------------- #
        counselor_ids = [user_ids["COUNSELOR"], user_ids["ADMISSIONS"]]
        lead_ids: list[str] = []
        for i in range(48):
            lid = str(uuid.uuid4())
            lead_ids.append(lid)
            course = pick(courses)
            status = pick(_STATUSES)
            created_days_ago = int(rand() * 90)
            interactions = int(rand() * 12)
            engagement = min(
                100,
                round(interactions * 7 + rand() * 20
                      + (15 if status in ("CONVERTED", "QUALIFIED") else 0)),
            )
            conn.execute(
                text(
                    "INSERT INTO leads (id, name, email, phone, source, status, priority, course_interest, counselor_id, "
                    "engagement, interactions, last_activity, notes, score, score_reason, archived, created_at, updated_at) "
                    "VALUES (:id, :name, :email, :phone, :source, :status, :priority, :interest, :counselor, "
                    ":engagement, :interactions, :last_activity, :notes, NULL, NULL, 0, :created_at, :now)"
                ),
                {
                    "id": lid,
                    "name": f"{pick(_FIRST)} {pick(_LAST)}",
                    "email": f"lead{i + 1}@example.edu",
                    "phone": f"+91 9{int(100000000 + rand() * 899999999)}",
                    "source": pick(_SOURCES),
                    "status": status,
                    "priority": pick(_PRIORITIES),
                    "interest": course["code"],
                    "counselor": pick(counselor_ids) if rand() < 0.7 else None,
                    "engagement": engagement,
                    "interactions": interactions,
                    "last_activity": _days_ago(max(0, int(rand() * 14))),
                    "notes": "Interested in course fee structure and scholarship options." if rand() < 0.4 else None,
                    "created_at": _days_ago(created_days_ago),
                    "now": _now(),
                },
            )
        leads = [dict(r) for r in conn.execute(
            text("SELECT * FROM leads")).mappings().all()]

        # --------------------------- Students ---------------------------- #
        student_ids: list[str] = []
        for i in range(24):
            sid = str(uuid.uuid4())
            student_ids.append(sid)
            lead = leads[i % len(leads)]
            conn.execute(
                text(
                    "INSERT INTO students (id, name, email, phone, academic_level, interests, lead_id, created_at, updated_at) "
                    "VALUES (:id, :name, :email, :phone, :level, :interests, :lead_id, :created_at, :now)"
                ),
                {
                    "id": sid,
                    "name": f"{pick(_FIRST)} {pick(_LAST)}",
                    "email": f"student{i + 1}@example.edu",
                    "phone": f"+91 9{int(100000000 + rand() * 899999999)}",
                    "level": pick(["Bachelor (12th pass)", "Bachelor degree", "Working professional"]),
                    "interests": ", ".join(pick(list(_CATEGORY_INTERESTS.values()))),
                    "lead_id": lead["id"],
                    "created_at": _days_ago(int(rand() * 120)),
                    "now": _now(),
                },
            )

        # ------------------------- Enrollments --------------------------- #
        for lead in leads:
            course = course_by_code.get(lead["course_interest"]) or pick(courses)
            if not course:
                continue
            if lead["status"] == "CONVERTED":
                status = "enrolled"
            elif lead["status"] == "QUALIFIED":
                status = "application"
            elif lead["status"] in ("CONTACTED", "NURTURING"):
                status = "qualified"
            else:
                status = "lead"
            applied = rand() < 0.75
            enrolled = status == "enrolled"
            conn.execute(
                text(
                    "INSERT INTO enrollments (id, lead_id, student_id, course_id, status, application_date, enrollment_date, "
                    "counselor_id, payment_status, created_at, updated_at) "
                    "VALUES (:id, :lead_id, :student_id, :course_id, :status, :applied, :enrolled, :counselor, :payment, :created_at, :now)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "lead_id": lead["id"],
                    "student_id": pick(student_ids) if rand() < 0.5 else None,
                    "course_id": course["id"],
                    "status": status,
                    "applied": _days_ago(int(rand() * 40)) if applied else None,
                    "enrolled": _days_ago(int(rand() * 20)) if enrolled else None,
                    "counselor": pick(counselor_ids) if rand() < 0.7 else None,
                    "payment": pick(["paid", "partial"]) if enrolled else "pending",
                    "created_at": _days_ago(int(rand() * 90)),
                    "now": _now(),
                },
            )

        # -------------------------- Campaigns ---------------------------- #
        campaign_defs = [
            {"name": "Summer Intake — Digital", "type": "Digital", "platform": "Google Ads", "audience": "Graduates seeking upskilling", "budget": 250000},
            {"name": "AI Programs Launch", "type": "Social", "platform": "Instagram Ads", "audience": "Engineering graduates", "budget": 180000},
            {"name": "Scholarship Outreach", "type": "Email", "platform": "Email", "audience": "Shortlisted leads", "budget": 60000},
            {"name": "Campus Ambassador Drive", "type": "Event", "platform": "Campus", "audience": "Final-year students", "budget": 90000},
            {"name": "Business Analytics Push", "type": "Digital", "platform": "LinkedIn", "audience": "Working professionals", "budget": 140000},
        ]
        campaign_ids: list[str] = []
        for c in campaign_defs:
            cid = str(uuid.uuid4())
            campaign_ids.append(cid)
            started = int(rand() * 30)
            conn.execute(
                text(
                    "INSERT INTO campaigns (id, name, type, status, platform, audience, budget, starts_at, ends_at, created_at, updated_at) "
                    "VALUES (:id, :name, :type, 'active', :platform, :audience, :budget, :starts, :ends, :now, :now)"
                ),
                {"id": cid, "name": c["name"], "type": c["type"], "platform": c["platform"],
                 "audience": c["audience"], "budget": c["budget"],
                 "starts": _days_ago(started), "ends": _days_ago(-(60 - started)), "now": _now()},
            )
        # ~60 days of daily performance per campaign.
        for cid in campaign_ids:
            base_leads = 3 + rand() * 8
            for d in range(59, -1, -1):
                wave = 1 + (__import__("math").sin(d / 6) * 0.35)
                leads_n = max(0, round(base_leads * wave + rand() * 3))
                applications = round(leads_n * (0.25 + rand() * 0.2))
                enrollments = round(applications * (0.25 + rand() * 0.15))
                cost = round(leads_n * (120 + rand() * 150))
                revenue = round(enrollments * 95000 * (0.8 + rand() * 0.4))
                conn.execute(
                    text(
                        "INSERT INTO campaign_daily (id, campaign_id, date, leads, applications, enrollments, cost, revenue) "
                        "VALUES (:id, :cid, :date, :leads, :apps, :enrolls, :cost, :revenue)"
                    ),
                    {"id": str(uuid.uuid4()), "cid": cid, "date": _days_ago(d)[:10],
                     "leads": leads_n, "apps": applications, "enrolls": enrollments,
                     "cost": cost, "revenue": revenue},
                )

        # -------------------------- Activities --------------------------- #
        kinds = ["lead", "contact", "followup", "application", "meeting", "enrollment"]
        for lead in leads:
            for _ in range(1 + int(rand() * 3)):
                kind = pick(kinds)
                conn.execute(
                    text(
                        "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
                        "VALUES (:id, :lead_id, :user_id, :kind, :note, :created_at)"
                    ),
                    {"id": str(uuid.uuid4()), "lead_id": lead["id"],
                     "user_id": pick(counselor_ids) if rand() < 0.8 else None,
                     "kind": kind, "note": pick(_NOTE_POOLS[kind]),
                     "created_at": _days_ago(int(rand() * 20))},
                )

        # ----------------------- Opportunities --------------------------- #
        opp_stages = ["discovery", "proposal", "negotiation", "won", "lost"]
        for lead in leads:
            if rand() > 0.55:
                continue
            stage = pick(opp_stages)
            conn.execute(
                text(
                    "INSERT INTO opportunities (id, name, lead_id, value, stage, expected_close, owner_id, notes, created_at, updated_at) "
                    "VALUES (:id, :name, :lead_id, :value, :stage, :expected_close, :owner_id, :notes, :created_at, :now)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "name": f"{lead['course_interest'] or 'Enrollment'} intake — {lead['name'].split(' ')[0]}",
                    "lead_id": lead["id"],
                    "value": round(60000 + rand() * 150000),
                    "stage": stage,
                    "expected_close": None if stage == "lost" else _days_ago(int(rand() * 45)),
                    "owner_id": pick(counselor_ids) if rand() < 0.7 else None,
                    "notes": "Follow up after the fee consultation call." if rand() < 0.4 else None,
                    "created_at": _days_ago(int(rand() * 60)),
                    "now": _now(),
                },
            )

        # ---------------------------- Tasks ------------------------------ #
        task_titles = ["Intro call", "Send course brochure", "Fee consultation", "Follow-up reminder",
                       "Scholarship check", "Documents follow-up", "Campus visit", "Application review"]
        task_statuses = ["pending", "in_progress", "completed", "cancelled"]
        for _ in range(18):
            lead = pick(leads)
            status = pick(task_statuses)
            conn.execute(
                text(
                    "INSERT INTO tasks (id, title, lead_id, due_date, status, priority, assignee_id, notes, created_at, updated_at) "
                    "VALUES (:id, :title, :lead_id, :due, :status, :priority, :assignee, NULL, :created_at, :now)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "title": pick(task_titles),
                    "lead_id": lead["id"],
                    "due": (_days_ago(int(rand() * 10)) if status == "completed"
                            else _days_ago(-int(rand() * 7))),
                    "status": status,
                    "priority": pick(_PRIORITIES),
                    "assignee": pick(counselor_ids) if rand() < 0.75 else None,
                    "created_at": _days_ago(int(rand() * 15)),
                    "now": _now(),
                },
            )

        # --------------------------- Meetings ----------------------------- #
        meeting_titles = ["Discovery call", "Course counselling", "Fee discussion", "Application walkthrough", "Campus tour"]
        meeting_statuses = ["scheduled", "completed", "cancelled"]
        for _ in range(10):
            lead = pick(leads)
            status = pick(meeting_statuses)
            past = status == "completed"
            delta = -int(rand() * 20) if past else int(rand() * 10)
            scheduled = (datetime.now(timezone.utc) + timedelta(days=delta)).isoformat()
            conn.execute(
                text(
                    "INSERT INTO meetings (id, title, lead_id, scheduled_at, duration_min, location, notes, status, created_at, updated_at) "
                    "VALUES (:id, :title, :lead_id, :scheduled, :dur, :location, :notes, :status, :created_at, :now)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "title": pick(meeting_titles),
                    "lead_id": lead["id"],
                    "scheduled": scheduled,
                    "dur": 30 + int(rand() * 4) * 15,
                    "location": pick(["Video call", "Campus office", "Phone call", "Microsoft Teams"]),
                    "notes": "Rescheduled at the student request." if status == "cancelled" else None,
                    "status": status,
                    "created_at": _days_ago(int(rand() * 20)),
                    "now": _now(),
                },
            )

        # ------------------------ Notifications -------------------------- #
        notifications = [
            ("AI Insight", "High-intent leads detected", "12 leads currently score above 80 — prioritize outreach this week.", "/ai/lead-scoring"),
            ("System", "Demo database initialized", "The EDTECH AI backend is running with seeded demo data. Login with the demo accounts from README.md.", "/settings"),
            ("AI Insight", "Enrollment forecast updated", "Forecast projects strong conversions from the AI Programs campaign.", "/ai/predictive-insights"),
        ]
        for kind, title, desc, action in notifications:
            conn.execute(
                text(
                    "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
                    "VALUES (:id, :user_id, :kind, :title, :desc, 0, :action, :created_at)"
                ),
                {"id": str(uuid.uuid4()), "user_id": user_ids["ADMIN"], "kind": kind,
                 "title": title, "desc": desc, "action": action, "created_at": _days_ago(1)},
            )

        print("[seed] demo data inserted (users, courses, leads, students, enrollments, campaigns, activities, opportunities, tasks, meetings, notifications)")


def seed_demo_call_logs() -> None:
    """Backfill a few presentation-ready call intelligence records into an existing demo DB."""
    with engine.begin() as conn:
        count = int(conn.execute(text("SELECT COUNT(*) FROM call_logs")).scalar_one())
        if count > 0:
            return
        leads = conn.execute(text("SELECT id, name FROM leads ORDER BY created_at DESC LIMIT 6")).mappings().all()
        now = _now()
        samples = [
            ("Discovery call — AI & Machine Learning", "The student is very interested in AI and machine learning. They asked about fees, placement support and the next intake. They said the curriculum looks excellent and want a follow-up this week.", "Positive", "High", "Schedule a counselling follow-up and send fee + placement brochure."),
            ("Fee consultation — Data Science", "The prospect likes the Data Science program but said the fee is expensive. They asked about scholarship options and payment plans.", "Neutral", "Medium", "Send scholarship details and payment-plan options."),
            ("Application follow-up — Business Analytics", "The applicant completed most of the application and wants help with the remaining documents. They are ready to proceed after the document checklist is shared.", "Positive", "High", "Send document checklist and application completion link."),
            ("Course enquiry — Digital Marketing", "The lead is comparing Digital Marketing with other programs and asked about practical projects, duration and career outcomes.", "Neutral", "Medium", "Send comparison guide and invite the lead to a 15-minute counselling call."),
            ("Re-engagement call — Python Programming", "The student was previously interested but has not responded recently. They mentioned schedule concerns and asked whether weekend learning is possible.", "Neutral", "Low", "Send weekend-batch information and a short re-engagement email."),
        ]
        import json
        for i, (title, transcript, sentiment, intent, next_action) in enumerate(samples):
            lead_id = leads[i]["id"] if i < len(leads) else None
            conn.execute(text(
                "INSERT INTO call_logs (id, lead_id, title, transcript, duration_minutes, sentiment, summary, topics, objections, buying_intent, next_action, counselor_name, analyzed_by, created_at) "
                "VALUES (:id, :lead_id, :title, :transcript, :duration, :sentiment, :summary, :topics, :objections, :intent, :next_action, :counselor, 'baseline', :created_at)"
            ), {
                "id": str(uuid.uuid4()), "lead_id": lead_id, "title": title, "transcript": transcript,
                "duration": 12 + i * 4, "sentiment": sentiment,
                "summary": transcript[:180] + ("…" if len(transcript) > 180 else ""),
                "topics": json.dumps(["course interest", "fees", "next steps"]),
                "objections": json.dumps(["fee" ] if i == 1 else []),
                "intent": intent, "next_action": next_action, "counselor": "Sakshi Tiwari",
                "created_at": now,
            })
