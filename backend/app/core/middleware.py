"""Security middleware — rate limiting, security headers, request validation.

Provides:
- In-memory rate limiting per IP
- Security headers (CSP, X-Frame-Options, etc.)
- Request size limiting
- Secure CORS behavior
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter per client IP."""

    def __init__(self, app, requests_per_minute: int = 120, requests_per_hour: int = 2000):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.rph = requests_per_hour
        self._minute_hits: dict[str, list[float]] = defaultdict(list)
        self._hour_hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and docs
        if request.url.path in ("/api/health", "/api/docs", "/api/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean and check minute window
        self._minute_hits[client_ip] = [
            t for t in self._minute_hits[client_ip] if now - t < 60
        ]
        if len(self._minute_hits[client_ip]) >= self.rpm:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Rate limit exceeded. Please try again in a moment.",
                    "code": "RATE_LIMITED",
                },
                headers={"Retry-After": "60"},
            )
        self._minute_hits[client_ip].append(now)

        # Clean and check hour window
        self._hour_hits[client_ip] = [
            t for t in self._hour_hits[client_ip] if now - t < 3600
        ]
        if len(self._hour_hits[client_ip]) >= self.rph:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Hourly rate limit exceeded. Please try again later.",
                    "code": "RATE_LIMITED",
                },
                headers={"Retry-After": "3600"},
            )
        self._hour_hits[client_ip].append(now)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # Content Security Policy (relaxed for development, tighten for production)
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:*; "
            "frame-ancestors 'none'"
        )
        response.headers["Content-Security-Policy"] = csp

        return response


class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Limit request body size (default 5MB)."""

    def __init__(self, app, max_size_bytes: int = 5 * 1024 * 1024):
        super().__init__(app)
        self.max_size = max_size_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={
                    "success": False,
                    "message": f"Request body too large. Maximum size is {self.max_size // (1024 * 1024)}MB.",
                    "code": "PAYLOAD_TOO_LARGE",
                },
            )
        return await call_next(request)
