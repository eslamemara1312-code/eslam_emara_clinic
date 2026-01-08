@echo off
chcp 65001 >nul
title Auto Upload Security Updates
echo ========================================================
echo [Auto Upload] Pushing Security Updates to Hugging Face
echo ========================================================

:: 1. Copy latest backend code to hf_backend
echo [1/3] Syncing files...
xcopy /Y /S /I backend hf_backend\backend >nul
copy /Y requirements.txt hf_backend\ >nul

:: Clean unnecessary files
del /s /q hf_backend\backend\*.db 2>nul
rmdir /s /q hf_backend\backend\__pycache__ 2>nul

:: 2. Push to Hugging Face
echo [2/3] Committing changes...
cd hf_backend
git add .
git commit -m "Security Hardening: Rate Limiting & Env Vars"

echo [3/3] Uploading...
git push huggingface main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Upload failed. Please check your internet or tokens.
) else (
    echo.
    echo [SUCCESS] Security updates deployed successfully!
)

cd ..
echo.
pause
