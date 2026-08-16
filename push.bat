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

git commit -m "Smart Hotel Dining - full app with menu photos, AI insights and premium dark UI"
echo     (If it says "nothing to commit", your changes were NOT included - check below.)
echo.

echo [5/5] Pushing to GitHub...
git push -u origin main
if errorlevel 1 (
  echo     Push rejected - integrating remote README and retrying...
  git fetch origin
  if errorlevel 1 goto :error
  git pull origin main --allow-unrelated-histories --no-edit -X ours
  if errorlevel 1 goto :error
  git push -u origin main
  if errorlevel 1 goto :error
)

echo.
echo ============================================
echo  DONE! Pushed to:
echo  https://github.com/eba2311/Smart-Hotel-Dining
echo ============================================
echo.
echo  Verify: open the link above and check that
echo  the Dockerfile contains a line starting with
echo  "ENV MONGO_URI=mongodb+srv://" - if YES,
echo  Render will auto-redeploy and connect to Atlas.
echo.
pause
exit /b 0

:error
echo.
echo  Something went wrong - see the message above.
pause
exit /b 1
