"""Executive dashboard — every value computed live from database rows."""
from __future__ import annotations

from fastapi import APIRouter

from ..core.config import settings
from ..core.deps import CurrentUser
from ..core.errors import ok
from ..services.dashboard import dashboard_stats, enhanced_dashboard_stats, kpi_summary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(_user: CurrentUser, range: str = "30d"):  # noqa: A002
    return ok(
        {
            **enhanced_dashboard_stats(range),
            "datasetStatus": {
                "available": True,
                "source": "live-database",
                "message": "Dashboard statistics are computed live from the EDTECH AI database.",
                "datasets": [
                    {
                        "id": "live-db",
                        "label": "Live EDTECH AI database",
                        "path": settings.resolved_database_url,
                        "rows": 0,
                        "columns": [],
                        "hasDates": True,
                    }
                ],
            },
        }
    )


@router.get("/summary")
def get_summary(_user: CurrentUser):
    return ok(kpi_summary())
