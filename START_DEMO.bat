@echo off
setlocal
cd /d "%~dp0"
echo Starting EDTECH AI demo...
start "EDTECH AI Backend" cmd /k "python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 4 /nobreak >nul
start "EDTECH AI Frontend" cmd /k "npm run dev -- --host 127.0.0.1"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173/login"
echo.
echo Demo login: admin@edtech.ai / demo1234
echo Keep both terminal windows open during the presentation.
