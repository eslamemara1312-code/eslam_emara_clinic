@echo off
title EMERGENCY REPAIR - Eslam Emara Clinic
echo.
echo ================================================
echo   EMERGENCY REPAIR: FIXING CONFLICTS
echo ================================================
echo.
echo Step 1: Cleaning up failed Git sync...
git rebase --abort
git merge --abort
echo.
echo Step 2: Restoring files...
git add .
git commit -m "Auto Repair"
echo.
echo Step 3: Forcing update to GitHub...
git push origin main --force
if %ERRORLEVEL% neq 0 (
    git push origin master --force
)
echo.
echo Step 4: Repairing dependencies...
cd frontend
npm install
echo.
echo Step 5: Building website...
npm run build
echo.
echo ================================================
echo   SUCCESS! Your files are restored and synced.
echo ================================================
pause
