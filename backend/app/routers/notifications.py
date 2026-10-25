"""Notifications — per-user feed, unread count, mark-read actions."""
from __future__ import annotations

from fastapi import APIRouter

from ..core.deps import CurrentUser
from ..core.errors import AppError, ok
from ..services import db_helpers as db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: CurrentUser):
    notifications = db.q(
        "SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC, read ASC LIMIT 100",
        {"uid": user.id},
    )
    unread = db.scalar(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = :uid AND read = 0", {"uid": user.id}
    )
    return ok({"notifications": notifications, "unread": unread})


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, user: CurrentUser):
    changed = db.execute(
        "UPDATE notifications SET read = 1 WHERE id = :id AND user_id = :uid",
        {"id": notification_id, "uid": user.id},
    )
    if not changed:
        raise AppError("Notification not found.", 404, "NOT_FOUND")
    return ok({"message": "Notification marked as read."})


@router.patch("/read-all")
def mark_all_read(user: CurrentUser):
    count = db.execute(
        "UPDATE notifications SET read = 1 WHERE user_id = :uid AND read = 0", {"uid": user.id}
    )
    return ok({"message": f"Marked {count} notification{'s' if count != 1 else ''} as read."})
