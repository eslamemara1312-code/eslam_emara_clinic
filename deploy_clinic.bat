@echo off
title Eslam Emara Clinic Deployment Tool
echo.
echo ================================================
echo   Eslam Emara Dental Clinic - Easy Update
echo ================================================
echo.
echo This tool will help you update your clinic website.
echo.
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0deploy_clinic.ps1'"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The update script failed or was interrupted.
    pause
)
