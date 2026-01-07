@echo off
chcp 65001 >nul
title Smart Clinic - Auto Deploy

echo ==========================================
echo [1/3] Preparing Backend Files...
echo ==========================================
:: Sync latest backend code to hf_backend folder
xcopy /Y /S /I backend hf_backend\backend >nul
copy /Y requirements.txt hf_backend\ >nul
echo Backend files synced to hf_backend.

echo.
echo ==========================================
echo [2/3] Updating Frontend (GitHub -> Netlify)
echo ==========================================
:: Push main project to GitHub
git add .
set /p msg="Enter commit message (Press Enter for 'Update'): "
if "%msg%"=="" set msg=Update
git commit -m "%msg%"
git push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push to GitHub. Check your internet or git config.
) else (
    echo [SUCCESS] Changes pushed to GitHub. Netlify build triggered.
)

echo.
echo ==========================================
echo [3/3] Updating Backend (Hugging Face)
echo ==========================================
cd hf_backend

:: Initialize git if not present (to treat this folder as a separate repo for HF)
if not exist .git (
    git init >nul
    git branch -m main >nul
    echo Initialized git repo for Backend.
)

:: Add and commit backend changes
git add .
git commit -m "%msg%" >nul

:: Try to push to Hugging Face
echo Pushing to Hugging Face Space...
git push huggingface main
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Could not push to Hugging Face automatically.
    echo.
    echo To enable auto-upload for Backend, please run this command ONCE:
    echo ---------------------------------------------------------------
    echo cd hf_backend
    echo git remote add huggingface https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
    echo ---------------------------------------------------------------
) else (
    echo [SUCCESS] Backend deployed to Hugging Face!
)

cd ..
echo.
echo ==========================================
echo           DEPLOYMENT FINISHED
echo ==========================================
pause
