@echo off
setlocal
cd /d "%~dp0"

echo =============================================
echo   Smart Hotel - Fix and Launch
echo =============================================

echo.
echo [1/6] Checking MongoDB (port 27017)...
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo   MongoDB not running - trying to start it...
  docker compose up -d 2>nul
  if errorlevel 1 net start MongoDB 2>nul
  powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
  if errorlevel 1 echo   WARNING: Could not start MongoDB on port 27017 - start it manually.
) else (
  echo   MongoDB is already running.
)

echo.
echo [2/6] Stopping old servers on ports 5000 and 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host ('  Killed old process PID ' + $_) }"
timeout /t 1 /nobreak >nul

echo.
echo [3/6] Installing dependencies (root, server, client)...
call npm install
if errorlevel 1 goto :err
call npm --prefix server install
if errorlevel 1 goto :err
call npm --prefix client install
if errorlevel 1 goto :err

echo.
echo [4/6] Creating server\.env if missing...
if not exist server\.env copy server\.env.example server\.env >nul

echo.
echo [5/6] Seeding demo data...
call npm run seed
if errorlevel 1 goto :err

echo.
echo [6/6] Launching API server + Web client...
start "Smart Hotel - API" cmd /k "cd /d "%~dp0" && npm run server"
start "Smart Hotel - Web" cmd /k "cd /d "%~dp0" && npm run client"

echo.
echo =============================================
echo   Done! Open http://localhost:5173 in browser
echo     Manager -^> manager@hotel.com / Manager@123
echo     Waiter  -^> waiter@hotel.com  / Waiter@123
echo     Kitchen -^> kitchen@hotel.com / Kitchen@123
echo =============================================
timeout /t 3 /nobreak >nul
exit /b 0

:err
echo.
echo FAILED - see the error above.
pause
exit /b 1
