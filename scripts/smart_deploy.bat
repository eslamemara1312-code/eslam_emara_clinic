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

:: 1. Create temporary deployment branch
git branch -D hf-deploy-tmp 2>nul
git checkout -b hf-deploy-tmp

:: 2. Remove Frontend and heavy assets (HF only needs Backend)
echo Stripping frontend assets to satisfy file size limits...
git rm -r -f --cached frontend >nul 2>nul
git rm -r -f --cached .gitattributes >nul 2>nul
:: Note: We keep 'static' if it exists, but usually users upload there.

:: 3. Commit the stripped version
git commit -m "Deploy: Strip frontend for HF" --no-verify >nul 2>nul

:: 4. Push the stripped branch to HF's 'main' branch
git push -f huggingface hf-deploy-tmp:main

:: 5. Cleanup: Return to local main
git checkout main >nul 2>nul
git branch -D hf-deploy-tmp >nul 2>nul
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
