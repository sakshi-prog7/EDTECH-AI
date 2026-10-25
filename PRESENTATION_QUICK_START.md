# EDTECH AI — Presentation Quick Start

## Fastest way on Windows
1. Double-click `START_DEMO.bat`.
2. Wait about 8–10 seconds.
3. Browser opens at `http://localhost:5173/login`.
4. The login page is prefilled with the demo admin account. Click **Sign in**.

Demo credentials:
- Email: `admin@edtech.ai`
- Password: `demo1234`

## Manual commands
From this project root, use two terminals:

Backend:
```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:
```powershell
npm run dev -- --host 127.0.0.1
```

Then open `http://localhost:5173/login`.

Do NOT run `python -m uvicorn main:app` for the presentation; the frontend uses the modern `backend.app.main` authentication API.
