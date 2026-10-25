"""
AI / Predictive Model Integration Tests
========================================
Tests all existing AI endpoints discovered from the source code (main.py):

  - POST /predict-dropout       →  DropoutRequest
  - POST /predict-lead-score    →  LeadRequest
  - POST /recommend-course      →  RecommendationRequest
  - POST /student-profile       →  ProfilingRequest
  - GET  /forecast-sales        →  (no body)

Each endpoint is tested with:
  • A valid request matching the EXISTING Pydantic schema
  • Verification of HTTP status and response structure
  • At least one validation / error-path test

Note: AI model endpoints that depend on .pkl files may return HTTP 503
if the model could not be loaded (e.g. pickle version mismatch). Tests
handle this gracefully by accepting both 200 and 503 as valid responses.
"""

import pytest


# ---------------------------------------------------------------------------
# Valid request payloads (match the Pydantic schemas in main.py exactly)
# ---------------------------------------------------------------------------

DROPOUT_VALID = {
    "age": 20.0,
    "time_spent_on_course": 120.0,
    "time_watched": 90.0,
    "skip_count": 5.0,
    "pause_count": 3.0,
    "disengagement_score": 0.4,
    "experience_level_encoded": 1,
    "learning_style_encoded": 2,
    "difficulty_level_encoded": 1,
}

LEAD_SCORE_VALID = {
    "age": 22.0,
    "time_spent_on_course": 100.0,
    "time_watched": 80.0,
    "skip_count": 3.0,
    "pause_count": 2.0,
    "ratings": 4.5,
    "num_reviews": 10.0,
}

LEAD_SCORE_WITH_OPTIONALS = {
    **LEAD_SCORE_VALID,
    "video_duration": 45.0,
    "experience_level": "Advanced",
    "difficulty_level": "Hard",
    "learning_style": "Kinesthetic",
    "category": "Data Science",
    "interests": "machine learning python data",
}

RECOMMEND_VALID = {
    "student_interests": "machine learning and data science",
}

STUDENT_PROFILE_AI = {
    "interests": "machine learning and python",
    "experience_level": "intermediate",
    "learning_style": "visual",
}

STUDENT_PROFILE_WEB = {
    "interests": "react html css javascript",
    "experience_level": "beginner",
    "learning_style": "visual",
}


# ===================================================================
# POST /predict-dropout
# ===================================================================

class TestPredictDropout:
    """Tests for the dropout warning prediction endpoint."""

    def test_valid_input_returns_200_or_503(self, client):
        """A valid DropoutRequest returns 200 (model loaded) or 503."""
        resp = client.post("/predict-dropout", json=DROPOUT_VALID)
        assert resp.status_code in (200, 503)

    def test_response_structure_when_loaded(self, client):
        """When the model is loaded, response has at_risk and confidence."""
        resp = client.post("/predict-dropout", json=DROPOUT_VALID)
        if resp.status_code == 200:
            data = resp.json()
            assert "at_risk_of_dropping_out" in data
            assert "confidence_score" in data
            assert isinstance(data["at_risk_of_dropping_out"], bool)
            assert isinstance(data["confidence_score"], (int, float))

    def test_missing_required_fields_returns_422(self, client):
        """An incomplete payload triggers a 422 validation error."""
        resp = client.post("/predict-dropout", json={"age": 20.0})
        assert resp.status_code == 422

    def test_empty_body_returns_422(self, client):
        """An empty body triggers a 422 validation error."""
        resp = client.post("/predict-dropout", json={})
        assert resp.status_code == 422


# ===================================================================
# POST /predict-lead-score
# ===================================================================

class TestPredictLeadScore:
    """Tests for the lead scoring prediction endpoint."""

    def test_valid_input_returns_200(self, client):
        """A valid LeadRequest always returns HTTP 200 (uses heuristic fallback)."""
        resp = client.post("/predict-lead-score", json=LEAD_SCORE_VALID)
        assert resp.status_code == 200

    def test_response_structure(self, client):
        """Response contains high_intent_lead, conversion_probability, engine."""
        resp = client.post("/predict-lead-score", json=LEAD_SCORE_VALID)
        data = resp.json()
        assert "high_intent_lead" in data
        assert "conversion_probability" in data
        assert "engine" in data

    def test_boolean_fields_are_boolean(self, client):
        """high_intent_lead must be a Python bool."""
        resp = client.post("/predict-lead-score", json=LEAD_SCORE_VALID)
        assert isinstance(resp.json()["high_intent_lead"], bool)

    def test_conversion_probability_in_valid_range(self, client):
        """conversion_probability must be between 0 and 100."""
        resp = client.post("/predict-lead-score", json=LEAD_SCORE_VALID)
        prob = resp.json()["conversion_probability"]
        assert 0.0 <= prob <= 100.0

    def test_optional_fields_accepted(self, client):
        """Optional fields (experience_level, interests, etc.) are accepted."""
        resp = client.post("/predict-lead-score", json=LEAD_SCORE_WITH_OPTIONALS)
        assert resp.status_code == 200
        assert "engine" in resp.json()

    def test_missing_required_fields_returns_422(self, client):
        """Incomplete payload triggers a 422 validation error."""
        resp = client.post("/predict-lead-score", json={"age": 25})
        assert resp.status_code == 422


