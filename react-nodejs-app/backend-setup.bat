@echo off
echo ========================================
echo Healthcare Assistant - Backend Setup
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Installing backend dependencies...
call npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Checking environment configuration...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit backend\.env and add your OpenAI API key!
    echo.
    pause
)

echo.
echo [3/3] Backend setup complete!
echo.
echo To start the backend server, run:
echo   cd backend
echo   npm run dev
echo.
echo ========================================
echo Next: Run frontend-setup.bat
echo ========================================
pause
