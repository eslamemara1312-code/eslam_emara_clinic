# Eslam Emara Clinic Deployment Tool - CONFLICT RESOLVER VERSION
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

# Identity Config
if ($hasGit) {
    if (-not (git config user.name)) {
        Write-Host "Setting up identity..."
        git config --global user.name "Eslam Emara"
        git config --global user.email "eslam@example.com"
    }
}

# Main Menu
Write-Host "`nOptions:"
Write-Host "1. Update Normally (Recommended)"
Write-Host "2. Force Update (If 1 fails - overwrites Cloud with Local)"
Write-Host "3. Connect to GitHub (Run this if first time)"
Write-Host "4. Build Frontend Only"
Write-Host "5. Exit"
$choice = Read-Host "Choice (1-5)"

if ($choice -eq "5") { exit }

if ($choice -eq "3") {
    $remoteUrl = Read-Host "Paste GitHub Repo URL"
    if ($remoteUrl) {
        if (-not (Test-Path "$repoRoot/.git")) { git init }
        git remote remove origin 2>$null
        git remote add origin $remoteUrl
        Write-Host "Connected to: $remoteUrl"
    }
}

if ($choice -eq "1" -or $choice -eq "2") {
    Write-Host "`n[Action: Syncing with GitHub]"
    if ($hasGit) {
        Set-Location "$repoRoot"
        git checkout -b main 2>$null
        git branch -m main 2>$null
        
        Write-Host "Staging all changes..."
        git add -A
        
        $msg = "Update " + (Get-Date -Format 'HH:mm')
        git commit -m "$msg" 2>$null
        
        if ($choice -eq "1") {
            Write-Host "Attempting safe upload (Pull then Push)..."
            git pull origin main --rebase
            git push origin main
        }
        else {
            Write-Host "Attempting FORCE upload (Overwriting Cloud)..."
            git push origin main -f
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "SYNC FAILED. If this is a new repo, try Option 2 (Force)." -ForegroundColor Red
        }
        else {
            Write-Host "SUCCESS! Your site is now updating." -ForegroundColor Green
        }
    }
}

if ($choice -eq "1" -or $choice -eq "2" -or $choice -eq "4") {
    Write-Host "`n[Action: Building Layout]"
    if ($hasNpm) {
        Set-Location "$repoRoot/frontend"
        if (-not (Test-Path "node_modules")) { npm install }
        npm run build
        Write-Host "Build complete."
    }
}

Write-Host "`nProcess finished."
Pause
