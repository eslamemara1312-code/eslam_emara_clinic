@echo off
title Apply Security Updates & Backup
echo ========================================================
echo      Applying Security Updates (Safely)
echo ========================================================

:: 1. Create Backup if not exists
if not exist "backend_backup_before_security" (
    echo [1/3] Creating Backup of original code...
    mkdir backend_backup_before_security
    xcopy /Y /S /I backend backend_backup_before_security >nul
    copy /Y requirements.txt backend_backup_before_security\requirements.txt >nul
    echo Backup saved to: backend_backup_before_security
) else (
    echo [INFO] Backup folder already exists. Skipping backup to avoid overwriting original with new code.
)

:: 2. Apply Changes
echo [2/3] Applying security fixes to local backend...
copy /Y hf_backend\backend\main.py backend\main.py >nul
copy /Y hf_backend\backend\auth.py backend\auth.py >nul
copy /Y hf_backend\requirements.txt requirements.txt >nul

echo.
echo [3/3] Done! 
echo.
echo [IMPORTANT]
echo If anything breaks, run "undo_security_updates.bat" to restore the backup.
echo.
pause
