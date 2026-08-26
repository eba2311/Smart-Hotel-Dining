@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo    SMART HOTEL - Starting Application
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)

:: Kill old servers
echo Stopping old servers...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" 2>nul
timeout /t 2 /nobreak >nul

:: Ensure .env exists
if not exist "server\.env" copy "server\.env.example" "server\.env" >nul 2>nul

echo Starting Smart Hotel API on port 5000...
echo.

:: Open browser after 4 second delay
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5000"

:: Start server
cd /d "%~dp0server"
node src\index.js
pause
