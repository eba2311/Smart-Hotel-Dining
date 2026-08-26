@echo off
setlocal
cd /d "%~dp0"

echo Building client...
cd /d "%~dp0client"
npx vite build
echo.
echo Build done! Now run LAUNCH.bat
pause
