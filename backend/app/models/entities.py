"""SQLAlchemy models — mirror the original SQLite schema 1:1.

All timestamps are stored as ISO-8601 strings (UTC), exactly like the
original TEXT columns, so the frontend's string slicing/parsing keeps working.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('ADMIN','COUNSELOR','ADMISSIONS','STUDENT')", name="ck_users_role"
        ),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="STUDENT")
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)

    def public(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("idx_refresh_tokens_user", "user_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class ResetToken(Base):
    __tablename__ = "reset_tokens"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[str] = mapped_column(String, nullable=False)
    used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("code", name="uq_courses_code"),
        CheckConstraint("status IN ('active','archived')", name="ck_courses_status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    duration_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    fees: Mapped[float] = mapped_column(Float, nullable=False)
    eligibility: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        CheckConstraint(
            "status IN ('NEW','CONTACTED','QUALIFIED','NURTURING','CONVERTED','LOST')",
            name="ck_leads_status",
        ),
        CheckConstraint("priority IN ('Low','Medium','High')", name="ck_leads_priority"),
        Index("idx_leads_status", "status"),
        Index("idx_leads_counselor", "counselor_id"),
        Index("idx_leads_archived", "archived"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String)
    source: Mapped[str] = mapped_column(String, nullable=False, default="Website")
    status: Mapped[str] = mapped_column(String, nullable=False, default="NEW")
    priority: Mapped[str] = mapped_column(String, nullable=False, default="Medium")
    course_interest: Mapped[str | None] = mapped_column(String)
    counselor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    engagement: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    interactions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_activity: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text)
    score: Mapped[float | None] = mapped_column(Float)
    score_reason: Mapped[str | None] = mapped_column(String)
    archived: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Student(Base):
    __tablename__ = "students"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String)
    academic_level: Mapped[str | None] = mapped_column(String)
    interests: Mapped[str | None] = mapped_column(Text)
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"))
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('lead','qualified','application','enrolled')",
            name="ck_enrollments_status",
        ),
        CheckConstraint(
            "payment_status IN ('pending','partial','paid')",
            name="ck_enrollments_payment",
        ),
        Index("idx_enrollments_status", "status"),
        Index("idx_enrollments_course", "course_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"))
    student_id: Mapped[str | None] = mapped_column(
        ForeignKey("students.id", ondelete="SET NULL")
    )
    course_id: Mapped[str] = mapped_column(
        ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="lead")
    application_date: Mapped[str | None] = mapped_column(String)
    enrollment_date: Mapped[str | None] = mapped_column(String)
    counselor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    payment_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','active','paused','completed')",
            name="ck_campaigns_status",
        ),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False, default="Digital")
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    platform: Mapped[str | None] = mapped_column(String)
    audience: Mapped[str | None] = mapped_column(Text)
    budget: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    starts_at: Mapped[str | None] = mapped_column(String)
    ends_at: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class CampaignDaily(Base):
    __tablename__ = "campaign_daily"
    __table_args__ = (Index("idx_campaign_daily_campaign", "campaign_id", "date"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[str] = mapped_column(String, nullable=False)
    leads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    applications: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enrollments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    revenue: Mapped[float] = mapped_column(Float, nullable=False, default=0)


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index("idx_activities_lead", "lead_id"),
        Index("idx_activities_created", "created_at"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    lead_id: Mapped[str | None] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE")
    )
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(String, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("idx_notifications_user", "user_id", "read"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String, nullable=False, default="System")
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    action_to: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Opportunity(Base):
    __tablename__ = "opportunities"
    __table_args__ = (
        CheckConstraint(
            "stage IN ('discovery','proposal','negotiation','won','lost')",
            name="ck_opportunities_stage",
        ),
        Index("idx_opportunities_stage", "stage"),
        Index("idx_opportunities_owner", "owner_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"))
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    stage: Mapped[str] = mapped_column(String, nullable=False, default="discovery")
    expected_close: Mapped[str | None] = mapped_column(String)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','in_progress','completed','cancelled')",
            name="ck_tasks_status",
        ),
        CheckConstraint("priority IN ('Low','Medium','High')", name="ck_tasks_priority"),
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_assignee", "assignee_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"))
    due_date: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    priority: Mapped[str] = mapped_column(String, nullable=False, default="Medium")
    assignee_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('scheduled','completed','cancelled')",
            name="ck_meetings_status",
        ),
        Index("idx_meetings_scheduled", "scheduled_at"),
        Index("idx_meetings_status", "status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"))
    scheduled_at: Mapped[str] = mapped_column(String, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    location: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, nullable=False, default="scheduled")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class LoginHistory(Base):
    __tablename__ = "login_history"
    __table_args__ = (Index("idx_login_history_user", "user_id", "created_at"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(String)
    user_agent: Mapped[str | None] = mapped_column(String)
    success: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (Index("idx_conversations_user", "user_id", "created_at"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False, default="New Conversation")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    __table_args__ = (Index("idx_conv_messages_conv", "conversation_id", "created_at"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    matched_intent: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class CampaignEmail(Base):
    __tablename__ = "campaign_emails"
    __table_args__ = (Index("idx_campaign_emails_campaign", "campaign_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    recipient_email: Mapped[str] = mapped_column(String, nullable=False)
    recipient_name: Mapped[str | None] = mapped_column(String)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="queued")  # queued|sent|delivered|opened|clicked|bounced
    sent_at: Mapped[str | None] = mapped_column(String)
    opened_at: Mapped[str | None] = mapped_column(String)
    clicked_at: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class WorkflowRule(Base):
    __tablename__ = "workflow_rules"
    __table_args__ = (Index("idx_workflow_rules_trigger", "trigger_event"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    trigger_event: Mapped[str] = mapped_column(String, nullable=False)  # lead_created, score_changed, status_changed
    conditions: Mapped[str | None] = mapped_column(Text)  # JSON
    actions: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"
    __table_args__ = (Index("idx_workflow_exec_rule", "rule_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    rule_id: Mapped[str] = mapped_column(
        ForeignKey("workflow_rules.id", ondelete="CASCADE"), nullable=False
    )
    lead_id: Mapped[str | None] = mapped_column(
        ForeignKey("leads.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="running")  # running|completed|failed
    result: Mapped[str | None] = mapped_column(Text)  # JSON
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    completed_at: Mapped[str | None] = mapped_column(String)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("idx_audit_user", "user_id", "created_at"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    resource: Mapped[str] = mapped_column(String, nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String)
    ip_address: Mapped[str | None] = mapped_column(String)
    meta: Mapped[str | None] = mapped_column(Text)  # JSON metadata
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class CallLog(Base):
    __tablename__ = "call_logs"
    __table_args__ = (Index("idx_call_logs_lead", "lead_id", "created_at"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    lead_id: Mapped[str | None] = mapped_column(
        ForeignKey("leads.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    sentiment: Mapped[str | None] = mapped_column(String)
    summary: Mapped[str | None] = mapped_column(Text)
    topics: Mapped[str | None] = mapped_column(Text)  # JSON
    objections: Mapped[str | None] = mapped_column(Text)  # JSON
    buying_intent: Mapped[str | None] = mapped_column(String)
    next_action: Mapped[str | None] = mapped_column(Text)
    counselor_name: Mapped[str | None] = mapped_column(String)
    analyzed_by: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
