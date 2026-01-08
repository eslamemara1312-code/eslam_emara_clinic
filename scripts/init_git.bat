@echo off
echo Initializing Git Repository...
git init
git add .
git commit -m "First upload for Smart Clinic"
git branch -m main
git remote add origin https://github.com/eslam131223-create/smart-clinic.git
echo Pushing to GitHub...
git push -u origin main
echo Done!
pause
