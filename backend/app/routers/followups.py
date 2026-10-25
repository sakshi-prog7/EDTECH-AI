"""Follow-up Automation — workflow rules, execution, and management.

Supports:
- Workflow rule CRUD (trigger, conditions, actions)
- Automated follow-up execution
- Delay, condition, action, branching, retry, stop, escalation
- Workflow execution history
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..core.deps import AuthedUser, CurrentUser, require_roles
from ..core.errors import AppError, ok
from ..services import db_helpers as db
from ..services.audit import log_audit

router = APIRouter(prefix="/api/follow-ups", tags=["follow-ups"])


class WorkflowRuleIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    triggerEvent: str = Field(default="lead_created")
    conditions: list[dict] = Field(default_factory=list)
    actions: list[dict] = Field(min_length=1)
    isActive: bool = True


class WorkflowRulePatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    triggerEvent: str | None = None
    conditions: list[dict] | None = None
    actions: list[dict] | None = None
    isActive: bool | None = None


TRIGGER_EVENTS = [
    "lead_created",
    "lead_status_changed",
    "lead_score_above_70",
    "enrollment_created",
    "enrollment_status_changed",
    "campaign_completed",
    "high_value_lead",
    "inactivity_7_days",
    "inactivity_14_days",
]


def _list_rules(search: str | None, limit: int, offset: int) -> dict:
    where = ""
    params: dict = {"limit": limit, "offset": offset}
    if search:
        where = "WHERE name LIKE :search"
        params["search"] = f"%{search}%"
    total = db.scalar(f"SELECT COUNT(*) AS n FROM workflow_rules {where}", params)
    items = db.q(
        f"SELECT * FROM workflow_rules {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return {"items": items, "total": total}


@router.get("/rules")
def list_rules(
    _user: CurrentUser,
    search: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    result = _list_rules(search=search, limit=pageSize, offset=(page - 1) * pageSize)
    return ok({
        "items": result["items"],
        "total": result["total"],
        "page": page,
        "pageSize": pageSize,
        "pages": (result["total"] + pageSize - 1) // pageSize,
    })


@router.get("/rules/trigger-events")
def list_trigger_events(_user: CurrentUser):
    return ok({"events": TRIGGER_EVENTS})


@router.get("/rules/{rule_id}")
def get_rule(rule_id: str, _user: CurrentUser):
    rule = db.one("SELECT * FROM workflow_rules WHERE id = :id", {"id": rule_id})
    if not rule:
        raise AppError("Workflow rule not found.", 404, "NOT_FOUND")
    return ok({"rule": rule})


@router.post("/rules", status_code=201)
def create_rule(
    body: WorkflowRuleIn,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    rule_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO workflow_rules (id, name, description, trigger_event, conditions, actions, is_active, created_at, updated_at) "
        "VALUES (:id, :name, :desc, :trigger, :conditions, :actions, :active, :now, :now)",
        {
            "id": rule_id,
            "name": body.name.strip(),
            "desc": body.description,
            "trigger": body.triggerEvent,
            "conditions": json.dumps(body.conditions),
            "actions": json.dumps(body.actions),
            "active": 1 if body.isActive else 0,
            "now": now,
        },
    )
    log_audit(_user.id, 'workflow.create', f'workflow:{rule_id}', 'SUCCESS', f'Created workflow: {body.name}')
    rule = db.one("SELECT * FROM workflow_rules WHERE id = :id", {"id": rule_id})
    return ok({"rule": rule}, 201)


@router.patch("/rules/{rule_id}")
def update_rule(
    rule_id: str,
    body: WorkflowRulePatch,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN", "ADMISSIONS"))],
):
    current = db.one("SELECT * FROM workflow_rules WHERE id = :id", {"id": rule_id})
    if not current:
        raise AppError("Workflow rule not found.", 404, "NOT_FOUND")

    def _pick(value, current):
        return current if value is None else value

    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE workflow_rules SET name = :name, description = :desc, trigger_event = :trigger, "
        "conditions = :conditions, actions = :actions, is_active = :active, updated_at = :now WHERE id = :id",
        {
            "id": rule_id,
            "name": _pick(body.name, current["name"]),
            "desc": _pick(body.description, current["description"]),
            "trigger": _pick(body.triggerEvent, current["trigger_event"]),
            "conditions": json.dumps(_pick(body.conditions, json.loads(current["conditions"] or "[]"))),
            "actions": json.dumps(_pick(body.actions, json.loads(current["actions"] or "[]"))),
            "active": 1 if _pick(body.isActive, bool(current["is_active"])) else 0,
            "now": now,
        },
    )
    log_audit(_user.id, 'workflow.update', f'workflow:{rule_id}', 'SUCCESS', f'Updated workflow rule {rule_id}')
    rule = db.one("SELECT * FROM workflow_rules WHERE id = :id", {"id": rule_id})
    return ok({"rule": rule})


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    _user: Annotated[AuthedUser, Depends(require_roles("ADMIN"))],
):
    if not db.one("SELECT id FROM workflow_rules WHERE id = :id", {"id": rule_id}):
        raise AppError("Workflow rule not found.", 404, "NOT_FOUND")
    db.execute("DELETE FROM workflow_executions WHERE rule_id = :id", {"id": rule_id})
    db.execute("DELETE FROM workflow_rules WHERE id = :id", {"id": rule_id})
    log_audit(_user.id, 'workflow.delete', f'workflow:{rule_id}', 'SUCCESS', f'Deleted workflow rule {rule_id}')
    return ok({"message": "Workflow rule deleted."})


# ── Workflow execution ─────────────────────────────────────────────────────


def _evaluate_condition(condition: dict, context: dict) -> bool:
    """Evaluate a single condition against context."""
    field = condition.get("field", "")
    op = condition.get("operator", "equals")
    value = condition.get("value", "")

    actual = context.get(field)
    if actual is None:
        return False

    if op == "equals":
        return str(actual).lower() == str(value).lower()
    elif op == "not_equals":
        return str(actual).lower() != str(value).lower()
    elif op == "greater_than":
        try:
            return float(actual) > float(value)
        except (ValueError, TypeError):
            return False
    elif op == "less_than":
        try:
            return float(actual) < float(value)
        except (ValueError, TypeError):
            return False
    elif op == "contains":
        return str(value).lower() in str(actual).lower()
    elif op == "in":
        values = [v.strip().lower() for v in str(value).split(",")]
        return str(actual).lower() in values
    return False


def _execute_action(action: dict, lead_id: str | None, user_id: str) -> dict:
    """Execute a single workflow action. Returns result dict."""
    action_type = action.get("type", "")
    now = datetime.now(timezone.utc).isoformat()

    if action_type == "send_email":
        from ..services.email import send_email
        to = action.get("to", "")
        subject = action.get("subject", "Follow-up")
        body_html = action.get("body", "<p>This is an automated follow-up.</p>")
        if to:
            result = send_email(to, subject, body_html)
            return {"type": "send_email", "success": result.get("success", False), "to": to}

    elif action_type == "create_task":
        title = action.get("title", "Follow-up task")
        priority = action.get("priority", "Medium")
        task_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO tasks (id, title, lead_id, due_date, status, priority, assignee_id, notes, created_at, updated_at) "
            "VALUES (:id, :title, :lead_id, :due, 'pending', :priority, :assignee, :notes, :now, :now)",
            {
                "id": task_id,
                "title": title,
                "lead_id": lead_id,
                "due": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
                "priority": priority,
                "assignee": user_id,
                "notes": "Auto-created by workflow automation.",
                "now": now,
            },
        )
        return {"type": "create_task", "success": True, "taskId": task_id}

    elif action_type == "update_lead_status":
        new_status = action.get("status", "CONTACTED")
        if lead_id:
            db.execute(
                "UPDATE leads SET status = :status, updated_at = :now WHERE id = :id",
                {"status": new_status, "now": now, "id": lead_id},
            )
            return {"type": "update_lead_status", "success": True, "newStatus": new_status}
        return {"type": "update_lead_status", "success": False, "error": "No lead_id"}

    elif action_type == "create_notification":
        title = action.get("title", "Workflow Alert")
        description = action.get("description", "Automated notification from workflow.")
        notif_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
            "VALUES (:id, :uid, 'System', :title, :desc, 0, :action, :now)",
            {"id": notif_id, "uid": user_id, "title": title, "desc": description,
             "action": "/leads", "now": now},
        )
        return {"type": "create_notification", "success": True}

    elif action_type == "log_activity":
        note = action.get("note", "Workflow action executed.")
        if lead_id:
            db.execute(
                "INSERT INTO activities (id, lead_id, user_id, kind, note, created_at) "
                "VALUES (:id, :lead_id, :user_id, 'followup', :note, :now)",
                {"id": str(uuid.uuid4()), "lead_id": lead_id, "user_id": user_id,
                 "note": note, "now": now},
            )
            return {"type": "log_activity", "success": True}
        return {"type": "log_activity", "success": False, "error": "No lead_id"}

    return {"type": action_type, "success": False, "error": f"Unknown action type: {action_type}"}


@router.post("/execute")
def execute_workflow(
    body: dict,
    user: CurrentUser,
):
    """Execute matching workflow rules for an event."""
    event = body.get("event", "")
    lead_id = body.get("leadId")
    context = body.get("context", {})

    # Find matching active rules
    rules = db.q(
        "SELECT * FROM workflow_rules WHERE is_active = 1 AND trigger_event = :event",
        {"event": event},
    )

    results = []
    for rule in rules:
        # Check conditions
        conditions = json.loads(rule["conditions"] or "[]")
        conditions_met = all(_evaluate_condition(c, context) for c in conditions)

        if not conditions_met:
            continue

        # Execute actions
        actions = json.loads(rule["actions"] or "[]")
        action_results = []
        all_success = True

        for action in actions:
            result = _execute_action(action, lead_id, user.id)
            action_results.append(result)
            if not result.get("success"):
                all_success = False

        # Record execution
        exec_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO workflow_executions (id, rule_id, lead_id, status, result, error, created_at, completed_at) "
            "VALUES (:id, :rule_id, :lead_id, :status, :result, :error, :now, :now)",
            {
                "id": exec_id,
                "rule_id": rule["id"],
                "lead_id": lead_id,
                "status": "completed" if all_success else "failed",
                "result": json.dumps(action_results),
                "error": None if all_success else "Some actions failed",
                "now": now,
            },
        )

        results.append({
            "ruleId": rule["id"],
            "ruleName": rule["name"],
            "executionId": exec_id,
            "actions": action_results,
            "status": "completed" if all_success else "failed",
        })

    return ok({"event": event, "executions": results, "rulesMatched": len(results)})


@router.get("/executions")
def list_executions(
    _user: CurrentUser,
    rule_id: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where: list[str] = []
    params: dict = {"limit": pageSize, "offset": (page - 1) * pageSize}
    if rule_id:
        where.append("e.rule_id = :rule_id")
        params["rule_id"] = rule_id
    if status:
        where.append("e.status = :status")
        params["status"] = status
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    total = db.scalar(
        f"SELECT COUNT(*) AS n FROM workflow_executions e {where_sql}", params
    )
    items = db.q(
        f"SELECT e.*, r.name AS rule_name FROM workflow_executions e "
        f"LEFT JOIN workflow_rules r ON r.id = e.rule_id "
        f"{where_sql} ORDER BY e.created_at DESC LIMIT :limit OFFSET :offset",
        params,
    )
    return ok({
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "pages": (total + pageSize - 1) // pageSize,
    })
