@echo off
cd /d "%~dp0"
title champey - canonical launcher
color 0B

:: ============================================================
::  CANONICAL startup path for the champey platform.
::  Secrets live in ONE place: docker/.env (never in copies).
::  Infra (postgres/redis/minio/meilisearch) ALWAYS comes from
::  the Docker stack below - never start a second copy of it.
::
::  Port map (canonical):
::    Docker stack : frontend 3000 | admin 3001 | backend 4000
::    Host-dev infra (dev mode) : postgres 5432 | redis 6379
::                  meilisearch 7700 | minio 9000/9001
::    Monitoring : grafana 3002 | prometheus 9090 (+ host metrics feed 9701)
:: ============================================================

set "PNPM=C:\Users\theow\AppData\Roaming\npm\pnpm.cmd"
if not exist "%PNPM%" set "PNPM=pnpm"

if "%~1"=="" goto menu
if /i "%~1"=="stack"  ( call :stack  & goto :eof )
if /i "%~1"=="dev"    ( call :dev    & goto :eof )
if /i "%~1"=="sync"   ( call :sync   & goto :eof )
if /i "%~1"=="status" ( call :status & goto :eof )
if /i "%~1"=="check"  ( call :check  & goto :eof )
if /i "%~1"=="audit"  ( call :audit  & goto :eof )
if /i "%~1"=="backup" ( call :backup & goto :eof )
if /i "%~1"=="stop"   ( call :stop   & goto :eof )
echo Unknown command: %~1
echo Usage: start.bat [stack^|dev^|sync^|status^|check^|audit^|backup^|stop]
exit /b 1

:menu
if not "%~1"=="" (
    echo Interactive menu requires no arguments. Usage: start.bat [stack^|dev^|sync^|status^|stop]
    exit /b 1
)
cls
echo.
echo  ============================================
echo     champey - canonical launcher
echo  ============================================
echo.
echo     1 - Stack   (docker compose up -d; production-shape)
echo     2 - Dev     (stack infra + host dev servers, hot reload)
echo     3 - Sync    (propagate docker/.env into app env files)
echo     4 - Status  (containers, health, ports, env drift)
echo     5 - Check   (full health check + auto-repair)
echo     6 - Audit   (weekly dependency scan -> output\dependency-audit)
echo     7 - Backup  (postgres + meilisearch + minio -> output\backups)
echo     8 - Stop    (all champey services; Docker-safe)
echo     9 - Exit
echo.
set /p choice="  Enter number: "

if "%choice%"=="1" goto stack
if "%choice%"=="2" goto dev
if "%choice%"=="3" goto sync
if "%choice%"=="4" goto status
if "%choice%"=="5" goto check
if "%choice%"=="6" goto audit
if "%choice%"=="7" goto backup
if "%choice%"=="8" goto stop
if "%choice%"=="9" exit /b 0
goto menu
goto menu

:stack
echo.
echo  [1/4] Ensuring secrets exist...
if not exist "docker\.env" (
    echo  [FAIL] docker\.env missing. Copy docker\.env.example and fill it in.
    pause
    exit /b 1
)
echo  [2/4] Starting canonical Docker stack (+monitoring profile)...
docker compose --profile monitoring up -d
if errorlevel 1 (
    echo  [FAIL] docker compose failed. Is Docker Desktop running?
    pause
    exit /b 1
)
echo  [3/4] Starting stack-health metrics feed (127.0.0.1:9701 -> Prometheus)...
start "champey metrics feed :9701" /MIN cmd /c "node scripts\metrics-server.mjs"
timeout /t 2 >nul
echo  [4/4] Health check + auto-repair (known failure modes)...
node scripts\health-check.mjs --metrics-out output\health-metrics.prom
if errorlevel 1 (
    echo  [WARN] Some checks still failing - see lines above.
)
echo.
echo  Storefront : http://localhost:3000   ^(admin: 3001, backend: 4000, grafana: 3002^)
call :status_quiet
echo.
echo  Press any key to close this window (stack keeps running)...
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause >nul
goto :eof

