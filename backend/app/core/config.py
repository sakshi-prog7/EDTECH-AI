"""Application settings — everything environment-driven, nothing hardcoded.

Secrets come from environment variables (or `backend/.env`); the dev defaults
below are for local development only. In production the app refuses to start
with the placeholder secrets.
"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

DEV_ACCESS_SECRET = "dev-access-secret-change-me"
DEV_REFRESH_SECRET = "dev-refresh-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "EDTECH AI API"
    node_env: str = "development"  # development | production | test

    port: int = 8000

    # Database — set DATABASE_URL for PostgreSQL/MySQL, or leave unset to use
    # the default SQLite file (matching the original project's embedded DB).
    database_url: str = ""
    db_path: str = ""

    jwt_access_secret: str = DEV_ACCESS_SECRET
    jwt_refresh_secret: str = DEV_REFRESH_SECRET
    # Parseable durations: e.g. "15m", "7d", "2h".
    jwt_access_expires: str = "15m"
    jwt_refresh_expires: str = "7d"
    access_token_expire_minutes: int | None = None  # optional override

    cors_origins: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
        "http://localhost:5176,http://localhost:5177,http://localhost:5178,"
        "http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:5178"
    )

    # Seed demo data automatically when the database is empty.
    auto_seed: bool = True

    # SMTP / Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_from_name: str = "EDTECH AI"
    smtp_use_tls: bool = True

    # Frontend URL (for email links)
    frontend_url: str = "http://localhost:5173"

    # AI provider configuration
    ai_provider: str = "baseline"  # baseline | openai
    openai_api_key: str = ""
    openai_model: str = "gpt-3.5-turbo"

    # ------------------------------------------------------------------ #
    @property
    def is_production(self) -> bool:
        return self.node_env.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        path = Path(self.db_path) if self.db_path else BACKEND_DIR / "data" / "salesgenie.db"
        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{path.as_posix()}"

    @property
    def access_expiry_minutes(self) -> int:
        if self.access_token_expire_minutes:
            return self.access_token_expire_minutes
        return _parse_minutes(self.jwt_access_expires, default=15)

    @property
    def refresh_expiry_minutes(self) -> int:
        return _parse_minutes(self.jwt_refresh_expires, default=7 * 24 * 60)

    def validate_secrets(self) -> None:
        """Fail fast in production when placeholder secrets are present."""
        if not self.is_production:
            return
        if self.jwt_access_secret == DEV_ACCESS_SECRET or self.jwt_refresh_secret == DEV_REFRESH_SECRET:
            raise RuntimeError(
                "Production requires real JWT_ACCESS_SECRET / JWT_REFRESH_SECRET values."
            )


def _parse_minutes(value: str, default: int) -> int:
    value = (value or "").strip().lower()
    if not value:
        return default
    unit = value[-1]
    try:
        n = float(value[:-1])
    except ValueError:
        return default
    if unit == "s":
        return max(1, int(n // 60))
    if unit == "h":
        return max(1, int(n * 60))
    if unit == "d":
        return max(1, int(n * 24 * 60))
    # default to minutes
    return max(1, int(n))


settings = Settings()
