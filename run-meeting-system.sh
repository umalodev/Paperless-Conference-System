#!/bin/bash

echo "Starting Paperless Conference System - Meeting Feature"
echo

echo "1. Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install backend dependencies"
    exit 1
fi

echo
echo "2. Starting backend server..."
npm start &
BACKEND_PID=$!

echo
echo "3. Waiting for backend to start..."
sleep 5

echo
echo "4. Testing API endpoints..."
npm run test-api

echo
echo "5. Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install frontend dependencies"
    kill $BACKEND_PID
    exit 1
fi

echo
echo "6. Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo
echo "System started successfully!"
echo
echo "Backend: http://localhost:3000"
echo "Frontend: Check the frontend terminal for the URL"
echo
echo "Press Ctrl+C to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT

# Wait for user to stop
wait
