@echo off
echo ========================================
echo Healthcare Assistant - Frontend Setup
echo ========================================
echo.

cd /d "%~dp0frontend"

echo [1/3] Installing frontend dependencies...
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
    echo Default configuration created successfully!
)

echo.
echo [3/3] Frontend setup complete!
echo.
echo To start the frontend, run:
echo   cd frontend
echo   npm start
echo.
echo ========================================
echo Setup Complete! Ready to run the app.
echo ========================================
echo.
echo Quick Start:
echo   1. Open TWO PowerShell terminals
echo   2. Terminal 1: cd backend, then npm run dev
echo   3. Terminal 2: cd frontend, then npm start
echo.
pause
