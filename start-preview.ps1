# Start the Freebuff preview stack: Postgres -> Backend -> Frontend
# Usage: .\start-preview.ps1 [-Root <path>] [-WorktreeId <uuid>]
#   -Root       repo root to run from (default: this script's directory)
#   -WorktreeId run inside <Root>\.freebuff\worktrees\<id> instead of <Root>

[CmdletBinding()]
param(
  [string]$Root = "",
  [string]$WorktreeId = ""
)

$ErrorActionPreference = 'Stop'

# --- Resolve working root -----------------------------------------------------
# $PSScriptRoot is empty in some -File invocation contexts; fall back to cwd.
if (-not $Root) {
  if ($PSScriptRoot) { $Root = $PSScriptRoot } else { $Root = (Get-Location).Path }
}
if ($WorktreeId) {
  if ($WorktreeId -match '[^\w-]') {
    Write-Host "Invalid -WorktreeId '$WorktreeId' (only [A-Za-z0-9_-] allowed)." -ForegroundColor Red
    exit 1
  }
  $Root = Join-Path $Root ".freebuff\worktrees\$WorktreeId"
}

if (-not (Test-Path $Root -PathType Container)) {
  Write-Host "Root not found: $Root" -ForegroundColor Red
  exit 1
}

# --- Locate node.exe ----------------------------------------------------------
$Node = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $Node -PathType Leaf)) {
  $resolved = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if ($resolved) { $Node = $resolved }
}
if (-not (Test-Path $Node -PathType Leaf)) {
  Write-Host "node.exe not found. Install Node.js or add 'node' to PATH." -ForegroundColor Red
  exit 1
}

# --- Preflight: required files ------------------------------------------------
$Requirements = @(
  @{ Path = Join-Path $Root '.freebuff\pg\pg-launcher.cjs';                  What = 'pg-launcher.cjs' }
  @{ Path = Join-Path $Root 'apps\backend\dist\main.js';                     What = 'backend build (apps\backend\dist\main.js)' }
  @{ Path = Join-Path $Root 'apps\frontend\node_modules\next\dist\bin\next'; What = 'frontend next binary (run pnpm install)' }
)
foreach ($req in $Requirements) {
  if (-not (Test-Path $req.Path -PathType Leaf)) {
    Write-Host "Missing $($req.What): $($req.Path)" -ForegroundColor Red
    exit 1
  }
}

# --- Preflight: required ports must be free -----------------------------------
foreach ($port in 5432, 4000, 3000) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    $name = (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Port $port already in use by PID $($conn.OwningProcess) ($name). Stop it first." -ForegroundColor Red
    exit 1
  }
}

# --- Helpers --------------------------------------------------------------------
$Started = @{}

function Stop-Started {
  foreach ($proc in $Started.Values) {
    if ($proc -and -not $proc.HasExited) {
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped $($proc.Id)" -ForegroundColor DarkGray
    }
  }
}

function Show-LogTail {
  param([string]$Label, [string[]]$Paths)
  foreach ($p in $Paths) {
    if (Test-Path $p) {
      Write-Host "$Label tail ($(Split-Path $p -Leaf)):" -ForegroundColor Yellow
      Get-Content $p -Tail 20 | ForEach-Object { Write-Host "  $_" }
    }
  }
}

function Start-Stage {
  param([string]$Name, [string]$WorkDir, [string[]]$NodeArgs, [string]$OutLog, [string]$ErrLog)
  $proc = Start-Process -FilePath $Node `
    -ArgumentList $NodeArgs `
    -WorkingDirectory $WorkDir `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden -PassThru
  $Started[$Name] = $proc
  Write-Host "$Name PID: $($proc.Id)"
}

function Wait-Ready {
  param([string]$Name, [int]$TimeoutSec, [scriptblock]$Probe)
  for ($i = 0; $i -lt $TimeoutSec; $i++) {
    Start-Sleep 1
    if (& $Probe) {
      Write-Host "$Name ready after $($i + 1)s" -ForegroundColor Green
      return $true
    }
    Write-Host "  waiting for $Name ($($i + 1)s)" -NoNewline
  }
  Write-Host ""
  return $false
}

function Fail-Stage {
  param([string]$Name, [string[]]$LogPaths)
  Write-Host "`n$Name did NOT become ready." -ForegroundColor Red
  Show-LogTail $Name $LogPaths
  Write-Host "`nStopping started processes..." -ForegroundColor Yellow
  Stop-Started
  exit 1
}

# --- 1. Postgres ---------------------------------------------------------------
Write-Host "=== 1. Starting embedded Postgres (:5432) ===" -ForegroundColor Cyan
Start-Stage -Name 'PG' -WorkDir "$Root\.freebuff\pg" `
  -NodeArgs @("`"$Root\.freebuff\pg\pg-launcher.cjs`"") `
  -OutLog "$Root\.freebuff\pg-stdout.log" `
  -ErrLog "$Root\.freebuff\pg-stderr.log"

$pgReady = Wait-Ready -Name 'PG' -TimeoutSec 30 -Probe {
  [bool](Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)
}
if (-not $pgReady) {
  Fail-Stage -Name 'PG' -LogPaths @("$Root\.freebuff\pg-stdout.log", "$Root\.freebuff\pg-stderr.log")
}

# --- 2. Backend ----------------------------------------------------------------
Write-Host "`n=== 2. Starting Backend (:4000) ===" -ForegroundColor Cyan
Start-Stage -Name 'Backend' -WorkDir "$Root\apps\backend" `
  -NodeArgs @('--enable-source-maps', 'dist\main.js') `
  -OutLog "$Root\.freebuff\backend-stdout.log" `
  -ErrLog "$Root\.freebuff\backend-stderr.log"

$beReady = Wait-Ready -Name 'Backend' -TimeoutSec 30 -Probe {
  try {
    (Invoke-WebRequest -Uri 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 2).Content -match 'ok'
  } catch { $false }
}
if (-not $beReady) {
  Fail-Stage -Name 'Backend' -LogPaths @("$Root\.freebuff\backend-stdout.log", "$Root\.freebuff\backend-stderr.log")
}

# --- 3. Frontend -----------------------------------------------------------------
Write-Host "`n=== 3. Starting Frontend (:3000) ===" -ForegroundColor Cyan
Start-Stage -Name 'Frontend' -WorkDir "$Root\apps\frontend" `
  -NodeArgs @('node_modules\next\dist\bin\next', 'dev', '-p', '3000') `
  -OutLog "$Root\.freebuff\frontend-stdout.log" `
  -ErrLog "$Root\.freebuff\frontend-stderr.log"

$feReady = Wait-Ready -Name 'Frontend' -TimeoutSec 45 -Probe {
  try {
    (Invoke-WebRequest -Uri 'http://localhost:3000/en' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
  } catch { $false }
}
if (-not $feReady) {
  Fail-Stage -Name 'Frontend' -LogPaths @("$Root\.freebuff\frontend-stdout.log", "$Root\.freebuff\frontend-stderr.log")
}

# --- Summary ---------------------------------------------------------------------
Write-Host "`n=== Preview URL ===" -ForegroundColor Cyan
Write-Host "http://localhost:3000 (redirects to /en; Khmer at /km)" -ForegroundColor Green
Write-Host ""
Write-Host "Running processes:" -ForegroundColor Gray
foreach ($entry in $Started.GetEnumerator()) {
  Write-Host ("  {0,-9} PID {1}" -f $entry.Key, $entry.Value.Id)
}
