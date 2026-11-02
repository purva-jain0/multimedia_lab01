@echo off
title Jungle Dash: Lost Temple - Game Launcher
echo ========================================================
echo   JUNGLE DASH: LOST TEMPLE - MCA MULTIMEDIA SYSTEMS LAB
echo ========================================================
echo.
echo Starting local web server...
echo Game will automatically open in your default browser.
echo Press Ctrl+C in this terminal when you want to stop the server.
echo.

:: Try Python first if installed
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [Using Python HTTP Server]
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

:: Otherwise try Node / npx serve
node --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [Using Node.js Server]
    start http://localhost:3000
    npx serve . -p 3000
    goto end
)

:: If neither is installed, open index.html directly
echo [Opening index.html directly]
start index.html

:end
