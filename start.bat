@echo off
title CYBER STRIKE - Multiplayer Shooter Server
color 0b
echo =======================================================
echo    CYBER STRIKE - MULTIPLAYER WEB SHOOTER
echo =======================================================
echo.
echo Starting game server on http://localhost:3000 ...
echo Opening game in your browser automatically...
echo.

start "" "http://localhost:3000"

node server/server.js
if %errorlevel% neq 0 (
  echo.
  echo Server stopped or error occurred.
  pause
)
