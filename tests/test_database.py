import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from main import app
from backend.app.core.database import engine, init_db
from backend.app.services.seed import seed_database


client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure the application database is initialized and seeded."""
    # Drop all backend tables first so seed_database() always runs fully,
    # even when the checked-out salesgenie.db already contains stale data.
    from backend.app.models import entities  # noqa: F401 – register models
    from backend.app.core.database import Base as be_Base, engine as be_engine

    be_Base.metadata.drop_all(bind=be_engine)
    init_db()
    seed_database()
    yield


def test_database_tables_populated():
    """Verify that the current application tables contain seeded data."""
    tables = [
        "users",
        "leads",
    ]

    with engine.connect() as conn:
        for tbl in tables:
            count = conn.execute(
                text(f"SELECT COUNT(*) FROM {tbl}")
            ).scalar()

            assert count > 0, f"Table {tbl} is empty"


def test_auth_and_login_flow():
    """Verify login returns a valid bearer token."""
    reg_res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Counselor Varun",
            "email": "admin@edtech.ai",
            "password": "demo1234",
            "role": "admissions_admin",
        },
    )

    assert reg_res.status_code in [200, 400]

    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "admin@edtech.ai",
            "password": "demo1234",
        },
    )

    assert login_res.status_code == 200

    token_data = login_res.json()

    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_dashboard_calculations():
    """Verify authenticated dashboard data contains seeded leads and ROI."""
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "admin@edtech.ai",
            "password": "demo1234",
        },
    )

    assert login_res.status_code == 200

    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(
        "/api/dashboard/overview",
        headers=headers,
    )

    assert res.status_code == 200

    data = res.json()

    assert data["total_leads"] > 0
    assert data["overall_roi_percentage"] > 0

    unauth_res = client.get("/api/dashboard/overview")

    assert unauth_res.status_code == 401

