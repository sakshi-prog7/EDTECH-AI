# Integration Testing Module — EdTech AI SalesGenie

## Purpose

This module provides **automated integration tests** for the EdTech AI SalesGenie
Enterprise Platform. It verifies that the full application stack — including
authentication, database, JWT token lifecycle, and predictive AI endpoints —
works correctly when exercised end-to-end through the FastAPI HTTP interface.

## Tools Used

| Tool | Purpose |
|------|---------|
| **pytest** (≥ 8.3.4) | Test runner and assertion framework |
| **FastAPI TestClient** | Synchronous HTTP client for endpoint testing (backed by httpx) |
| **SQLAlchemy** | Test database engine and session management |
| **httpx** | HTTP transport layer (used internally by TestClient) |

## Test Structure

```
tests/
├── __init__.py                    # Package marker
├── conftest.py                    # Shared fixtures, test DB setup, dependency overrides
├── test_health_integration.py     # System health endpoint tests
├── test_auth_integration.py       # JWT authentication lifecycle tests
├── test_ai_integration.py         # Predictive AI model endpoint tests
├── test_database.py               # (existing) Database seeding & dashboard tests
├── test_data_quality.py           # (existing) Dataset validation tests
├── test_models.py                 # (existing) ML model load tests
├── test_routing_engine.py         # (existing) Lead routing engine unit tests
└── README.md                      # This file
```

## Test Categories

### 1. Health Integration (`test_health_integration.py`)

Verifies `GET /` returns HTTP 200 with a well-formed response containing:

- `status` field set to `"online"`
- `service` name containing `"EdTech"`
- `database` connectivity status
- `ml_models` dict with boolean flags for each loaded model

### 2. Authentication Integration (`test_auth_integration.py`)

Uses the **existing** endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Register a new user |
| `/api/auth/login` | POST | Authenticate and receive a JWT access token |
| `/api/auth/me` | GET | Access the protected user profile |

#### Test Coverage

| Test | What It Verifies |
|------|-----------------|
| Registration success (200) | New user created with correct fields |
| Duplicate email rejection (400) | Cannot register the same email twice |
| Invalid email format (422) | Pydantic email validation enforced |
| Missing fields (422) | Required fields enforced |
| Login success (200) | Returns `access_token` and `token_type: "bearer"` |
| Wrong password (401) | Credential mismatch rejected |
| Non-existent user (401) | Unknown email rejected |
| Protected endpoint with token (200) | `/api/auth/me` returns user profile |
| No token (401) | Missing Authorization header rejected |
| Invalid token (401) | Garbage Bearer token rejected |
| Malformed header (401) | Wrong auth scheme rejected |
| Full E2E lifecycle | register → login → /me with identity verification |

**Note:** The current codebase does not implement `/api/auth/refresh` or
`/api/auth/logout` endpoints. The `Token` response model contains only
`access_token` and `token_type`.

### 3. AI / Predictive Model Integration (`test_ai_integration.py`)

Tests all existing AI endpoints with valid Pydantic request schemas:

| Endpoint | Request Schema | Validation Test |
|----------|---------------|-----------------|
| `POST /predict-dropout` | `DropoutRequest` (9 fields) | Missing fields → 422, empty body → 422 |
| `POST /predict-lead-score` | `LeadRequest` (7 required + 6 optional) | Missing fields → 422, optional fields accepted |
| `POST /recommend-course` | `RecommendationRequest` (1 field) | Empty body → 422 |
| `POST /student-profile` | `ProfilingRequest` (3 fields) | Interest-based track routing verified |
| `GET /forecast-sales` | — (no body) | Forecast values are numeric |

**Note:** Endpoints `/api/predict/conversion`, `/api/ai/email-generation`,
`/api/ai/next-best-action`, and `/api/ai/call-analysis` are **not present**
in the current `main.py` source code and are therefore not tested.

## Test Isolation

| Concern | Approach |
|---------|----------|
| **User conflicts** | Each test function generates a unique random email (`inttest_<uuid>@integration.test`) |
| **Database isolation** | A separate SQLite file (`tests/test_integration.db`) is used; the `get_db` dependency is overridden |
| **Production data** | The production `edtech_crm.db` is never read or written |
| **Cleanup** | Test tables are dropped and the test DB file is deleted after the session |

## How to Run

```bash
# Run only the new integration tests:
pytest tests/test_health_integration.py tests/test_auth_integration.py tests/test_ai_integration.py -v

# Run all tests in the tests/ directory (including existing unit tests):
pytest tests/ -v

# Run with short traceback for faster iteration:
pytest tests/test_health_integration.py tests/test_auth_integration.py tests/test_ai_integration.py -v --tb=short

# Run a specific test class:
pytest tests/test_auth_integration.py::TestLogin -v

# Run a single test:
pytest tests/test_ai_integration.py::TestPredictLeadScore::test_valid_input_returns_200 -v
```

## Expected Result

All integration tests should **PASS**:

```
tests/test_health_integration.py::TestHealthEndpoint::test_health_returns_200 PASSED
tests/test_health_integration.py::TestHealthEndpoint::test_health_status_is_online PASSED
tests/test_health_integration.py::TestHealthEndpoint::test_health_contains_service_name PASSED
tests/test_health_integration.py::TestHealthEndpoint::test_health_contains_security_info PASSED
tests/test_health_integration.py::TestHealthEndpoint::test_health_database_connected PASSED
tests/test_health_integration.py::TestHealthEndpoint::test_health_ml_models_reported PASSED
tests/test_health_integration.py::TestHealthEndpoint::test_health_response_is_json PASSED
tests/test_auth_integration.py::TestRegistration::test_register_returns_200 PASSED
...
tests/test_ai_integration.py::TestPredictDropout::test_valid_input_returns_200_or_503 PASSED
...

========================= X passed in X.XXs ==========================
```

**Important:** AI model endpoints (`/predict-dropout`, `/recommend-course`,
`/forecast-sales`) may return HTTP 503 if the corresponding `.pkl` model
files are not loaded (e.g. scikit-learn version mismatch). Tests handle
this gracefully by accepting both 200 and 503 as valid responses.

## Varun's Integration & Testing Contribution

This integration testing module is part of the **"Integration & Testing"**
contribution to the EdTech AI SalesGenie project. It provides:

- **Automated regression testing** for the entire API surface through
  real HTTP requests via FastAPI's TestClient
- **JWT authentication lifecycle validation** including edge cases such
  as duplicate registration, wrong passwords, missing tokens, and
  malformed authorization headers
- **AI endpoint contract testing** using the actual Pydantic request
  models defined in `main.py`, ensuring each endpoint accepts valid
  payloads and rejects invalid ones with proper HTTP status codes
- **Full test isolation** ensuring tests never corrupt production data,
  never depend on pre-existing users, and always clean up after themselves
- **CI/CD-ready** test suite that can be integrated into automated
  build pipelines with a single `pytest` command
