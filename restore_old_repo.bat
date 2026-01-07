@echo off
title Restore Old Repository History
echo =====================================================
echo      Time Travel: Restore Old Project
echo =====================================================
echo.
echo This script will help you revert 'eslam_emara_clinic' to a previous state.
echo.

:: Prepare temp folder
if exist restore_temp rmdir /s /q restore_temp
mkdir restore_temp
cd restore_temp

echo Cloning old repository...
git clone https://github.com/eslamemara1312-code/eslam_emara_clinic.git .

echo.
echo =====================================================
echo                 RECENT HISTORY
echo =====================================================
git log -n 10 --oneline --graph --decorate
echo =====================================================
echo.
echo Look at the list above. The first one is likely the "Mistake".
echo Pick the commit ID (e.g., 7a3b1c) just BEFORE the mistake.
echo.

set /p commit="Enter Commit ID to restore to: "

if "%commit%"=="" (
    echo Cancelled.
    cd ..
    rmdir /s /q restore_temp
    pause
    exit /b
)

echo.
echo Resetting to %commit%...
git reset --hard %commit%

echo.
echo Force pushing to server (This basically 'Deletes' the newer commits)...
git push -f origin main

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Repository restored to version %commit%!
    echo The old site should be back to normal now.
) else (
    echo.
    echo [ERROR] Restore failed. Check permissions/token.
)

cd ..
rmdir /s /q restore_temp
pause
