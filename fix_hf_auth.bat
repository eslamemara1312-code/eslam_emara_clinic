@echo off
title Setup Hugging Face Authentication
echo =====================================================
echo      Setup Hugging Face Authentication Token
echo =====================================================
echo.
echo Please create a Write token from: https://huggingface.co/settings/tokens
echo.
set /p token="Paste your Hugging Face Access Token here: "

if "%token%"=="" (
    echo Error: Token cannot be empty.
    pause
    exit /b
)

cd hf_backend
git remote set-url huggingface https://eslam131223-create:%token%@huggingface.co/spaces/eslam131223-create/smartclinic-v1

echo.
echo [SUCCESS] Authentication configured!
echo Now you can run smart_deploy.bat again.
echo.
pause
