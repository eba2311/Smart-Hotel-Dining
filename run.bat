@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo    Smart Hotel - Starting in ONE window
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

:: Kill old servers
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" 2>nul
timeout /t 2 /nobreak >nul

:: Ensure .env exists
if not exist "server\.env" copy "server\.env.example" "server\.env" >nul 2>nul

echo Starting server on http://localhost:5000 ...
echo Login: manager@hotel.com / Manager@123
echo.
echo Press Ctrl+C to stop.
echo ============================================

:: Run server directly
cd /d "%~dp0server"
node src\index.js
pause
