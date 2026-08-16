@echo off
setlocal
cd /d "%~dp0"

echo [1/4] Starting MongoDB...
docker compose up -d
if errorlevel 1 echo WARNING: docker compose failed - make sure Docker is running or start MongoDB manually.

echo [2/4] Installing dependencies (server + client)...
call npm run install:all
if errorlevel 1 goto :err

echo [3/4] Creating server/.env...
if not exist server\.env copy server\.env.example server\.env >nul

echo [4/4] Seeding demo data...
call npm run seed
if errorlevel 1 goto :err

echo.
echo Setup complete! Now double-click start.bat to launch the app.
pause
exit /b 0

:err
echo.
echo Setup failed - see error above.
pause
exit /b 1
