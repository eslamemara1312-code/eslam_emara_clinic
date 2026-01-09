@echo off
chcp 65001 >nul
title Smart Clinic - Final Deploy

echo ==========================================
echo [1/2] Updating Frontend (GitHub -> Netlify)
echo ==========================================
git checkout -f main
git add .
git commit -m "Production Deployment v1.0"
git push -u origin main

echo.
echo ==========================================
echo [2/2] Updating Backend (Hugging Face)
echo ==========================================
:: Ensure main is active
git checkout -f main
set DEPLOY_BRANCH=hf-deploy-v6-clean

:: Delete old branches if exists (force)
git branch -D %DEPLOY_BRANCH% >nul 2>nul
git branch -D hf-deploy-v5-clean >nul 2>nul

:: Create fresh orphan branch
git checkout --orphan %DEPLOY_BRANCH%
git reset .

:: Create .env.example if missing
if not exist .env.example (
    echo Creating placeholder .env.example...
    echo SECRET_KEY=placeholder > .env.example
)

echo Adding backend files...
git add backend/
git add requirements.txt
git add Dockerfile
git add README.md
git add .dockerignore
git add .env.example
git add static/

:: Commit
git commit -m "Deploy: Backend V1" >nul 2>nul

:: Push to HF (Force)
echo Pushing clean state to Hugging Face...
:: Using authenticated URL from git remote config (no secrets in file)
git push -f huggingface %DEPLOY_BRANCH%:main
set PUSH_STATUS=%errorlevel%

:: Cleanup
git checkout -f main >nul 2>nul
git branch -D %DEPLOY_BRANCH% >nul 2>nul

if %PUSH_STATUS% neq 0 (
    echo [ERROR] Failed to push to Hugging Face.
    echo Check your permissions or network.
) else (
    echo [SUCCESS] Backend deployed to Hugging Face!
)

echo.
echo ==========================================
echo           DEPLOYMENT FINISHED
echo ==========================================
