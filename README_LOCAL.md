# SALES GENIE AI — EDTECH AI

AI-powered EdTech Sales & Admissions Intelligence Platform — a full-stack
application with a **React + Vite + TypeScript + Tailwind** frontend and a
**Python FastAPI + SQLAlchemy** backend (JWT auth, RBAC, CRUD APIs, data-driven
AI/ML engines, knowledge-base assistant).

## Tech Stack

**Frontend**
- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4 (CSS-first config)
- React Router v7, Recharts, Lucide icons

**Backend** (`backend/`)
- Python 3.12+ · FastAPI + Uvicorn
- SQLAlchemy 2 (ORM) with SQLite by default — set `DATABASE_URL` to use
  PostgreSQL/MySQL
- Pydantic v2 request/response validation (automatic 422s)
- JWT access (15 min) + refresh (7 days) tokens via PyJWT
- Passwords hashed with `hashlib.scrypt` (salt per user, timing-safe verify)
- RBAC dependencies (`require_roles`) enforced server-side on every request
- pytest suite covering auth, CRUD, RBAC, and the AI contract

## Getting Started

```bash
# 1. Frontend dependencies
npm install

# 2. Backend — create venv + install dependencies (Windows example)
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Run both (recommended) or in separate terminals:
npm run dev:full                # Vite on :5173 + FastAPI on :8000
```

Separate terminals:

```bash
# Terminal 1 — backend (http://localhost:8000)
cd backend && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (http://localhost:5173)
npm run dev
```

On startup the backend creates the schema automatically (idempotent) and seeds
demo data when the database is empty (`AUTO_SEED=false` disables this). The
default SQLite file is `backend/data/salesgenie.db`; point `DATABASE_URL` at
PostgreSQL/MySQL for a production database.

### Demo accounts (password: `demo1234`)

| Role       | Email                    |
| ---------- | ------------------------ |
| Admin      | `admin@edtech.ai`        |
| Counselor  | `counselor@edtech.ai`    |
| Admissions | `admissions@edtech.ai`   |
| Student    | `student@edtech.ai`      |

## Scripts

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Vite dev server                                    |
| `npm run dev:full`    | Frontend + backend together (concurrently)         |
| `npm run backend`     | Start the FastAPI backend (auto-migrate + seed)    |
| `npm run build`       | Typecheck + frontend production build              |
| `npm run typecheck`   | Typecheck the frontend                             |
| `npm run server:test` | Backend API tests (pytest)                         |
| `npm run server:seed` | Force re-seed of the backend database              |

## Environment

**Frontend** — copy `.env.example` → `.env` at the repo root:
- `VITE_API_URL` — backend base URL (default `http://localhost:8000`)

**Backend** — copy `backend/.env.example` → `backend/.env`:
- `DATABASE_URL` — e.g. `sqlite:///./data/salesgenie.db` or a
  `postgresql+psycopg://…` URL (default: SQLite at `backend/data/salesgenie.db`)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — strong values; required in production
- `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` — e.g. `15m`, `7d`
- `CORS_ORIGINS` — comma-separated frontend origins (Vite ports pre-configured)
- `AUTO_SEED` — seed demo data when the DB is empty (default `true`)
- `PORT` — uvicorn port override (default `8000`)

Secrets are never committed. `.env` files are gitignored; both `.env.example`
files document the required variables. The backend refuses to start in
production with placeholder secrets.

## Backend Architecture

```
backend/
  app/
    main.py           # FastAPI app assembly (CORS, routers, error handlers)
    core/
      config.py       # environment-driven settings + validation
      database.py     # SQLAlchemy engine / session factory
      security.py     # scrypt password hashing + JWT encode/decode
      deps.py         # current-user + role dependencies (RBAC)
      errors.py       # centralized exception handlers + APIError
    models/           # SQLAlchemy ORM models (users, leads, students, courses,
                      #   enrollments, campaigns, opportunities, tasks, meetings,
                      #   notifications, activities, refresh tokens, …)
    schemas/          # Pydantic request/response models
    routers/          # REST endpoints (thin controllers over services)
    services/         # business logic: dashboard stats, AI engines, assistant KB, seed
  tests/              # pytest suites (auth/RBAC, CRUD, CRM, AI contract)
  requirements.txt
  .env.example
```

