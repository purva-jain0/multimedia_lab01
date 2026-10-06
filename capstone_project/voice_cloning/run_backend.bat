@echo off
title VoiceMorph Backend Server
cd /d "%~dp0backend"
echo Starting FastAPI Backend with Uvicorn on http://127.0.0.1:8000 ...
python main.py
pause
