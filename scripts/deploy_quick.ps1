# ===================================
# Quick Git Deploy
# نشر سريع وآمن عبر Git
# ===================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Quick Git Deploy" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

# Check Git Status
Write-Host "Checking changes..." -ForegroundColor Yellow
$gitStatus = git status --porcelain

if (-not $gitStatus) {
    Write-Host "! No changes to deploy" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Changes found:" -ForegroundColor Green
git status --short

# Get commit message
Write-Host ""
$commitMessage = Read-Host "Commit message (Enter for auto-message)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $commitMessage = "Update $timestamp"
}

# Commit
Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Cyan
git add .
git commit -m $commitMessage

# Push to GitHub
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
try {
    git push origin main
    Write-Host "✓ GitHub: Success" -ForegroundColor Green
}
catch {
    Write-Host "✗ GitHub: Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Push to Hugging Face
Write-Host ""
Write-Host "Pushing to Hugging Face (Backend)..." -ForegroundColor Yellow
try {
    git push huggingface main
    Write-Host "✓ Hugging Face: Success" -ForegroundColor Green
    Write-Host "Backend will auto-deploy in ~30 seconds" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Hugging Face: Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Links:" -ForegroundColor Yellow
Write-Host "GitHub: https://github.com/eslamemara1312-code/eslam_emara_clinic" -ForegroundColor Cyan
Write-Host "Backend: https://smartclinic-v1.hf.space" -ForegroundColor Cyan
Write-Host "Frontend: https://smart-dental-clinic-kappa.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Vercel will auto-deploy from GitHub in ~1 minute" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
