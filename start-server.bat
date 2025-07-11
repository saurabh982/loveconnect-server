@echo off
echo Starting Usage Agent Server...
echo.
echo Make sure you have Node.js installed!
echo If you don't have it, download from: https://nodejs.org
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting server on http://localhost:3000
echo.
echo To test from Android emulator, use: http://10.0.2.2:3000
echo To test from real device, use your computer's IP address
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
