def calculate_lead_score(student_record: dict) -> float:
    """
    Computes a composite AI Lead Score (0-100) based on student engagement
    and academic readiness features.
    """
    # Base engagement score (normalized to 40%)
    raw_engagement = float(student_record.get("engagement_score", 5.0))
    engagement_factor = min(max((raw_engagement / 10.0) * 40.0, 0.0), 40.0)

    # Attendance rate (normalized to 25%)
    attendance = float(student_record.get("attendance_rate", 0.5))
    attendance_factor = min(max(attendance * 25.0, 0.0), 25.0)

    # Quiz performance (normalized to 20%)
    quiz_score = float(student_record.get("avg_quiz_score", 50.0))
    quiz_factor = min(max((quiz_score / 100.0) * 20.0, 0.0), 20.0)

    # Weekly login frequency (normalized to 15%)
    logins = float(student_record.get("login_frequency_weekly", 3))
    login_factor = min(max((logins / 14.0) * 15.0, 0.0), 15.0)

    return round(engagement_factor + attendance_factor + quiz_factor + login_factor, 2)


def route_lead_workflow(student_record: dict) -> dict:
    """
    Evaluates student record, computes score, and executes automated counselor routing.
    """
    lead_score = calculate_lead_score(student_record)
    student_id = student_record.get("student_id", "UNKNOWN")
    country = student_record.get("country", "Global")
    
    if lead_score >= 75.0:
        priority = "HOT"
        assigned_team = "Executive Admissions Counselors"
        recommended_action = "Schedule Immediate 1-on-1 Consultation"
        notification_channel = "WhatsApp Urgent Alert & SMS"
    elif lead_score >= 50.0:
        priority = "WARM"
        assigned_team = "Regional Academic Advisors"
        recommended_action = "Send Demo Class Link and Course Syllabus"
        notification_channel = "Automated Email Campaign"
    else:
        priority = "COLD"
        assigned_team = "Nurture Automation Queue"
        recommended_action = "Enroll in Weekly Skill Workshop Series"
        notification_channel = "Drip Marketing Sequence"

    return {
        "student_id": student_id,
        "country": country,
        "ai_lead_score": lead_score,
        "priority_level": priority,
        "routed_to": assigned_team,
        "recommended_action": recommended_action,
        "trigger_notification": notification_channel,
        "automation_status": "PROCESSED"
    }