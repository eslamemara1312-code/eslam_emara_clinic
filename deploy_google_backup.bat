@echo off
echo ===================================================
echo   Deploying Future-Proofed Update to Hugging Face
echo ===================================================

echo.
echo [1/4] Updating Requirements...
copy /Y backend\requirements.txt hf_backend\requirements.txt
copy /Y backend\requirements.txt hf_backend\requirements_temp.txt
:: Ensuring everything is synced

echo.
echo [2/4] Syncing Backend Code...
xcopy backend hf_backend\backend /E /I /H /Y /Q
:: Clean up local junk from staging area
del hf_backend\backend\*.db 2>nul
rmdir /s /q hf_backend\backend\__pycache__ 2>nul
rmdir /s /q hf_backend\backend\migrations\__pycache__ 2>nul

echo.
echo [3/4] Checking Git Status...
cd hf_backend
git status

echo.
echo [4/4] Committing and Pushing...
git add .
git commit -m "Audit Fix: Added Indexes & Pinned Dependencies"
git push

cd ..
echo.
echo ===================================================
echo      Deployment Complete! 
echo ===================================================
echo.
pause
