@echo off
echo Starting Dental SaaS Application...

:: Create static directories if they don't exist
if not exist "static\logos" mkdir "static\logos"

:: Start Backend
echo Starting Backend (Port 8001)...
start "DentalSaaS Backend" cmd /k "py -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8001"

:: Start Frontend
echo Starting Frontend...
cd frontend
start "DentalSaaS Frontend" cmd /k "npm run dev"

echo Application started! 
echo Backend: http://localhost:8001
echo Frontend: http://localhost:5173
pause
