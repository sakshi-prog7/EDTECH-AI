"""EDTECH AI — FastAPI application entry point.

Run (from `backend/`):
    .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

The lifespan creates the schema (idempotent) and seeds demo data when the
database is empty. CORS is restricted to the configured frontend origins;
secrets come from environment variables only.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import init_db
from .core.errors import register_error_handlers
from .core.middleware import RateLimitMiddleware, SecurityHeadersMiddleware, RequestSizeMiddleware
from .routers import (
    admin,
    ai,
    assistant,
    auth,
    calls,
    campaigns,
    courses,
    crm,
    dashboard,
    data,
    email,
    enrollments,
    followups,
    leads,
    notifications,
    student_intelligence,
    students,
    users,
)

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.validate_secrets()
    init_db()
    if settings.auto_seed:
        from .services.seed import seed_database

        seed_database()
        from .services.seed import seed_demo_call_logs
        seed_demo_call_logs()
    logger.info("EDTECH AI backend ready (db: %s)", settings.resolved_database_url)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="EDTECH AI API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # CORS — explicit origins only (credentials are used, so no wildcard).
    # In production, restrict methods and headers for tighter security.
    if settings.is_production:
        allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
        allowed_headers = ["Authorization", "Content-Type", "Accept", "Origin"]
    else:
        allowed_methods = ["*"]
        allowed_headers = ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=allowed_methods,
        allow_headers=allowed_headers,
    )

    # Routers in the same order as the original Express app (matters for the
    # parameterized paths that mirror the original shadowing behavior).
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(leads.router)
    app.include_router(students.router)
    app.include_router(courses.router)
    app.include_router(enrollments.router)
    app.include_router(campaigns.router)
    app.include_router(crm.router)
    app.include_router(dashboard.router)
    app.include_router(notifications.router)
    app.include_router(email.router)
    app.include_router(data.router)
    app.include_router(followups.router)
    app.include_router(calls.router)
    app.include_router(admin.router)
    app.include_router(assistant.router)
    app.include_router(ai.router)  # /api/health, /api/predict/*, /api/recommend/*, ...
    app.include_router(student_intelligence.router)  # /api/ai/students/*

    register_error_handlers(app)

    # Security middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestSizeMiddleware)
    if settings.is_production:
        app.add_middleware(RateLimitMiddleware, requests_per_minute=120, requests_per_hour=2000)

    return app


app = create_app()
