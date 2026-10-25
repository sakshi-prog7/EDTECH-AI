"""Email service — SMTP in production, safe logging in development.

Environment variables (all optional — the service degrades gracefully):
    SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
    SMTP_FROM_EMAIL, SMTP_FROM_NAME, SMTP_USE_TLS

When SMTP is not configured, emails are logged to the console in dev mode.
Templates are simple f-strings — no external templating dependency needed.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from ..core.config import settings

logger = logging.getLogger("email")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
def _smtp_config() -> dict:
    """Read SMTP config from the settings object."""
    return {
        "host": getattr(settings, "smtp_host", "") or "",
        "port": int(getattr(settings, "smtp_port", 587) or 587),
        "username": getattr(settings, "smtp_username", "") or "",
        "password": getattr(settings, "smtp_password", "") or "",
        "from_email": getattr(settings, "smtp_from", "") or "",
        "from_name": getattr(settings, "smtp_from_name", "EDTECH AI") or "EDTECH AI",
        "use_tls": getattr(settings, "smtp_use_tls", True),
    }


def is_email_configured() -> bool:
    """Check if real SMTP is available."""
    cfg = _smtp_config()
    return bool(cfg["host"] and cfg["from_email"])


# ---------------------------------------------------------------------------
# Email sending
# ---------------------------------------------------------------------------
def send_email(
    to: str | list[str],
    subject: str,
    html_body: str,
    text_body: str | None = None,
    reply_to: str | None = None,
) -> dict:
    """Send an email. Returns {"success": True, "mode": "smtp"|"dev", ...}.

    In dev mode (SMTP not configured), the email is logged to the console
    and a demo record is returned.
    """
    recipients = [to] if isinstance(to, str) else list(to)
    cfg = _smtp_config()

    if not is_email_configured():
        # Dev mode — log the email safely.
        logger.info(
            "[EMAIL-DEV] To: %s | Subject: %s | Body length: %d",
            recipients,
            subject,
            len(html_body),
        )
        return {
            "success": True,
            "mode": "dev",
            "recipients": recipients,
            "subject": subject,
            "message": "Email logged in development mode (SMTP not configured).",
        }

    # Production — send via SMTP.
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
    msg["To"] = ", ".join(recipients)
    if reply_to:
        msg["Reply-To"] = reply_to

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            if cfg["use_tls"]:
                server.starttls()
            if cfg["username"] and cfg["password"]:
                server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"], recipients, msg.as_string())
        logger.info("[EMAIL-SMTP] Sent to %s: %s", recipients, subject)
        return {"success": True, "mode": "smtp", "recipients": recipients, "subject": subject}
    except Exception as exc:
        logger.error("[EMAIL-SMTP] Failed to send to %s: %s", recipients, exc)
        return {"success": False, "mode": "smtp", "error": str(exc), "recipients": recipients}


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------
def _base_wrapper(inner_html: str, preheader: str = "") -> str:
    """Wrap an email body in a clean HTML structure."""
    preheader_tag = f'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{preheader}</div>' if preheader else ""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
{preheader_tag}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">SALES GENIE AI</h1>
</td></tr>
<tr><td style="padding:32px">
{inner_html}
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
SALES GENIE AI &middot; EdTech Intelligence Platform &middot; © 2026
</p>
</td></tr>
</table>
</td></tr></table>
</body></html>"""


def template_password_reset(name: str, reset_url: str) -> tuple[str, str]:
    """Returns (subject, html_body) for a password-reset email."""
    subject = "Reset your SALES GENIE AI password"
    html = _base_wrapper(f"""
<h2 style="margin:0 0 16px;color:#1e293b;font-size:18px">Password Reset</h2>
<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
Hi {name}, we received a request to reset your password. Click the button below
to choose a new password. This link expires in 1 hour.
</p>
<a href="{reset_url}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
Reset Password
</a>
<p style="margin:20px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">
If you didn't request this, you can safely ignore this email. Your password
will remain unchanged.
</p>
""", "Reset your SALES GENIE AI password")
    return subject, html


def template_welcome(name: str) -> tuple[str, str]:
    """Returns (subject, html_body) for a welcome email."""
    subject = "Welcome to SALES GENIE AI!"
    html = _base_wrapper(f"""
<h2 style="margin:0 0 16px;color:#1e293b;font-size:18px">Welcome aboard, {name}!</h2>
<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
Your account has been created. You now have access to AI-powered lead scoring,
course recommendations, enrollment forecasting and more.
</p>
<p style="margin:0;color:#475569;font-size:14px;line-height:1.6">
Log in to get started — your data is already being analyzed to provide
actionable insights.
</p>
""", "Welcome to SALES GENIE AI — AI-powered EdTech intelligence")
    return subject, html


def template_enrollment_confirmation(
    name: str, course_title: str, enrollment_id: str
) -> tuple[str, str]:
    """Returns (subject, html_body) for an enrollment confirmation."""
    subject = f"Enrollment Confirmed — {course_title}"
    html = _base_wrapper(f"""
<h2 style="margin:0 0 16px;color:#1e293b;font-size:18px">Enrollment Confirmed</h2>
<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
Hi {name}, your enrollment in <strong>{course_title}</strong> has been confirmed.
</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px 12px;background:#f1f5f9;font-size:13px;color:#475569;border-radius:6px 0 0 6px"><strong>Course</strong></td>
<td style="padding:8px 12px;background:#f1f5f9;font-size:13px;color:#1e293b;border-radius:0 6px 6px 0">{course_title}</td></tr>
<tr><td style="padding:8px 12px;font-size:13px;color:#475569;border-radius:6px 0 0 6px"><strong>Enrollment ID</strong></td>
<td style="padding:8px 12px;font-size:13px;color:#1e293b;border-radius:0 6px 6px 0"><code>{enrollment_id[:8]}</code></td></tr>
</table>
<p style="margin:0;color:#475569;font-size:14px;line-height:1.6">
You will receive further instructions from your assigned counselor shortly.
</p>
""", f"Your enrollment in {course_title} is confirmed")
    return subject, html


def template_follow_up(name: str, counselor_name: str, message: str) -> tuple[str, str]:
    """Returns (subject, html_body) for a follow-up email."""
    subject = f"Follow-up from {counselor_name} — SALES GENIE AI"
    html = _base_wrapper(f"""
<h2 style="margin:0 0 16px;color:#1e293b;font-size:18px">Following up</h2>
<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
Hi {name}, {counselor_name} wanted to follow up with you:
</p>
<div style="margin:16px 0;padding:16px 20px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0">
<p style="margin:0;color:#334155;font-size:14px;line-height:1.6">{message}</p>
</div>
<p style="margin:0;color:#475569;font-size:14px;line-height:1.6">
If you have any questions, feel free to reply to this email.
</p>
""", f"Follow-up from {counselor_name}")
    return subject, html


def template_campaign_email(
    name: str, subject_line: str, body_html: str, campaign_name: str
) -> tuple[str, str]:
    """Returns (subject, html_body) for a campaign email."""
    html = _base_wrapper(f"""
<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
Hi {name},
</p>
{body_html}
<hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0">
<p style="margin:0;color:#94a3b8;font-size:11px">
This email was sent by SALES GENIE AI as part of the "{campaign_name}" campaign.
</p>
""", subject_line)
    return subject_line, html
