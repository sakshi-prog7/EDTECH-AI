import os
import sys
import pytest
import pandas as pd

# Add repository root to system path for imports during testing
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from services.routing_engine import calculate_lead_score, route_lead_workflow

def test_lead_score_calculation():
    sample_student = {
        "engagement_score": 8.0,
        "attendance_rate": 0.9,
        "avg_quiz_score": 85.0,
        "login_frequency_weekly": 10
    }
    score = calculate_lead_score(sample_student)
    assert 0.0 <= score <= 100.0
    assert score >= 75.0

def test_hot_lead_workflow_routing():
    high_intent_lead = {
        "student_id": 101,
        "country": "India",
        "engagement_score": 9.5,
        "attendance_rate": 0.95,
        "avg_quiz_score": 90.0,
        "login_frequency_weekly": 12
    }
    routed = route_lead_workflow(high_intent_lead)
    assert routed["priority_level"] == "HOT"
    assert routed["routed_to"] == "Executive Admissions Counselors"
    assert "WhatsApp" in routed["trigger_notification"]

def test_engagement_csv_required_columns():
    csv_path = os.path.join(PROJECT_ROOT, "data", "cleaned", "04_online_engagement", "online_learning_engagement.csv")
    df = pd.read_csv(csv_path)
    required = ["student_id", "engagement_score", "attendance_rate", "avg_quiz_score", "login_frequency_weekly"]
    for col in required:
        assert col in df.columns, f"Missing required column '{col}' in engagement dataset"