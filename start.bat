@echo off
setlocal
cd /d "%~dp0"

echo Starting MongoDB if not already running...
docker compose up -d 2>nul
if errorlevel 1 net start MongoDB 2>nul

echo Stopping any old servers on ports 5000 and 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul

echo Starting API server (port 5000)...
start "Smart Hotel - API" cmd /k "cd /d "%~dp0" && npm run server"

echo Starting Web client (port 5173)...
start "Smart Hotel - Web" cmd /k "cd /d "%~dp0" && npm run client"

echo.
echo Both windows opened. Open http://localhost:5173 in your browser.
echo Login: manager@hotel.com / Manager@123
pause
