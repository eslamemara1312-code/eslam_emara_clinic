# Eslam Emara Clinic Deployment Tool - ULTIMATE STABILITY VERSION
# NO SPECIAL CHARACTERS - ONLY ASCII
$ErrorActionPreference = "Continue"

Write-Host "================================================"
Write-Host "   Eslam Emara Dental Clinic - Cloud Updater    "
Write-Host "================================================"

# Environment check
$hasGit = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
$hasNpm = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
$repoRoot = $PSScriptRoot

Write-Host "Checking Environment..."
if ($hasGit) { Write-Host "Git: OK" } else { Write-Host "Git: NOT FOUND" }
if ($hasNpm) { Write-Host "NPM: OK" } else { Write-Host "NPM: NOT FOUND" }

# 1. Identity Config
if ($hasGit) {
    $currentName = git config user.name
    if (-not $currentName) {
        Write-Host "Git Identity is required."
        $userName = Read-Host "Enter your Name"
        $userEmail = Read-Host "Enter your Email"
        if ($userName -and $userEmail) {
            git config --global user.name "$userName"
            git config --global user.email "$userEmail"
        }
    }
}

# 2. Main Choice
Write-Host "Options:"
Write-Host "1. Update Everything (Auto Sync)"
Write-Host "2. Fix Dependencies (install)"
Write-Host "3. Build Local Frontend"
Write-Host "4. Exit"
$choice = Read-Host "Choice (1-4)"

if ($choice -eq "4") { exit }

if ($choice -eq "2") {
    Set-Location "$repoRoot/frontend"
    npm install
    Write-Host "Dependencies updated."
}

if ($choice -eq "1") {
    Write-Host "Syncing with Cloud..."
    if ($hasGit) {
        if (-not (Test-Path "$repoRoot/.git")) {
            git init
            git remote add origin https://github.com/eslamemara1312-code/eslam_emara_clinic
        }
        git add .
        git commit -m "Auto Update"
        git push origin main
        if ($LASTEXITCODE -ne 0) { git push origin master }
    }
}

if ($choice -eq "1" -or $choice -eq "3") {
    Write-Host "Building Frontend..."
    if ($hasNpm) {
        Set-Location "$repoRoot/frontend"
        if (-not (Test-Path "node_modules")) { npm install }
        npm run build
        Write-Host "Build finished."
    }
}

Write-Host "Process Finished."
Pause