# ===================================================================
# POST /recommend-course
# ===================================================================

class TestRecommendCourse:
    """Tests for the course recommendation endpoint."""

    def test_valid_input_returns_200_or_503(self, client):
        """A valid RecommendationRequest returns 200 or 503."""
        resp = client.post("/recommend-course", json=RECOMMEND_VALID)
        assert resp.status_code in (200, 503)

    def test_response_structure_when_loaded(self, client):
        """When the model is loaded, response has a recommendations list."""
        resp = client.post("/recommend-course", json=RECOMMEND_VALID)
        if resp.status_code == 200:
            data = resp.json()
            assert "recommendations" in data
            assert isinstance(data["recommendations"], list)

    def test_recommendations_have_expected_fields(self, client):
        """Each recommendation entry has course name, category, and similarity."""
        resp = client.post("/recommend-course", json=RECOMMEND_VALID)
        if resp.status_code == 200:
            for rec in resp.json()["recommendations"][:3]:
                assert "recommended_course" in rec
                assert "category" in rec
                assert "similarity_score" in rec

    def test_missing_student_interests_returns_422(self, client):
        """An empty body triggers a 422 validation error."""
        resp = client.post("/recommend-course", json={})
        assert resp.status_code == 422


# ===================================================================
# POST /student-profile
# ===================================================================

class TestStudentProfile:
    """Tests for the student career profiling endpoint."""

    def test_valid_input_returns_200(self, client):
        """A valid ProfilingRequest returns HTTP 200."""
        resp = client.post("/student-profile", json=STUDENT_PROFILE_AI)
        assert resp.status_code == 200

    def test_response_has_career_profile(self, client):
        """Response includes experience_level, learning_style, and career track."""
        resp = client.post("/student-profile", json=STUDENT_PROFILE_AI)
        data = resp.json()
        assert "experience_level" in data
        assert "learning_style" in data
        assert "assigned_career_profile" in data

    def test_ai_interests_route_to_ml_track(self, client):
        """Interests containing 'machine learning' route to AI/ML career track."""
        resp = client.post("/student-profile", json={
            "interests": "neural networks and machine learning",
            "experience_level": "advanced",
            "learning_style": "reading",
        })
        assert resp.status_code == 200
        profile = resp.json()["assigned_career_profile"]
        assert "Machine Learning" in profile or "AI" in profile

    def test_web_interests_route_to_fullstack(self, client):
        """Interests containing 'react' route to Fullstack Web Development."""
        resp = client.post("/student-profile", json=STUDENT_PROFILE_WEB)
        assert resp.status_code == 200
        assert "Fullstack" in resp.json()["assigned_career_profile"]

    def test_cybersecurity_interests_route_to_security_track(self, client):
        """Interests containing 'cybersecurity' route to Security track."""
        resp = client.post("/student-profile", json={
            "interests": "cybersecurity and penetration testing",
            "experience_level": "intermediate",
            "learning_style": "hands-on",
        })
        assert resp.status_code == 200
        assert "Cybersecurity" in resp.json()["assigned_career_profile"]

    def test_missing_fields_returns_422(self, client):
        """An empty body triggers a 422 validation error."""
        resp = client.post("/student-profile", json={})
        assert resp.status_code == 422


# ===================================================================
# GET /forecast-sales
# ===================================================================

class TestForecastSales:
    """Tests for the sales forecasting endpoint."""

    def test_returns_200_or_503(self, client):
        """GET /forecast-sales returns 200 (model loaded) or 503."""
        resp = client.get("/forecast-sales")
        assert resp.status_code in (200, 503)

    def test_response_structure_when_loaded(self, client):
        """When the model is loaded, response has next_3_months_revenue_forecast."""
        resp = client.get("/forecast-sales")
        if resp.status_code == 200:
            data = resp.json()
            assert "next_3_months_revenue_forecast" in data
            forecast = data["next_3_months_revenue_forecast"]
            assert isinstance(forecast, dict)
            assert len(forecast) > 0

    def test_forecast_values_are_numeric(self, client):
        """All forecast values should be numeric."""
        resp = client.get("/forecast-sales")
        if resp.status_code == 200:
            forecast = resp.json()["next_3_months_revenue_forecast"]
            for month, value in forecast.items():
                assert isinstance(value, (int, float)), (
                    f"Non-numeric forecast value for {month}: {value}"
                )
