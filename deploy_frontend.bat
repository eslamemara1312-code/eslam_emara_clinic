@echo off
echo ===================================================
echo   Deploying Frontend to GitHub (Netlify)
echo ===================================================

echo.
echo [1/2] Staging Frontend Changes...
git add frontend/src/api.js
git add frontend/src/pages/Settings.jsx
git add frontend/src/pages/Login.jsx
:: Add other tracked files if needed, but these are the critical UI updates
git add .

echo.
echo [2/2] Committing and Pushing...
git commit -m "Feat: Update Frontend (Restore UI, Login Errors)"
git push origin main

echo.
echo ===================================================
echo      Frontend Deployment Triggered!
echo ===================================================
echo.
pause
