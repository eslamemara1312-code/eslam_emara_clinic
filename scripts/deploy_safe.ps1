# ===================================
# Safe Deployment Script
# رفع التحديثات بأمان
# ===================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Safe Deployment Script" -ForegroundColor Cyan
Write-Host "  رفع التحديثات بأمان" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

# ===================================
# 1. Check Git Status
# ===================================
Write-Host "[1/5] Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "✓ Changes detected" -ForegroundColor Green
    Write-Host $gitStatus
} else {
    Write-Host "! No changes to commit" -ForegroundColor Yellow
}

# ===================================
# 2. Git Commit and Push
# ===================================
Write-Host ""
Write-Host "[2/5] Committing to Git..." -ForegroundColor Yellow

# Get commit message from user
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $commitMessage = "Update: $timestamp"
}

try {
    git add .
    git commit -m $commitMessage
    
    # Push to GitHub
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push origin main
    Write-Host "✓ Pushed to GitHub successfully" -ForegroundColor Green
    
    # Push to Hugging Face
    Write-Host "Pushing to Hugging Face..." -ForegroundColor Cyan
    git push huggingface main
    Write-Host "✓ Pushed to Hugging Face successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Git push failed: $_" -ForegroundColor Red
}

# ===================================
# 3. Deploy Frontend to Netlify
# ===================================
Write-Host ""
Write-Host "[3/5] Deploying Frontend to Netlify..." -ForegroundColor Yellow

Set-Location "$rootDir\frontend"

try {
    # Build frontend
    Write-Host "Building frontend..." -ForegroundColor Cyan
    npm run build
    
    # Deploy to Netlify
    Write-Host "Deploying to Netlify..." -ForegroundColor Cyan
    netlify deploy --prod --dir=dist
    
    Write-Host "✓ Frontend deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend deployment failed: $_" -ForegroundColor Red
    Write-Host "Make sure Netlify CLI is installed: npm install -g netlify-cli" -ForegroundColor Yellow
}

Set-Location $rootDir

# ===================================
# 4. Verify Deployments
# ===================================
Write-Host ""
Write-Host "[4/5] Verifying deployments..." -ForegroundColor Yellow

Write-Host "GitHub: https://github.com/eslamemara1312-code/eslam_emara_clinic" -ForegroundColor Cyan
Write-Host "Hugging Face: https://huggingface.co/spaces/SmartClinic/v1" -ForegroundColor Cyan
Write-Host "Netlify: Check your Netlify dashboard" -ForegroundColor Cyan

# ===================================
# 5. Summary
# ===================================
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "  النشر اكتمل بنجاح!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify Hugging Face backend is running" -ForegroundColor White
Write-Host "2. Check Netlify frontend deployment" -ForegroundColor White
Write-Host "3. Test the application" -ForegroundColor White
Write-Host ""

# Wait for user
Read-Host "Press Enter to exit"
