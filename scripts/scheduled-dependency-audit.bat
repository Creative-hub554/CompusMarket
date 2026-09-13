@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  Scheduled weekly dependency audit (SECURITY-ROTATION.md s1).
REM  Called by Task Scheduler ("champey-dependency-audit", Mondays).
REM  Also usable manually. Logs to output\dependency-audit-YYYY-MM-DD.log
REM  and writes output\dependency-audit-last-exit.txt (0 = clean).
REM
REM  Runs scripts\dependency-audit.mjs (pnpm audit + outdated, reports in
REM  output\dependency-audit\<date>\). No docker needed. No secrets involved.
REM ============================================================
cd /d C:\Workspace\www.champey.com

REM Task Scheduler environments lack user PATH additions (npm is needed
REM for the npm-exec pnpm fallback in scripts\lib\pnpm.mjs).
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm"

set "LOGDIR=C:\Workspace\www.champey.com\output"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%d"
set "LOG=%LOGDIR%\dependency-audit-%TODAY%.log"

echo.>> "%LOG%"
echo ===== scheduled dependency audit %DATE% %TIME% =====>> "%LOG%"

set "CHAMPEY_NONINTERACTIVE=1"
node scripts\dependency-audit.mjs --fail-on high >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

REM (leading-redirect form: avoids "echo 0>" being parsed as handle redirect)
>"%LOGDIR%\dependency-audit-last-exit.txt" echo exit_code=%RC%
echo ===== done, exit_code=%RC% =====>> "%LOG%"
exit /b %RC%
