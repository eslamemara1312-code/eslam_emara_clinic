@echo off
title EMERGENCY REPAIR - Eslam Emara Clinic
echo.
echo ================================================
echo   EMERGENCY REPAIR: FIXING CONFLICTS
echo ================================================
echo.

echo [1/5] Cleaning up failed Git sync...
git rebase --abort 2>nul
git merge --abort 2>nul
echo Done.
echo.

echo [2/5] Staging and Committing local changes...
git add -A
git commit -m "Emergency Manual Repair"
echo Done.
echo.

echo [3/5] Forcing update to GitHub...
echo (If a browser window opens, please login to GitHub)
git push origin main --force
if %ERRORLEVEL% neq 0 (
    echo Attempting push to master...
    git push origin master --force
)
if %ERRORLEVEL% neq 0 (
    echo [!] PUSH FAILED. Check your internet or GitHub login.
) else (
    echo SUCCESS: GitHub is updated.
)
pause
echo.

echo [4/5] Repairing frontend dependencies (npm install)...
echo (This may take a minute)
cd frontend
call npm install
echo Done.
echo.

echo [5/5] Building final website...
call npm run build
echo.
echo ================================================
echo   REPAIR FINISHED. 
echo   Check your website online in a few minutes.
echo ================================================
pause
