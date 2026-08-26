@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo    Smart Hotel - Initial Setup
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Starting MongoDB (Docker)...
docker compose up -d 2>nul
if errorlevel 1 (
    echo Docker not available - make sure MongoDB is running on localhost:27017
    echo You can install MongoDB from: https://www.mongodb.com/try/download/community
)

echo.
echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 goto :err
call npm --prefix server install
if errorlevel 1 goto :err
call npm --prefix client install
if errorlevel 1 goto :err

echo.
echo [3/4] Creating server/.env...
if not exist "server\.env" (
    copy "server\.env.example" "server\.env" >nul
    echo Created server/.env from template
) else (
    echo server/.env already exists
)

echo.
echo [4/4] Seeding demo data...
call npm run seed
if errorlevel 1 (
    echo WARNING: Seeding failed. This is OK if MongoDB is not running yet.
)

echo.
echo ============================================
echo    Setup complete!
echo    Double-click start.bat to launch the app.
echo ============================================
pause
exit /b 0

:err
echo.
echo Setup failed - see error above.
pause
exit /b 1
