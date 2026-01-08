@echo off
title Undo Security Updates
echo ========================================================
echo      Restoring Original Backup
echo ========================================================

if not exist "backend_backup_before_security" (
    echo [ERROR] No backup folder found! Cannot restore.
    pause
    exit /b
)

echo Restoring files from 'backend_backup_before_security'...
xcopy /Y /S /I backend_backup_before_security backend >nul
copy /Y backend_backup_before_security\requirements.txt requirements.txt >nul

echo.
echo [SUCCESS] Original version restored.
echo.
pause
