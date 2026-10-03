@echo off
title ANGEL SWARM - Stop
echo.
echo   Stopping the ANGEL SWARM server...
taskkill /F /IM ANGEL-SWARM-windows-x64.exe >nul 2>&1
if errorlevel 1 (
  echo   Nothing was running.
) else (
  echo   Stopped.
)
echo.
timeout /t 3 >nul