### API overview (all under `/api`)

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Users (admin) | `GET/POST /users`, `PATCH /users/:id/role`, `PATCH /users/:id/active` |
| Leads | `GET/POST /leads`, `GET/PATCH /leads/:id`, `POST /leads/:id/archive`, `GET /leads/:id/activities`, `GET /leads/:id/score`, `GET /leads/sources` |
| Students | `GET/POST /students`, `GET/PATCH/DELETE /students/:id` |
| Courses | `GET/POST /courses`, `GET/PATCH/DELETE /courses/:id`, `GET /courses/categories` |
| Enrollments | `GET/POST /enrollments`, `GET /enrollments/:id`, `PATCH /enrollments/:id/status`, `GET /enrollments/stats` |
| Campaigns | `GET/POST /campaigns`, `GET/PATCH/DELETE /campaigns/:id` |
| CRM | Opportunities / Tasks / Meetings CRUD under `/crm/…` (search, filter, pagination), `GET /crm/counselors` (performance) |
| Dashboard | `GET /dashboard?range=7d\|30d\|90d\|all`, `GET /dashboard/summary` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Assistant | `POST /assistant/message` (knowledge-base Q&A over live data) |
| AI (contract) | `GET /health`, `POST /predict/lead-score`, `POST /recommend/courses`, `POST /predict/dropout`, `POST /forecast/sales`, `POST /profile/student`, `GET /ai/insights` |

Interactive API docs: `http://localhost:8000/api/docs` (Swagger UI).

Responses use a consistent envelope: success `{ success: true, data }`, error
`{ success: false, message, code }` with proper HTTP status codes
(200/201/400/401/403/404/409/422/500).

### Security Architecture

**Authentication & Session Management**
- Passwords hashed with scrypt (salt per user, timing-safe verify) — never plain text.
- Access tokens (15 min) + rotating refresh tokens (7 days, stored hashed in the DB).
- Refresh token rotation: every refresh revokes the old token and issues a new pair.
- Account lockout: 5 consecutive failed logins → 15-minute lock.
- Login history: every login attempt (success/failure) recorded with IP and user-agent.
- Password strength enforcement: minimum 8 characters, requires letter + digit.
- Forgot-password flow with time-limited reset tokens (1 hour expiry).
- Uniform login error message (no user enumeration).

**Authorization & Access Control**
- Roles (`ADMIN`, `COUNSELOR`, `ADMISSIONS`, `STUDENT`) are loaded from the
  database on every request — never trusted from the client.
- Registration always starts as `STUDENT`; staff roles are granted by admins.
- Backend `CurrentUser` dependency enforces authentication on all sensitive endpoints.
- `require_roles()` dependency gates admin/admissions-only operations server-side.
- Frontend `RequireRole` component blocks unauthorized UI routes (settings, compliance).
- Users cannot access other users' data by modifying IDs in requests.

**Audit Logging**
- Every CRUD operation (create/update/delete) on leads, students, courses,
  enrollments, tasks, meetings, opportunities, campaigns, and workflows is logged.
- Login/logout attempts recorded with IP, user-agent, and success/failure.
- Audit events include: user, action, resource, timestamp, and result.
- Logged to structured JSON for machine-readable analysis.

**Input Validation & Data Protection**
- Pydantic validation on every request body and query parameter (automatic 422s).
- SQLAlchemy parameterized queries prevent SQL injection throughout.
- Password hashes, failed login attempts, and lock status are never returned in API responses.
- JWT secrets, database credentials, and API keys are never committed or exposed to the frontend.
- `.env` files are gitignored; `.env.example` documents required variables.

**Network & Transport Security**
- CORS restricted to configured origins (no wildcard with credentials).
- Production CORS limits HTTP methods and headers explicitly.
- Security headers on all responses: X-Content-Type-Options, X-Frame-Options,
  X-XSS-Protection, Referrer-Policy, Permissions-Policy, Content-Security-Policy.
