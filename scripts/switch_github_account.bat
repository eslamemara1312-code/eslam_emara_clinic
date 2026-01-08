@echo off
title Switch GitHub Account
echo =====================================================
echo    Migrate Project to New GitHub Account
echo =====================================================
echo.
echo This script will connect your project to your NEW GitHub account.
echo It will ask for a Personal Access Token to bypass old saved passwords.
echo.

set /p user="Enter NEW GitHub Username (e.g., eslam131223-create): "
set /p repo="Enter NEW Repository Name (e.g., smart-clinic): "
echo.
echo Please create a 'Classic' Token (repo scope) from:
echo https://github.com/settings/tokens
echo.
set /p token="Paste your GitHub Personal Access Token: "

if "%token%"=="" (
    echo Error: Token cannot be empty.
    pause
    exit /b
)

:: Configure remote with token
echo.
echo Updating configuration...
git remote remove origin 2>nul
git remote add origin https://%user%:%token%@github.com/%user%/%repo%.git

echo.
echo Pushing project to NEW account...
git branch -m main
git push -f -u origin main

echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Project is now connected to: https://github.com/%user%/%repo%
    echo Future deployments with smart_deploy.bat will use this new account.
) else (
    echo [ERROR] Failed to push. Please check your Token and try again.
)
pause
