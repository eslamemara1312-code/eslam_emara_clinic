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

:: 1. Create fresh orphan branch (No history = No binary file bloat)
set DEPLOY_BRANCH=hf-deploy-v4-clean
git branch -D %DEPLOY_BRANCH% >nul 2>nul
git checkout --orphan %DEPLOY_BRANCH%

:: 2. Prepare files (Strict Allowlist - backend ONLY)
:: Unstage everything first
git reset . >nul 2>nul

echo Adding backend files...
git add backend/
git add requirements.txt
git add Dockerfile
git add README.md
git add .dockerignore
git add .env.example

:: 3. Commit
git commit -m "Deploy: Backend V1 (Clean)" >nul 2>nul

:: 4. Push to HF
echo Pushing clean state to Hugging Face...
git push -f huggingface %DEPLOY_BRANCH%:main
set PUSH_STATUS=%errorlevel%

:: 5. Cleanup
git checkout main >nul 2>nul
git branch -D %DEPLOY_BRANCH% >nul 2>nul

if %PUSH_STATUS% neq 0 (
    echo [ERROR] Failed to push to Hugging Face.
    echo Valid credentials required or binary files (logo.png) still persisted.
) else (
    echo [SUCCESS] Backend deployed to Hugging Face!
)

echo.
echo ==========================================
echo           DEPLOYMENT FINISHED
echo ==========================================
pause
