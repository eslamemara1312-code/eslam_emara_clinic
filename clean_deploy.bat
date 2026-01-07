@echo off
title Clean Backend Deployment History
echo =====================================================
echo    Fixing 'Binary File' Error by Resetting History
echo =====================================================
echo.

cd hf_backend

:: 1. Capture the existing remote URL (Token is inside it)
echo [1/5] Saving configuration...
for /f "tokens=*" %%i in ('git remote get-url huggingface') do set REMOTE_URL=%%i

if "%REMOTE_URL%"=="" (
    echo [ERROR] Could not find huggingface remote. Please run fix_hf_auth.bat first.
    pause
    exit /b
)

:: 2. Delete the .git folder to kill all bad history
echo [2/5] Cleaning old history...
rmdir /s /q .git

:: 3. Re-initialize
echo [3/5] Re-initializing...
git init >nul
git branch -m main >nul

:: 4. Restore remote
echo [4/5] Restoring connection...
git remote add huggingface %REMOTE_URL%

:: 5. Ensure NO binary files exist
echo [5/5] Removing binary files...
del /s /q backend\*.db 2>nul
rmdir /s /q backend\__pycache__ 2>nul

:: 6. Create fresh commit and push
echo.
echo Pushing fresh clean version...
git add .
git commit -m "Fresh Deploy (Binaries Removed)"
git push -f huggingface main

echo.
echo [SUCCESS] Backend fixed and deployed!
echo You can now use smart_deploy.bat normally.
echo.
pause
