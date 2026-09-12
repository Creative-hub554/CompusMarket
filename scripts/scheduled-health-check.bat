@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  Scheduled health check for the champey stack.
REM  Called by Task Scheduler ("champey-health-check", daily 08:00).
REM  Also usable manually. Logs to output\health-check-YYYY-MM-DD.log
REM  and writes output\health-check-last-exit.txt (0 = healthy).
REM
REM  Waits up to 5 min for the Docker engine (boot delay safety),
REM  then runs scripts\health-check.mjs in fix mode and writes the
REM  Prometheus metrics file consumed by scripts\metrics-server.mjs
REM  (output\health-metrics.prom -> Grafana "Stack health" panels).
REM  No secrets are printed (health-check.mjs guarantees it).
REM ============================================================
cd /d C:\Workspace\www.champey.com

REM Task Scheduler environments lack user PATH additions.
set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin;C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm"

set "LOGDIR=C:\Workspace\www.champey.com\output"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%d"
set "LOG=%LOGDIR%\health-check-%TODAY%.log"

echo.>> "%LOG%"
echo ===== scheduled health check %DATE% %TIME% =====>> "%LOG%"

set "ENGINE_OK=0"
for /l %%i in (1,1,10) do (
    if "!ENGINE_OK!"=="0" (
        docker ps >nul 2>&1
        if not errorlevel 1 (
            set "ENGINE_OK=1"
        ) else (
            echo [..] waiting for Docker engine ^(attempt %%i/10^)...>> "%LOG%"
            timeout /t 30 /nobreak >nul
        )
    )
)
if "!ENGINE_OK!"=="0" (
    echo [FAIL] Docker engine unreachable after 5 min of waiting.>> "%LOG%"
    >"%LOGDIR%\health-check-last-exit.txt" echo exit_code=1
    exit /b 1
)
echo [ok] Docker engine reachable>> "%LOG%"

REM Keep the stack-health metrics feed (127.0.0.1:9701 -> Prometheus) alive;
REM metrics-server.mjs exits quietly if a feed is already listening.
netstat -ano | find "LISTENING" | find ":9701 " >nul 2>&1
if errorlevel 1 (
    echo [..] starting metrics feed on 9701...>> "%LOG%"
    powershell -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath 'node' -ArgumentList 'scripts/metrics-server.mjs' -WorkingDirectory 'C:\Workspace\www.champey.com'"
)

set "CHAMPEY_NONINTERACTIVE=1"
node scripts\health-check.mjs --metrics-out "%LOGDIR%\health-metrics.prom" >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

REM (leading-redirect form: avoids "echo 0>" being parsed as handle redirect)
>"%LOGDIR%\health-check-last-exit.txt" echo exit_code=%RC%
echo ===== done, exit_code=%RC% =====>> "%LOG%"
exit /b %RC%
