"""Audit logging service — records significant user actions for security and compliance."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

log = logging.getLogger("audit")


def log_audit(
    user_id: str,
    action: str,
    resource: str,
    result: str = "SUCCESS",
    details: str = "",
) -> None:
    """Record an audit event to the application log.

    Parameters
    ----------
    user_id : str
        The ID of the user performing the action.
    action : str
        Short verb+noun label, e.g. ``lead.create``, ``auth.login``.
    resource : str
        Target identifier, e.g. ``lead:<uuid>`` or ``auth``.
    result : str
        ``SUCCESS`` or ``FAILURE``.
    details : str
        Optional human-readable description.
    """
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "user": user_id,
        "action": action,
        "resource": resource,
        "result": result,
        "details": details,
    }
    log.info("AUDIT %s", json.dumps(entry, ensure_ascii=False))
