@echo off
echo Starting Paperless Conference System - Meeting Feature
echo.

echo 1. Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo 2. Starting backend server...
start "Backend Server" cmd /k "npm start"

echo.
echo 3. Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 4. Testing API endpoints...
call npm run test-api

echo.
echo 5. Installing frontend dependencies...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo 6. Starting frontend development server...
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo System started successfully!
echo.
echo Backend: http://localhost:3000
echo Frontend: Check the frontend terminal for the URL
echo.
echo Press any key to open the application...
pause >nul

echo Opening application...
start http://localhost:3000

echo.
echo Meeting System is ready!
echo You can now:
echo 1. Open the frontend URL in your browser
echo 2. Navigate to /start to begin
echo 3. Create or join a meeting
echo.
pause
