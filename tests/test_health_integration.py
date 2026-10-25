"""
Health Integration Tests
========================
Verifies the system health endpoint (GET /) returns a well-formed response
containing status, database connectivity, and ML model availability info.
"""

import pytest


class TestHealthEndpoint:
    """Tests for the application home / health endpoint at GET /."""

    def test_health_returns_200(self, client):
        """GET / should return HTTP 200."""
        resp = client.get("/")
        assert resp.status_code == 200

    def test_health_status_is_online(self, client):
        """Response body must indicate status 'online'."""
        data = client.get("/").json()
        assert data["status"] == "online"

    def test_health_contains_service_name(self, client):
        """Response should include the service name with 'EdTech'."""
        data = client.get("/").json()
        assert "service" in data
        assert "EdTech" in data["service"]

    def test_health_contains_security_info(self, client):
        """Response should indicate JWT Bearer security is enabled."""
        data = client.get("/").json()
        assert "security" in data

    def test_health_database_connected(self, client):
        """Response should report database status as 'connected'."""
        data = client.get("/").json()
        assert "database" in data
        assert data["database"] == "connected"

    def test_health_ml_models_reported(self, client):
        """Response should include an ml_models dict with boolean status flags."""
        data = client.get("/").json()
        assert "ml_models" in data
        ml = data["ml_models"]
        assert isinstance(ml, dict)

        expected_keys = [
            "dropout_model_loaded",
            "lead_scoring_model_loaded",
            "recommender_loaded",
            "forecasting_loaded",
        ]
        for key in expected_keys:
            assert key in ml, f"Missing ML model status key: {key}"
            assert isinstance(ml[key], bool), f"{key} should be a boolean"

    def test_health_response_is_json(self, client):
        """The response Content-Type should be application/json."""
        resp = client.get("/")
        assert "application/json" in resp.headers["content-type"]