:dev
echo.
echo  [1/3] Stack infra up ^(postgres/redis/meilisearch/minio^)...
docker compose up -d postgres redis meilisearch minio
echo  [2/3] Syncing secrets from docker/.env into app env files...
node scripts\sync-dev-env.mjs
echo  [3/3] Starting host dev servers ^(hot reload^)...
set "HOSTNAME=0.0.0.0"
start "champey backend :4000" /MIN cmd /c "%PNPM%" --filter backend dev
timeout /t 4 >nul
start "champey frontend :3010" /MIN cmd /c "%PNPM%" --filter frontend dev --port 3010
start "champey admin    :3001" /MIN cmd /c "%PNPM%" --filter admin dev --port 3001
echo.
echo  Dev servers launching. Infra: localhost:5432 / 6379 / 7700 / 9000.
echo  Press any key to close this window (servers keep running)...
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause >nul
goto :eof

:sync
echo.
node scripts\sync-dev-env.mjs
echo.
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause
goto :eof

:status
cls
echo.
call :status_quiet
echo.
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause
goto :eof

:status_quiet
echo  --- Containers -------------------------------------------------
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>nul
echo.
echo  --- Health / ports ----------------------------------------------
curl -s -m 5 -o nul -w "backend  :4000/api/health/ready -> HTTP %%{http_code}\n" http://localhost:4000/api/health/ready
curl -sL -m 5 -o nul -w "storefront :3000 -> HTTP %%{http_code}\n" http://localhost:3000/
curl -s -m 5 -o nul -w "admin    :3001 -> HTTP %%{http_code} (307 = Clerk redirect)\n" http://localhost:3001/
curl -s -m 5 -o nul -w "metrics feed :9701 -> HTTP %%{http_code}\n" http://127.0.0.1:9701/metrics
curl -s -m 5 -o nul -w "prometheus :9090 -> HTTP %%{http_code}\n" http://127.0.0.1:9090/-/healthy
curl -s -m 5 -o nul -w "grafana    :3002 -> HTTP %%{http_code}\n" http://127.0.0.1:3002/api/health
echo.
echo  --- Env drift vs docker/.env ------------------------------------
node scripts\sync-dev-env.mjs --check
goto :eof

:check
cls
echo.
node scripts\health-check.mjs
echo.
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause
goto :eof

:audit
echo.
echo  Weekly dependency scan (SECURITY-ROTATION.md section 1)...
node scripts\dependency-audit.mjs
if errorlevel 2 (
    echo  [FAIL] Scan could not run ^(pnpm unresolvable?^) - see above.
) else if errorlevel 1 (
    echo  [WARN] Advisories at/above threshold - see output\dependency-audit\ summary.txt
    echo         Safe patching: node scripts\security-patch.mjs --dry-run
)
echo.
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause
goto :eof

:backup
echo.
echo  Snapshotting postgres + meilisearch + minio to output\backups...
node scripts\backup.mjs
if errorlevel 1 (
    echo  [WARN] Backup incomplete - see manifest.txt in today's folder.
) else (
    echo  Backup complete.
)
echo.
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause
goto :eof

:stop
echo.
echo  [1/2] Stopping champey containers first ^(releases their port proxies cleanly^)...
docker compose stop
echo  [2/2] Stopping stray host dev servers on 3000/3001/3002/4000 ^(Docker-safe guard^)...
powershell -NoProfile -Command "$ports = 3000,3001,3002,4000; foreach ($port in $ports) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($proc -and $proc.ProcessName -notmatch 'docker|wslrelay|vpnkit|com\.docker') { Write-Host ('  Killing ' + $proc.ProcessName + ' (PID ' + $proc.Id + ') on port ' + $port); Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } else { Write-Host ('  Skipping ' + $proc.ProcessName + ' on port ' + $port + ' (Docker-managed)') } } }"
echo  Done. Infra and app containers stopped. Volumes untouched.
echo.
if not "%CHAMPEY_NONINTERACTIVE%"=="1" pause
goto :eof
