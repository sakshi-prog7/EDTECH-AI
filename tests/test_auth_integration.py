"""
Authentication Integration Tests
=================================
Exercises the complete JWT authentication lifecycle using the EXISTING endpoints:
  POST /api/auth/register  →  POST /api/auth/login  →  GET /api/auth/me

Includes validation and error-path tests for:
  - Duplicate email rejection
  - Invalid email format
  - Wrong password / non-existent user (401)
  - Missing / invalid Bearer tokens on protected endpoints (401)
"""

import pytest


# ============================================================
# Registration – POST /api/auth/register
# ============================================================

class TestRegistration:
    """Tests for user registration."""

    def test_register_returns_200(self, client, test_email):
        """Successful registration returns HTTP 200."""
        resp = client.post("/api/auth/register", json={
            "full_name": "Test Counselor",
            "email": test_email,
            "password": "SecurePass123!",
            "role": "counselor",
        })
        assert resp.status_code == 200

    def test_register_returns_user_fields(self, client, test_email):
        """Registration response contains id, full_name, email, and role."""
        resp = client.post("/api/auth/register", json={
            "full_name": "Test Counselor",
            "email": test_email,
            "password": "SecurePass123!",
            "role": "counselor",
        })
        data = resp.json()
        assert "id" in data
        assert data["full_name"] == "Test Counselor"
        assert data["email"] == test_email
        assert data["role"] == "counselor"

    def test_register_duplicate_email_returns_400(self, client, test_email):
        """Registering the same email twice returns HTTP 400."""
        payload = {
            "full_name": "Duplicate User",
            "email": test_email,
            "password": "Pass123!",
        }
        resp1 = client.post("/api/auth/register", json=payload)
        assert resp1.status_code == 200

        resp2 = client.post("/api/auth/register", json=payload)
        assert resp2.status_code == 400
        assert "already registered" in resp2.json()["detail"].lower()

    def test_register_invalid_email_returns_422(self, client):
        """A malformed email address returns HTTP 422 (validation error)."""
        resp = client.post("/api/auth/register", json={
            "full_name": "Bad Email",
            "email": "not-an-email",
            "password": "Pass123!",
        })
        assert resp.status_code == 422

    def test_register_missing_fields_returns_422(self, client):
        """An empty body returns HTTP 422."""
        resp = client.post("/api/auth/register", json={})
        assert resp.status_code == 422


# ============================================================
# Login – POST /api/auth/login
# ============================================================

class TestLogin:
    """Tests for user login and token issuance."""

    def test_login_valid_credentials(self, client, test_email):
        """Login with correct credentials returns an access token."""
        client.post("/api/auth/register", json={
            "full_name": "Login Test",
            "email": test_email,
            "password": "TestPass123!",
        })
        resp = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "TestPass123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client, test_email):
        """Login with incorrect password returns HTTP 401."""
        client.post("/api/auth/register", json={
            "full_name": "Wrong Pass",
            "email": test_email,
            "password": "CorrectPass123!",
        })
        resp = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_email_returns_401(self, client):
        """Login with a non-existent email returns HTTP 401."""
        resp = client.post("/api/auth/login", json={
            "email": "does_not_exist_98765@nowhere.com",
            "password": "Irrelevant!",
        })
        assert resp.status_code == 401

    def test_login_missing_fields_returns_422(self, client):
        """An empty login body returns HTTP 422."""
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 422


# ============================================================
# Protected Endpoint – GET /api/auth/me
# ============================================================

class TestProtectedEndpoint:
    """Tests for the protected /api/auth/me endpoint with Bearer auth."""

    def test_me_with_valid_token(self, client, auth_headers, test_email):
        """GET /api/auth/me with valid Bearer token returns the user profile."""
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_email
        assert "full_name" in data
        assert "role" in data

    def test_me_without_token_returns_401(self, client):
        """GET /api/auth/me with no Authorization header returns HTTP 401."""
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        """GET /api/auth/me with a garbage token returns HTTP 401."""
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid.garbage.token.value",
        })
        assert resp.status_code == 401

    def test_me_with_empty_bearer_returns_401(self, client):
        """GET /api/auth/me with 'Bearer ' and no token returns HTTP 401."""
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Bearer ",
        })
        assert resp.status_code == 401

    def test_me_with_malformed_header_returns_401(self, client):
        """GET /api/auth/me with 'Token xxx' (wrong scheme) returns HTTP 401."""
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Token some_value",
        })
        assert resp.status_code == 401


# ============================================================
# End-to-End Auth Flow
# ============================================================

class TestEndToEndAuthFlow:
    """End-to-end test: register → login → access protected endpoint."""

    def test_full_auth_lifecycle(self, client, test_email):
        """Complete flow: register, login, call /me, verify identity."""
        password = "E2E_Test_Pass!"

        # 1. Register
        reg = client.post("/api/auth/register", json={
            "full_name": "E2E Test User",
            "email": test_email,
            "password": password,
            "role": "counselor",
        })
        assert reg.status_code == 200

        # 2. Login
        login = client.post("/api/auth/login", json={
            "email": test_email,
            "password": password,
        })
        assert login.status_code == 200
        token = login.json()["access_token"]

        # 3. Access protected endpoint
        me = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert me.status_code == 200
        profile = me.json()
        assert profile["email"] == test_email
        assert profile["full_name"] == "E2E Test User"
        assert profile["role"] == "counselor"
