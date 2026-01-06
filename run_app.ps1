# Script to start EslamEmara Clinic App
$ErrorActionPreference = "Stop"

Write-Host "Starting EslamEmara Clinic System..." -ForegroundColor Green

# Path to Python - identified from previous steps
$pythonPath = "C:\Users\ES11\AppData\Local\Programs\Python\Python314\python.exe"

# 1. Start Backend Server
Write-Host "Checking Backend dependencies..." -ForegroundColor Yellow
try {
    # Automatically install missing dependencies from requirements.txt
    & "$pythonPath" -m pip install -r "$PSScriptRoot\backend\requirements.txt"
}
catch {
    Write-Warning "Failed to update dependencies. Continuing..."
}

Write-Host "Launching Backend Server (API)..." -ForegroundColor Cyan
try {
    # Added --host 0.0.0.0 to allow access from other devices
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$pythonPath' -m uvicorn backend.main:app --reload --host 0.0.0.0" -WorkingDirectory "$PSScriptRoot"
}
catch {
    Write-Error "Failed to start Backend. Is Python installed?"
}

# 2. Start Frontend Server (with Network Access)
Write-Host "Launching Frontend Interface..." -ForegroundColor Cyan
try {
    Set-Location "$PSScriptRoot\frontend"
    # Check if node_modules exists, if not run install
    if (-not (Test-Path "node_modules")) {
        Write-Host "First time setup: Installing Frontend dependencies..." -ForegroundColor Yellow
        cmd /c "npm install"
    }
    # Added -- --host to allow mobile access
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev -- --host"
}
catch {
    Write-Error "Failed to start Frontend. Is Node.js installed?"
}

# 3. Find and Display Local IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*vEthernet*" }).IPAddress | Select-Object -First 1

Write-Host "------------------------------------------------" -ForegroundColor Green
Write-Host "System is starting in two separate windows."
Write-Host "To access from this computer: http://localhost:5173" -ForegroundColor White
if ($ip) {
    Write-Host "To access from Android (Same Wi-Fi): http://$($ip):5173" -ForegroundColor Yellow
}
Write-Host "------------------------------------------------" -ForegroundColor Green
Pause
