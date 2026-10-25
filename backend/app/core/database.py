"""Database engine + session factory (SQLAlchemy 2.0).

Works with the default SQLite file out of the box (no server required) and
with PostgreSQL/MySQL by setting DATABASE_URL. Schema is created idempotently
via `Base.metadata.create_all` (see `init_db`); demo data is seeded when the
database is empty and AUTO_SEED is enabled.
"""
from __future__ import annotations

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

DATABASE_URL = settings.resolved_database_url
IS_SQLITE = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if IS_SQLITE else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

if IS_SQLITE:

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables (idempotent), enable foreign keys, and patch missing columns."""
    from ..models import entities  # noqa: F401  (register models on Base)

    Base.metadata.create_all(bind=engine)
    if IS_SQLITE:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON"))
            _patch_sqlite_columns(conn)


def _patch_sqlite_columns(conn) -> None:
    """Add any columns that exist in the SQLAlchemy model but are missing from
    the live SQLite schema.  This handles the case where the database was created
    by an older version of the code and new columns were added to the models.
    """
    # Each entry: (table, column, type, default_sql)
    patches: list[tuple[str, str, str, str]] = [
        ("users", "failed_login_attempts", "INTEGER NOT NULL DEFAULT 0", "0"),
        ("users", "locked_until", "VARCHAR", "NULL"),
        ("courses", "mode", "VARCHAR", "NULL"),
        ("courses", "capacity", "INTEGER", "NULL"),
        ("courses", "instructor", "VARCHAR", "NULL"),
    ]
    for table, column, col_def, default_sql in patches:
        try:
            existing = [r[1] for r in conn.execute(text(f"PRAGMA table_info({table})"))]
        except Exception:
            continue
        if column not in existing:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))
    conn.commit()


def table_count(table: str) -> int:
    with engine.connect() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar_one())
