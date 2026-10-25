"""
Shared test fixtures for EdTech AI Integration Tests.

Provides:
  - An isolated SQLite test database (tests/test_integration.db)
  - FastAPI TestClient routed to the test database via dependency override
  - Reusable fixtures for registration, login, and Bearer-token access
  - Automatic cleanup after the test session
"""

import os
import sys
import uuid
import pytest

# ---------------------------------------------------------------------------
# Project root path setup – must precede any app-level imports
# ---------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Import the application and ORM models AFTER the path is configured
from main import app  # noqa: E402
from db.database import Base, get_db  # noqa: E402
import db.models  # noqa: F401, E402 – ensure every model table is registered with Base

# ---------------------------------------------------------------------------
# Isolated test database engine (never touches production edtech_crm.db)
# ---------------------------------------------------------------------------
_TEST_DB_PATH = os.path.join(PROJECT_ROOT, "tests", "test_integration.db")
TEST_DATABASE_URL = f"sqlite:///{_TEST_DB_PATH}"

_test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
_TestSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=_test_engine
)

# Create all ORM tables on the test engine (mirrors the app schema exactly)
Base.metadata.create_all(bind=_test_engine)

# ---------------------------------------------------------------------------
# Dependency override – route every Depends(get_db) to the test database
# ---------------------------------------------------------------------------

def _override_get_db():
    db = _TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TEST_PASSWORD = "IntegrationTest_2026!"

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    """Yield a FastAPI TestClient backed by the isolated test database."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def test_email():
    """Return a unique, random email address for each test function."""
    return f"inttest_{uuid.uuid4().hex[:10]}@testdomain.com"


@pytest.fixture(scope="function")
def registered_user(client, test_email):
    """Register a fresh test user and yield (email, password)."""
    resp = client.post("/api/auth/register", json={
        "full_name": "Integration Test User",
        "email": test_email,
        "password": TEST_PASSWORD,
        "role": "counselor",
    })
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    yield test_email, TEST_PASSWORD


@pytest.fixture(scope="function")
def auth_headers(client, registered_user):
    """Login and return an Authorization header dict with a valid Bearer token."""
    email, password = registered_user
    resp = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def access_token(client, registered_user):
    """Login and return the raw access token string."""
    email, password = registered_user
    resp = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


# ---------------------------------------------------------------------------
# Session-level cleanup: drop test tables and remove the DB file
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_database():
    """Clean up the test database after all tests complete."""
    yield
    Base.metadata.drop_all(bind=_test_engine)
    _test_engine.dispose()
    if os.path.exists(_TEST_DB_PATH):
        os.remove(_TEST_DB_PATH)
