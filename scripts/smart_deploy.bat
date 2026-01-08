@echo off
chcp 65001 >nul
title Smart Clinic - Auto Deploy

echo ==========================================
echo [1/2] Updating Frontend (GitHub -> Netlify)
echo ==========================================
:: Push main project to GitHub
git add .
set /p msg="Enter commit message (Press Enter for 'Update'): "
if "%msg%"=="" set msg=Update
git commit -m "%msg%"
git push -u origin main
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push to GitHub.
) else (
    echo [SUCCESS] Pushed to GitHub.
)

echo.
echo ==========================================
echo [2/2] Updating Backend (Hugging Face)
echo ==========================================
:: Ensure Hugging Face remote exists
git remote get-url huggingface >nul 2>nul
if %errorlevel% neq 0 (
    echo Adding Hugging Face remote...
    git remote add huggingface https://huggingface.co/spaces/eslam131223-create/smartclinic-v1
)

:: Push Root to Hugging Face
echo Pushing to Hugging Face Space...
git push -f huggingface main
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push to Hugging Face.
    echo Valid credentials required.
) else (
    echo [SUCCESS] Backend deployed to Hugging Face!
)

echo.
echo ==========================================
echo           DEPLOYMENT FINISHED
echo ==========================================
pause
