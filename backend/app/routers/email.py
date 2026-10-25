"""Email service endpoints — send emails, check email health."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from ..core.config import settings
from ..core.deps import CurrentUser
from ..core.errors import ok, AppError
from ..services.email import (
    is_email_configured,
    send_email,
    template_password_reset,
    template_welcome,
    template_follow_up,
    template_enrollment_confirmation,
)
from ..services import db_helpers as db

router = APIRouter(prefix="/api/email", tags=["email"])


@router.get("/health")
def email_health(_user: CurrentUser):
    """Check email service health."""
    configured = is_email_configured()
    return ok({
        "configured": configured,
        "mode": "smtp" if configured else "dev",
        "provider": "SMTP" if configured else "Development",
        "host": settings.smtp_host or None,
        "from": settings.smtp_from or None,
        "message": "Email is configured and ready to send." if configured else "SMTP is not configured. Emails are logged locally and are not delivered to real inboxes. Configure SMTP_HOST and SMTP_FROM in backend/.env to enable email delivery.",
    })


@router.post("/send")
def send_email_endpoint(
    body: dict,
    _user: CurrentUser,
):
    """Send an email directly (admin/counselor only)."""
    to = body.get("to", "")
    subject = body.get("subject", "")
    html_body = body.get("htmlBody", "")
    if not to or not subject or not html_body:
        raise AppError("Missing required fields: to, subject, htmlBody", 400, "VALIDATION_ERROR")
    result = send_email(to, subject, html_body)

    # Create notification for email activity
    if result.get("mode") == "smtp" and result.get("success"):
        db.execute(
            "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
            "VALUES (:id, :uid, 'System', :title, :desc, 0, '/communication', :now)",
            {
                "id": str(uuid.uuid4()),
                "uid": _user.id,
                "title": f"Email sent to {to}",
                "desc": f"Subject: {subject}",
                "now": datetime.now(timezone.utc).isoformat(),
            },
        )
    elif result.get("mode") == "smtp" and not result.get("success"):
        db.execute(
            "INSERT INTO notifications (id, user_id, kind, title, description, read, action_to, created_at) "
            "VALUES (:id, :uid, 'System', :title, :desc, 0, '/communication', :now)",
            {
                "id": str(uuid.uuid4()),
                "uid": _user.id,
                "title": f"Email failed to {to}",
                "desc": result.get("error", "Unknown error"),
                "now": datetime.now(timezone.utc).isoformat(),
            },
        )
    elif result.get("mode") == "dev":
        # Log that the email was not actually sent (dev mode)
        pass

    return ok(result)


@router.get("/config")
def email_config(_user: CurrentUser):
    """Show safe email configuration details (never exposes password)."""
    configured = is_email_configured()
    return ok({
        "configured": configured,
        "host": settings.smtp_host or None,
        "port": settings.smtp_port,
        "fromEmail": settings.smtp_from or None,
        "fromName": settings.smtp_from_name or "EDTECH AI",
        "tlsEnabled": settings.smtp_use_tls,
    })


@router.post("/test")
def test_email_config(_user: CurrentUser):
    """Test the SMTP connection without sending an actual email."""
    if not is_email_configured():
        return ok({
            "success": False,
            "message": "SMTP is not configured. Set SMTP_HOST and SMTP_FROM in backend/.env to enable email delivery.",
        })
    import smtplib
    import ssl
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
        return ok({
            "success": True,
            "message": "SMTP connection successful.",
        })
    except smtplib.SMTPAuthenticationError:
        return ok({
            "success": False,
            "message": "SMTP authentication failed. Check your SMTP username and password.",
        })
    except smtplib.SMTPConnectError:
        return ok({
            "success": False,
            "message": f"Could not connect to SMTP server at {settings.smtp_host}:{settings.smtp_port}.",
        })
    except Exception as exc:
        return ok({
            "success": False,
            "message": f"SMTP connection failed: {type(exc).__name__}.",
        })


@router.post("/preview")
def preview_template(body: dict, _user: CurrentUser):
    """Preview an email template with sample data."""
    template = body.get("template", "welcome")
    name = body.get("name", "Demo User")

    if template == "welcome":
        subject, html = template_welcome(name)
    elif template == "password-reset":
        subject, html = template_password_reset(name, f"{settings.frontend_url}/reset-password?token=demo")
    elif template == "follow-up":
        subject, html = template_follow_up(name, "Counselor", "This is a sample follow-up message.")
    elif template == "enrollment-confirmation":
        subject, html = template_enrollment_confirmation(name, "Data Science & Analytics", "demo-enroll")
    else:
        raise AppError(f"Unknown template: {template}", 400, "VALIDATION_ERROR")

    return ok({"subject": subject, "html": html, "template": template})
