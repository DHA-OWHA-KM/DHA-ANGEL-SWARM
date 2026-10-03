@echo off
setlocal enabledelayedexpansion
title ANGEL SWARM - Demo Launcher

REM ---------------------------------------------------------------------------
REM  ANGEL SWARM demo launcher.
REM
REM  Run this once at the start of the day and leave the window it opens alone.
REM  When leadership asks, alt-tab to it - it is already up and already verified.
REM
REM  What it removes, in order of how likely each is to have bitten you:
REM
REM   1. A STALE SERVER. The server binds the first free port at or after the one
REM      it is given, scanning forty of them, so an instance left running from an
REM      earlier session keeps 8787 and a new launch quietly lands on 8788 - and
REM      a tab or an autocompleted address still pointing at 8787 is then serving
REM      an older copy of the app. Every instance is stopped before a new one
REM      starts, and the port is fixed and confirmed.
REM
REM   2. THE BROWSER PROFILE. A fresh, disposable Chrome profile each launch: no
REM      stale cache, no extension injecting into localhost, no leftover state.
REM      Your everyday Chrome is untouched and your tabs and logins stay put.
REM
REM   3. UNVERIFIED LAUNCH. Chrome opens on preflight.html, which loads the
REM      console out of sight and refuses to hand over until every module the
REM      demo needs has published itself - retrying against a fresh URL if not.
REM      You see READY, or you see exactly what is missing. Never a dead globe
REM      in front of an audience.
REM ---------------------------------------------------------------------------

set PORT=8787
cd /d "%~dp0"

echo.
echo   ANGEL SWARM - preparing demo
echo   ----------------------------------------
echo.

REM -- 1. stop every instance already running -------------------------------
echo   [1/4] Stopping any server left running...
taskkill /F /IM ANGEL-SWARM-windows-x64.exe >nul 2>&1
if not errorlevel 1 (
  echo         Stopped a previous instance.
) else (
  echo         None was running.
)
REM Give the OS a moment to release the socket, or the new bind slides to 8788.
ping -n 3 127.0.0.1 >nul

REM -- 2. confirm the port is actually free ---------------------------------
netstat -ano -p tcp | findstr /r /c:"127.0.0.1:%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo.
  echo   !! Port %PORT% is still held by another process.
  echo      The server would silently move to a different port.
  echo      Close whatever is using it, then run this again.
  echo.
  pause
  exit /b 1
)

REM -- 3. start the server on that exact port -------------------------------
echo   [2/4] Starting the server on port %PORT%...
if not exist "ANGEL-SWARM-windows-x64.exe" (
  echo.
  echo   !! ANGEL-SWARM-windows-x64.exe is not in this folder.
  echo      Run DEMO.bat from the folder it came in.
  echo.
  pause
  exit /b 1
)
start "ANGEL SWARM server" /min "ANGEL-SWARM-windows-x64.exe" -port %PORT% -no-browser -quiet

REM -- 4. wait until it actually answers ------------------------------------
echo   [3/4] Waiting for the server to answer...
set READY=0
for /l %%i in (1,1,40) do (
  if !READY!==0 (
    powershell -NoProfile -Command "try{ $r=Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%/preflight.html' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0} else {exit 1} }catch{ exit 1 }" >nul 2>&1
    if not errorlevel 1 (
      set READY=1
    ) else (
      ping -n 2 127.0.0.1 >nul
    )
  )
)
if !READY!==0 (
  echo.
  echo   !! The server did not answer on port %PORT%.
  echo      Check the minimised "ANGEL SWARM server" window for an error.
  echo.
  pause
  exit /b 1
)
echo         Server is up.

REM -- 5. open a clean Chrome on the preflight gate -------------------------
echo   [4/4] Opening a clean browser and verifying every module...

set CHROME=
for %%p in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
  if exist %%p if not defined CHROME set CHROME=%%p
)

REM A disposable profile, wiped each launch: this is what makes a stale cached
REM module or a misbehaving extension impossible rather than merely unlikely.
set PROFILE=%TEMP%\angel-demo-profile
if exist "%PROFILE%" rd /s /q "%PROFILE%" >nul 2>&1

if defined CHROME (
  start "" %CHROME% ^
    --user-data-dir="%PROFILE%" ^
    --no-first-run ^
    --no-default-browser-check ^
    --disable-extensions ^
    --new-window "http://127.0.0.1:%PORT%/preflight.html"
) else (
  echo         Chrome not found in the usual places - using the default browser.
  start "" "http://127.0.0.1:%PORT%/preflight.html"
)

echo.
echo   ----------------------------------------
echo   Demo is coming up at http://127.0.0.1:%PORT%
echo.
echo   The browser shows READY and opens the app by itself.
echo   If it shows NOT READY it names exactly what is missing.
echo.
echo   Leave this running all day. When leadership asks,
echo   alt-tab to the browser window - it is already verified.
echo.
echo   Closing this window does NOT stop the server.
echo   To stop it: run STOP-DEMO.bat, or close the
echo   minimised "ANGEL SWARM server" window.
echo   ----------------------------------------
echo.
timeout /t 12 >nul