- Request body size limit (5MB) prevents payload abuse.
- Rate limiting in production: 120 requests/minute, 2000 requests/hour per IP.

**Secure Configuration**
- Backend refuses to start in production with placeholder JWT secrets.
- Environment-driven configuration; no hardcoded credentials.
- Secrets never logged or included in error responses.
- Error messages sanitized — no stack traces or internal details leaked.

**Privacy & Data Handling**
- Data minimization: only necessary fields collected.
- Passwords are never stored in plain text or logged.
- Audit trail for all data modifications.
- User role and permission checks on every sensitive operation.

**Known Limitations**
- SQLite is used by default (acceptable for development; use PostgreSQL in production).
- CORS allows all origins in development mode.
- CSRF protection not implemented (acceptable for JWT-only API).
- In-memory rate limiting resets on server restart.
- Email delivery requires SMTP configuration; without it, emails are logged to console.

## AI/ML engines

All AI endpoints are **data-driven and explainable** — no hardcoded demo
scores. Each engine is a transparent baseline computed from the actual input
(kept modular so a trained model can be plugged in later):

- **Lead scoring** — application rate, enrollment rate, volume and channel
  quality → 0–100 score, probability, risk, intent category and reasons.
- **Course recommendation** — keyword match between the student's interests
  and the course catalog + eligibility → ranked list with match scores/reasons.
- **Conversion prediction** — logistic model over engagement, interactions,
  funnel stage and source → probability + driving factors.
- **Dropout warning / student profiling** — grade, attendance, scholarship,
  demographics → risk probability / readiness score + recommended action.
- **Sales forecast** — damped linear trend fitted to the real historical series.
- **Assistant** — answers questions from live database aggregates (leads,
  courses, enrollments, campaigns, conversion).

The frontend talks to these through the centralized client in
`src/services/apiClient.ts`; the health check in `src/hooks/useAiService.ts`
flips every AI surface to **connected** automatically when the backend is up.

## CRM & admin UI (backend-backed)

The CRM pages are wired to the live API through `src/services/crmApi.ts`
(shared auth headers, refresh handling) and the `useApiList` hook
(pagination/search/filter with loading, empty and error states):

- **Leads** — search/filter/pagination, create/edit modal, detail view with
  activity history, live AI score, archive.
- **Students / Courses** — search/filter/pagination, create/edit, course
  delete.
- **Enrollment Pipeline** — live funnel records with stage-advance actions
  (lead → qualified → application → enrolled) that keep the lead in sync.
- **Campaigns** — create/edit/delete forms persisted to the database.
- **Opportunities / Tasks / Meetings** — full CRUD modules with status
  filters; tasks log activity on the linked lead.
- **Counselor Performance** — per-counselor leads/conversions/open tasks from
  the pipeline.
- **Settings → Team & Roles** (admin only, enforced server-side) — list users,
  change roles, activate/deactivate, invite new team members.

Shared form UI (`Modal`, `FormField`, `ConfirmDialog`) keeps every screen
consistent with the design system; tables collapse to stacked cards on mobile.

## Licenses

This project is released under the **MIT License** — see [LICENSE](LICENSE) for
details. Copyright (c) 2026 EDTECH AI / SalesGenie AI.

All third-party dependencies retain their respective licenses (MIT, ISC,
Apache-2.0, BSD, etc.). The full compliance inventory is available on the
**Compliance** page in the Settings section of the application, or generate it
with `npm run compliance:generate`.

## Testing

```bash
npm run server:test     # backend pytest suites: auth/RBAC, CRUD, CRM, AI contract
npm run typecheck       # frontend TypeScript
npm run build           # production build
```

## Production

```bash
npm run build                                      # builds dist/ (frontend)
cd backend && .venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Set `NODE_ENV=production` (or `APP_ENV=production`) plus real
`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `DATABASE_URL` values before
deploying; the backend refuses to boot with placeholder secrets in production.
Serve the built frontend (`dist/`) from any static host or CDN pointed at the
API.
