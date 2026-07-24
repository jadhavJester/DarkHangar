@echo off
:: ============================================
:: DarkHangar V2 — Development Launcher
:: ============================================
:: Runs the frontend dev server (port 5173)
:: and the backend API server (port 8000)
:: ============================================

setlocal
set PROJECT=%~dp0
set BACKEND=%PROJECT%backend
set FRONTEND=%PROJECT%frontend

echo.
echo ============================================
echo  DarkHangar V2 — Development Mode
echo ============================================
echo.

:: Start backend server
echo Starting backend server on port 8000...
start "DarkHangar V2 Backend" cmd /k "cd /d %BACKEND% && python -m uvicorn main:app --reload --port 8000"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend dev server
echo Starting frontend dev server on port 5173...
start "DarkHangar V2 Frontend" cmd /k "cd /d %FRONTEND% && npm run dev"

echo.
echo ============================================
echo  Both servers started!
echo  Frontend:  http://localhost:5173
echo  Backend:   http://localhost:8000
echo ============================================
echo.
echo Close this window or press Ctrl+C to stop.
echo Close the server windows to stop them.
echo.

endlocal
