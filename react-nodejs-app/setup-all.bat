@echo off
echo ========================================
echo Healthcare Assistant - Quick Setup
echo ========================================
echo.
echo This will set up both backend and frontend
echo.
pause

call backend-setup.bat
if errorlevel 1 exit /b 1

call frontend-setup.bat
if errorlevel 1 exit /b 1

echo.
echo ========================================
echo All Done! Setup Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Edit backend\.env and add your OpenAI API key
echo 2. Open TWO PowerShell terminals
echo 3. Terminal 1: cd backend && npm run dev
echo 4. Terminal 2: cd frontend && npm start
echo.
pause
