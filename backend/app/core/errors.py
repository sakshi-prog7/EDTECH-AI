"""Centralized errors + response envelope.

Every success is `{"success": true, "data": ...}`; every error is
`{"success": false, "message": ..., "code": ...}`. HTTP status codes follow the
project contract (200/201/400/401/403/404/409/422/500).
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


class AppError(Exception):
    """Error with an HTTP status + machine-readable code."""

    def __init__(self, message: str, status: int = 400, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code or _http_code_name(status)


def ok(data, status: int = 200):  # noqa: ANN001
    """`{success: true, data}` envelope for handlers to return directly."""
    return {"success": True, "data": data}


def _http_code_name(status: int) -> str:
    names = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_ERROR",
    }
    return names.get(status, "ERROR")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={"success": False, "message": exc.message, "code": exc.code},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # First error, zod-style: "field: message" (or just the message).
        parts: list[str] = []
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            prefix = f"{'.'.join(loc)}: " if loc else ""
            parts.append(f"{prefix}{err.get('msg', 'Invalid request data.')}")
        message = "; ".join(parts) or "Invalid request data."
        return JSONResponse(
            status_code=422,
            content={"success": False, "message": message, "code": "VALIDATION_ERROR"},
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(
        _request: Request, exc: IntegrityError
    ) -> JSONResponse:
        if "UNIQUE" in str(exc.orig).upper():
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "message": "A record with that value already exists.",
                    "code": "CONFLICT",
                },
            )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Something went wrong on the server.",
                "code": "INTERNAL_ERROR",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        import logging

        logging.getLogger("uvicorn.error").exception("unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Something went wrong on the server.",
                "code": "INTERNAL_ERROR",
            },
        )
