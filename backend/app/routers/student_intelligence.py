"""Student Intelligence endpoints — comprehensive AI-powered student analysis.

Provides a unified intelligence profile for each student combining:
- Dropout prediction
- Engagement scoring
- Course recommendations
- Communication analysis
- Risk assessment
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

from ..core.deps import CurrentUser
from ..core.errors import AppError, ok
from ..services.ai import profile_student, predict_dropout, recommend_courses
from ..services import db_helpers as db

router = APIRouter(tags=["student-intelligence"])


class StudentIntelligenceResponse(BaseModel):
    student_id: str
    name: str
    risk_level: str  # low, medium, high, critical
    risk_score: float  # 0.0 - 1.0
    engagement_score: float  # 0.0 - 1.0
    performance_score: float  # 0.0 - 1.0
    recommended_actions: list[dict]
    recommended_courses: list[dict]
    communication_strategy: str
    key_factors: list[str]
    confidence: float  # 0.0 - 1.0
    next_best_action: str
    last_activity: str | None = None
    created_at: str


@router.get("/api/ai/students/{student_id}/intelligence")
def get_student_intelligence(student_id: str, _user: CurrentUser):
    """Get comprehensive AI intelligence for a specific student."""
    # Fetch student from database
    student = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    if not student:
        raise AppError("Student not found.", 404, "NOT_FOUND")
    
    # Get associated lead data if available
    lead = None
    if student.get("lead_id"):
        lead = db.one("SELECT * FROM leads WHERE id = :id", {"id": student["lead_id"]})
    
    # Calculate dropout prediction (admissionGrade must be numeric)
    try:
        _grade = float(student.get("academic_level", 0) or 0)
    except (ValueError, TypeError):
        _grade = 65.0
    dropout_data = predict_dropout({
        "students": [{
            "id": student["id"],
            "course": student.get("interests"),
            "gender": student.get("gender"),
            "age": student.get("age"),
            "admissionGrade": _grade,
            "scholarship": student.get("scholarship"),
            "attendance": student.get("attendance", "medium"),
            "maritalStatus": None,
        }]
    })
    
    dropout_result = dropout_data[0] if dropout_data else {
        "probability": 0.3,
        "risk": "Low",
        "reasons": ["Insufficient data"]
    }
    
    # Calculate engagement score from interactions
    engagement_score = 0.3  # baseline
    if lead:
        if lead.get("interactions", 0) > 5:
            engagement_score = 0.7
        if lead.get("interactions", 0) > 10:
            engagement_score = 0.9
    
    # Calculate performance score
    performance_score = 0.6  # baseline
    if student.get("academic_level"):
        try:
            level = int(student["academic_level"])
            performance_score = min(1.0, level / 100)
        except (ValueError, TypeError):
            pass
    
    # Risk assessment
    risk_score = dropout_result["probability"]
    risk_level = "low"
    if risk_score > 0.6:
        risk_level = "critical"
    elif risk_score > 0.4:
        risk_level = "high"
    elif risk_score > 0.2:
        risk_level = "medium"
    
    # Get course recommendations (admissionGrade must be numeric)
    course_recs = recommend_courses({
        "student": {
            "id": student["id"],
            "course": student.get("interests"),
            "admissionGrade": _grade,
            "attendance": student.get("attendance", "medium"),
        },
        "topK": 3
    })
    
    # Generate recommended actions based on risk
    recommended_actions = []
    if risk_level in ("high", "critical"):
        recommended_actions.append({
            "action": "Schedule counselor follow-up",
            "priority": "high",
            "reason": "High dropout risk detected",
        })
        recommended_actions.append({
            "action": "Send personalized course recommendation",
            "priority": "medium",
            "reason": "Increase engagement with targeted content",
        })
    elif risk_level == "medium":
        recommended_actions.append({
            "action": "Send follow-up email",
            "priority": "medium",
            "reason": "Maintain engagement",
        })
    else:
        recommended_actions.append({
            "action": "Share advanced course materials",
            "priority": "low",
            "reason": "Student showing good progress",
        })
    
    # Communication strategy
    if risk_level in ("high", "critical"):
        comm_strategy = "Proactive outreach with counselor assignment and personalized support plan."
    elif risk_level == "medium":
        comm_strategy = "Regular check-ins with course updates and success stories."
    else:
        comm_strategy = "Share advanced opportunities and scholarship information."
    
    # Key factors
    key_factors = dropout_result.get("reasons", [])
    if not key_factors:
        key_factors = ["Student profile analyzed"]
    
    # Confidence calculation
    confidence = 0.7  # baseline confidence
    if student.get("academic_level"):
        confidence += 0.1
    if lead and lead.get("interactions", 0) > 0:
        confidence += 0.1
    confidence = min(confidence, 0.95)
    
    # Next best action
    if risk_level in ("high", "critical"):
        next_action = "Contact student within 24 hours to discuss support options"
    elif risk_level == "medium":
        next_action = "Schedule check-in call this week"
    else:
        next_action = "Send advanced course recommendations"
    
    # Last activity
    last_activity = None
    if lead and lead.get("last_activity"):
        last_activity = lead["last_activity"]
    
    now = datetime.now(timezone.utc).isoformat()
    
    return ok({
        "student_id": student["id"],
        "name": student["name"],
        "risk_level": risk_level,
        "risk_score": round(risk_score, 3),
        "engagement_score": round(engagement_score, 3),
        "performance_score": round(performance_score, 3),
        "recommended_actions": recommended_actions,
        "recommended_courses": course_recs,
        "communication_strategy": comm_strategy,
        "key_factors": key_factors,
        "confidence": round(confidence, 3),
        "next_best_action": next_action,
        "last_activity": last_activity,
        "created_at": now,
    })


@router.get("/api/ai/students/{student_id}/risk")
def get_student_risk(student_id: str, _user: CurrentUser):
    """Get detailed dropout risk assessment for a student."""
    student = db.one("SELECT * FROM students WHERE id = :id", {"id": student_id})
    if not student:
        raise AppError("Student not found.", 404, "NOT_FOUND")
    
    # admissionGrade must be numeric
    try:
        _risk_grade = float(student.get("academic_level", 0) or 0)
    except (ValueError, TypeError):
        _risk_grade = 65.0
    dropout_data = predict_dropout({
        "students": [{
            "id": student["id"],
            "course": student.get("interests"),
            "gender": student.get("gender"),
            "age": student.get("age"),
            "admissionGrade": _risk_grade,
            "scholarship": student.get("scholarship"),
            "attendance": student.get("attendance", "medium"),
            "maritalStatus": None,
        }]
    })
    
    result = dropout_data[0] if dropout_data else {
        "probability": 0.3,
        "risk": "Low",
        "reasons": ["Insufficient data"]
    }
    
    # Add intervention suggestions based on risk
    intervention_suggestions = []
    if result["risk"] == "High":
        intervention_suggestions = [
            "Schedule immediate counselor meeting",
            "Review attendance patterns",
            "Discuss academic support options",
            "Explore scholarship opportunities",
        ]
    elif result["risk"] == "Medium":
        intervention_suggestions = [
            "Send motivational content",
            "Schedule weekly check-ins",
            "Connect with peer mentor",
        ]
    else:
        intervention_suggestions = [
            "Continue current support plan",
            "Share advanced learning resources",
        ]
    
    return ok({
        "student_id": student["id"],
        "name": student["name"],
        "probability": result["probability"],
        "risk": result["risk"],
        "factors": result.get("reasons", []),
        "intervention_suggestions": intervention_suggestions,
        "model": "dropout-baseline-v1",
        "provider": "baseline",
    })