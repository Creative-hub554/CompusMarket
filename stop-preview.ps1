# Stop the Freebuff preview stack started by start-preview.ps1.
#
# Only kills PIDs recorded in <Root>\.freebuff\pids\*.pid, and only after
# verifying the process still matches the recorded executable path and start
# time — protection against PID reuse (an unrelated process that happened to
# get the same PID after a crash is never killed).
# Usage: .\stop-preview.ps1 [-Root <path>] [-WorktreeId <uuid>]

[CmdletBinding()]
param(
  [string]$Root = "",
  [string]$WorktreeId = ""
)

$ErrorActionPreference = 'Stop'

# --- Resolve working root (same rules as start-preview.ps1) -------------------
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

function Get-DescendantIds([int]$Id) {
  $ids = @()
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$Id" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    $ids += $child.ProcessId
    $ids += Get-DescendantIds $child.ProcessId
  }
  return $ids
}

$PidDir = Join-Path $Root '.freebuff\pids'
$PidFiles = @(Get-ChildItem -Path $PidDir -Filter '*.pid' -File -ErrorAction SilentlyContinue)

if ($PidFiles.Count -eq 0) {
  Write-Host "No PID files found in $PidDir - nothing to stop."
  Write-Host "(Was the stack started with start-preview.ps1?)"
  exit 0
}

$stopped = 0
$skipped = 0

foreach ($file in $PidFiles) {
  $name = [IO.Path]::GetFileNameWithoutExtension($file.Name).ToUpper()

  # --- Parse the PID file -------------------------------------------------------
  $meta = @{}
  foreach ($line in (Get-Content $file.FullName -ErrorAction SilentlyContinue)) {
    if ($line -match '^([^=]+)=(.*)$') { $meta[$Matches[1]] = $Matches[2] }
  }

  $procId = 0
  if (-not $meta.ContainsKey('PID') -or -not [int]::TryParse($meta['PID'], [ref]$procId) -or $procId -le 0) {
    Write-Host "$name : corrupt PID file (no valid PID) - removing it" -ForegroundColor Yellow
    Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
    $skipped++
    continue
  }

  # --- Is the process still alive? ----------------------------------------------
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if (-not $proc) {
    Write-Host "$name : PID $procId no longer running (stale) - removing PID file" -ForegroundColor DarkGray
    Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
    $skipped++
    continue
  }

  # --- Stale-PID check: same executable, same start time? ------------------------
  $exeOk = $true
  if ($meta.ContainsKey('EXE') -and $meta['EXE']) {
    $currentPath = try { $proc.Path } catch { $null }
    if ($currentPath) {
      $exeOk = ($currentPath -ieq $meta['EXE'])
    } else {
      # Path unreadable (e.g. access denied): compare process name instead.
      $exeOk = ([IO.Path]::GetFileNameWithoutExtension($meta['EXE']) -ieq $proc.ProcessName)
    }
  }

  $timeOk = $true
  if ($meta.ContainsKey('CREATED') -and $meta['CREATED']) {
    $recordedTime = [DateTime]::MinValue
    if ([DateTime]::TryParseExact($meta['CREATED'], 'o', $null,
        [System.Globalization.DateTimeStyles]::RoundtripKind, [ref]$recordedTime)) {
      $timeOk = ([Math]::Abs(($proc.StartTime.ToUniversalTime() - $recordedTime).TotalSeconds) -le 2)
    }
  }

  if (-not ($exeOk -and $timeOk)) {
    Write-Host "$name : PID $procId was reused by '$($proc.ProcessName)' (started $($proc.StartTime)) - NOT killing it" -ForegroundColor Yellow
    Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
    $skipped++
    continue
  }

  # --- Kill descendants first (e.g. Next dev workers), then the process ----------
  foreach ($descId in (Get-DescendantIds $procId)) {
    Stop-Process -Id $descId -Force -ErrorAction SilentlyContinue
  }
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  Write-Host "$name : stopped PID $procId ($($proc.ProcessName))" -ForegroundColor Green
  Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
  $stopped++
}

Write-Host ""
Write-Host "Done. Stopped: $stopped, stale/skipped: $skipped."
