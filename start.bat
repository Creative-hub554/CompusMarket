@echo off
cd /d "%~dp0"
title KHMERONLINESHOP
color 0B

:: Ensure Node.js and pnpm are in PATH
set "PATH=C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm;%PATH%"
set "PNPM=C:\Users\theow\AppData\Roaming\npm\pnpm.cmd"

:: Load config
if exist "config.bat" call "config.bat"
if "%STATIC_IP%"=="" set STATIC_IP=

:menu
cls
echo.
echo  ============================================
echo     KHMERONLINESHOP - Launcher
echo  ============================================
echo.
echo     1 - Admin Mode  (Frontend:3000 + Admin:3001)
echo     2 - Normal Mode (Frontend:3002 + Admin:3003)
echo     3 - Custom Ports
echo     4 - Kill All Services
echo     5 - Set Static IP (current: %STATIC_IP%)
echo     6 - Exit
echo.
set /p choice="  Enter number: "

if "%choice%"=="1" set FPORT=3000 & set APORT=3001 & set BPORT=4000 & set MODE=Admin & goto start
if "%choice%"=="2" set FPORT=3002 & set APORT=3003 & set BPORT=4001 & set MODE=Normal & goto start
if "%choice%"=="3" goto ports
if "%choice%"=="4" goto kill
if "%choice%"=="5" goto ip
if "%choice%"=="6" exit /b
goto menu

:ports
cls
echo.
echo  ============================================
set /p FPORT="  Frontend port [3000]: "
if "%FPORT%"=="" set FPORT=3000
set /p APORT="  Admin port [3001]: "
if "%APORT%"=="" set APORT=3001
set /p BPORT="  Backend port [4000]: "
if "%BPORT%"=="" set BPORT=4000
set MODE=Custom
goto start

:ip
cls
echo.
echo  ============================================
echo  Current: %STATIC_IP% (blank = auto-detect)
echo.
set /p NEW_IP="  Enter IP: "
if "%NEW_IP%"=="" (
    echo set STATIC_IP=>config.bat
    set STATIC_IP=
) else (
    echo set STATIC_IP=%NEW_IP%>config.bat
    set STATIC_IP=%NEW_IP%
)
echo  Saved.
timeout /t 2 >nul
goto menu

:kill
cls
echo.
echo  Stopping all services...
for %%p in (3000 3001 3002 3003 4000 4001) do (
    for /f "skip=4 tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
echo  Done.
timeout /t 2 >nul
goto menu

:start
cls
echo.
echo  ============================================
echo     Starting %MODE% Mode
echo  ============================================
echo.

where node >nul 2>&1 || (
    echo  [FAIL] Node.js not found
    pause
    exit /b 1
)

if not exist "%PNPM%" (
    echo  [FAIL] pnpm not found at %PNPM%
    pause
    exit /b 1
)

echo  [1/4] Cleaning ports %FPORT%, %APORT%, %BPORT%...
for %%p in (%FPORT% %APORT% %BPORT%) do (
    for /f "skip=4 tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
timeout /t 2 >nul

echo  [2/4] Dependencies...
if not exist "node_modules\.pnpm\" (
    "%PNPM%" install
)

echo  [3/4] Database...
"%PNPM%" -F @theo/database exec prisma generate >nul 2>&1

:: Get IP for display
if "%STATIC_IP%"=="" (
    set IP=localhost
) else (
    set IP=%STATIC_IP%
)

echo  [4/4] Starting servers...
echo.

:: Set HOSTNAME globally so all child processes inherit it
set HOSTNAME=0.0.0.0

start "Frontend :%FPORT%" /MIN cmd /c ""%PNPM%" --filter frontend dev --port %FPORT%"
start "Admin    :%APORT%" /MIN cmd /c ""%PNPM%" --filter admin dev --port %APORT%"
start "Backend  :%BPORT%" /MIN cmd /c ""%PNPM%" --filter backend dev"

echo  Waiting for servers to start...
timeout /t 15 >nul

:: Check if servers are running
set F_OK=0
set A_OK=0
netstat -ano | findstr ":%FPORT% " >nul 2>&1 && set F_OK=1
netstat -ano | findstr ":%APORT% " >nul 2>&1 && set A_OK=1

echo.
echo  ============================================
if "%F_OK%"=="1" (echo   Frontend: http://localhost:%FPORT%  [OK]) else (echo   Frontend: http://localhost:%FPORT%  [FAIL])
if "%A_OK%"=="1" (echo   Admin:    http://localhost:%APORT%  [OK]) else (echo   Admin:    http://localhost:%APORT%  [FAIL])
echo   Network:  http://%IP%:%FPORT%
echo  ============================================
echo.

if "%F_OK%"=="1" start http://localhost:%FPORT%
if "%A_OK%"=="1" start http://localhost:%APORT%

echo  Close this window or press any key to shut down...
pause >nul
goto kill
