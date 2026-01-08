@echo off
title Setup Hugging Face Authentication
echo =====================================================
echo      Setup Hugging Face Authentication Token
echo =====================================================
echo.
echo Please enter your details accurately.
echo.

set /p hf_user="Enter your Hugging Face Username: "
set /p hf_space="Enter your Space Name (e.g., smartclinic-v1): "
echo.
echo Please create a Write token from: https://huggingface.co/settings/tokens
set /p token="Paste your Hugging Face Access Token here: "

if "%token%"=="" (
    echo Error: Token cannot be empty.
    pause
    exit /b
)

cd hf_backend
:: Remove old remote if exists to be safe
git remote remove huggingface 2>nul
git remote add huggingface https://%hf_user%:%token%@huggingface.co/spaces/%hf_user%/%hf_space%

echo.
echo [SUCCESS] Configuration Updated!
echo Remote URL set to: https://huggingface.co/spaces/%hf_user%/%hf_space%
echo.
echo Now you can run smart_deploy.bat again.
echo.
pause
