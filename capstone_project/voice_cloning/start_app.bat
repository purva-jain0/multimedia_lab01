@echo off
title VoiceMorph - Voice Cloning Web App Studio
echo ========================================================
echo   ElevenLabs Voice Cloning & Sound Transformation Studio
echo   Capstone Project: Multimedia Lab 01
echo ========================================================
echo.

cd /d "%~dp0backend"
echo [1/2] Starting Python FastAPI Backend on http://localhost:8000 ...
start "VoiceMorph Backend" cmd /k "python main.py"

echo [2/2] Launching Web Browser...
timeout /t 3 /nobreak >nul
start http://localhost:8000

echo.
echo ========================================================
echo   Application is now running!
echo   Frontend & Backend accessible at: http://localhost:8000
echo   To run Frontend Vite dev server separately:
echo     run_frontend.bat
echo ========================================================
echo.
pause
