@echo off
cd /d "%~dp0"
echo.
echo ============================================
echo  Smart Hotel Dining - GitHub Push
echo ============================================
echo.

if not exist .git (
  echo [1/5] Initializing git repository...
  git init
  if errorlevel 1 goto :error
) else (
  echo [1/5] Git repository already exists.
)

echo [2/5] Setting branch to main...
git branch -M main 2>nul

echo [3/5] Adding remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/eba2311/Smart-Hotel-Dining.git

echo [4/5] Committing files (node_modules, .env, uploads are ignored)...
git add -A
if errorlevel 1 goto :error

git config user.name >nul 2>&1 || git config user.name "eba2311"
git config user.email >nul 2>&1 || git config user.email "eba2311@users.noreply.github.com"

git commit -m "Smart Hotel Dining - full app with menu photos, AI insights and premium dark UI" 2>nul
if errorlevel 1 (
  echo     Nothing new to commit yet, pushing anyway...
)

echo [5/5] Pushing to GitHub...
git push -u origin main
if errorlevel 1 goto :error

echo.
echo ============================================
echo  DONE! Pushed to:
echo  https://github.com/eba2311/Smart-Hotel-Dining
echo ============================================
pause
exit /b 0

:error
echo.
echo  Something went wrong - see the message above.
pause
exit /b 1
