# Install and/or run Meilisearch locally for the preview/dev stack.
#
# Usage:
#   .\start-meili.ps1 -Install              # download meilisearch.exe to %LOCALAPPDATA%\meilisearch
#   .\start-meili.ps1                       # start Meili if not running (uses apps\backend\.env MEILI_API_KEY)
#   .\start-meili.ps1 -Reindex              # push all Prisma products into the Meili 'products' index
#
# The preview stack (start-preview.ps1) resolves the binary from
# %LOCALAPPDATA%\meilisearch\meilisearch.exe (or MEILI_EXE / PATH), so
# `.\start-meili.ps1 -Install` is the one-time setup for market search.
#
# Reindex requires the DB (start-preview.ps1 or embedded PG running) and
# packages/database/node_modules (pnpm install).

[CmdletBinding()]
param(
  [switch]$Install,
  [switch]$Reindex,
  [string]$Root = ""
)

$ErrorActionPreference = 'Stop'

if (-not $Root) {
  if ($PSScriptRoot) { $Root = $PSScriptRoot } else { $Root = (Get-Location).Path }
}

# --- Read apps\backend\.env (single source of truth for the master key) ---------
$BackendEnv = Join-Path $Root 'apps\backend\.env'
if (-not (Test-Path $BackendEnv)) {
  Write-Host "apps\backend\.env not found — cannot resolve MEILI_API_KEY." -ForegroundColor Red
  exit 1
}
$MeiliKey = $null
foreach ($line in (Get-Content $BackendEnv)) {
  if ($line -match '^\s*MEILI_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$') { $MeiliKey = $Matches[1]; break }
}
if (-not $MeiliKey) {
  Write-Host "MEILI_API_KEY not found in apps\backend\.env." -ForegroundColor Red
  exit 1
}

# --- -Install: download the binary ----------------------------------------------
$MeiliDir = Join-Path $env:LOCALAPPDATA 'meilisearch'
$MeiliExe = Join-Path $MeiliDir 'meilisearch.exe'

if ($Install) {
  if (Test-Path $MeiliExe) {
    Write-Host "meilisearch.exe already installed at $MeiliExe"
    Write-Host "Delete it first if you want to re-download."
  } else {
    # Latest stable Windows binary via GitHub releases.
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/meilisearch/meilisearch/releases/latest' -UseBasicParsing
    $asset = $release.assets | Where-Object { $_.name -match 'windows-x86_64\.zip$' } | Select-Object -First 1
    if (-not $asset) {
      Write-Host "Could not find a windows-x86_64 asset in the latest Meilisearch release." -ForegroundColor Red
      exit 1
    }
    $url = $asset.browser_download_url
    Write-Host "Downloading $($asset.name) ..."
    $zip = Join-Path $env:TEMP 'meilisearch.zip'
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    New-Item -ItemType Directory -Path $MeiliDir -Force | Out-Null
    Expand-Archive -Path $zip -DestinationPath $MeiliDir -Force
    Remove-Item $zip -Force
    Write-Host "Installed: $MeiliExe" -ForegroundColor Green
  }
}

# --- -Reindex: push all Prisma products into the 'products' index -----------------
if ($Reindex) {
  $Node = "C:\Program Files\nodejs\node.exe"
  if (-not (Test-Path $Node -PathType Leaf)) {
    $resolved = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if ($resolved) { $Node = $resolved }
  }
  if (-not (Test-Path $Node -PathType Leaf)) {
    Write-Host "node.exe not found." -ForegroundColor Red
    exit 1
  }

  # The inline script mirrors the backend SearchService document shape
  # (search.service.ts) and waits for the Meilisearch task to complete.
  $script = @'
import { PrismaClient } from '@theo/database';
import { Meilisearch } from 'meilisearch';
const p = new PrismaClient();
const m = new Meilisearch({ host: 'http://localhost:7700', apiKey: process.env.MEILI_KEY });
const INDEX = 'products';
try {
  await m.index(INDEX).updateFilterableAttributes(['categoryId', 'condition', 'status', 'price', 'stock']);
  await m.index(INDEX).updateSearchableAttributes(['name', 'description', 'categoryName']);
  await m.index(INDEX).updateSortableAttributes(['createdAt', 'price']);
  const products = await p.product.findMany({ include: { category: true } });
  const docs = products.map(x => ({
    id: x.id, name: x.name, description: x.description, price: Number(x.price),
    condition: x.condition, status: x.status, stock: x.stock,
    categoryId: x.categoryId, categoryName: x.category.name,
    images: x.images, createdAt: x.createdAt.getTime(),
  }));
  let t = await m.index(INDEX).addDocuments(docs);
  t = await m.tasks.waitForTask(t.taskUid);
  if (t.status === 'failed') throw new Error(JSON.stringify(t.error));
  console.log(`Indexed ${docs.length} products into Meilisearch (status: ${t.status}).`);
} catch (e) {
  console.error(String(e && e.message || e));
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
'@
  $env:DATABASE_URL = $null
  # Load DATABASE_URL from apps\backend\.env if present in the process env.
  foreach ($line in (Get-Content $BackendEnv)) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?\s*$') { $env:DATABASE_URL = $Matches[1]; break }
  }
  if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL not found in apps\backend\.env." -ForegroundColor Red
    exit 1
  }
  $env:MEILI_KEY = $MeiliKey

  # meilisearch + @theo/database resolve from apps\backend\node_modules (pnpm
  # layout), so run the .mjs from there.
  $WorkDir = Join-Path $Root 'apps\backend'
  Push-Location $WorkDir
  try {
    $tmpMjs = Join-Path $WorkDir '.reindex-tmp.mjs'
    Set-Content -Path $tmpMjs -Value $script -Encoding UTF8
    & $Node $tmpMjs
    $exit = $LASTEXITCODE
    Remove-Item $tmpMjs -Force -ErrorAction SilentlyContinue
    if ($exit -ne 0) { exit $exit }
  } finally {
    Pop-Location
  }
  exit 0
}

# --- Default: start Meili if not already listening on :7700 -----------------------
$listener = Get-NetTCPConnection -LocalPort 7700 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $name = (Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue).ProcessName
  Write-Host "Meilisearch already running on :7700 (PID $($listener.OwningProcess), $name). Nothing to do."
  exit 0
}

foreach ($candidate in @($env:MEILI_EXE, $MeiliExe, 'meilisearch.exe')) {
  if ($candidate -and (Get-Command $candidate -ErrorAction SilentlyContinue)) {
    $exe = (Get-Command $candidate).Source
    break
  }
}
if (-not $exe) {
  Write-Host "meilisearch.exe not found. Run: .\start-meili.ps1 -Install" -ForegroundColor Red
  exit 1
}

$DataDir = Join-Path $Root '.freebuff\meili-data'
New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

Write-Host "Starting Meilisearch (:7700, data in .freebuff\meili-data) ..."
$proc = Start-Process -FilePath $exe `
  -ArgumentList @('--master-key', $MeiliKey, '--db-path', "$DataDir\data.ms", '--no-analytics') `
  -WorkingDirectory $Root `
  -RedirectStandardOutput (Join-Path $Root '.freebuff\meili-stdout.log') `
  -RedirectStandardError (Join-Path $Root '.freebuff\meili-stderr.log') `
  -WindowStyle Hidden -PassThru

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-WebRequest -Uri 'http://localhost:7700/health' -UseBasicParsing -TimeoutSec 3
    if ($h.Content -match 'available') {
      Write-Host "Meilisearch ready after $($i + 1)s (PID $($proc.Id))." -ForegroundColor Green
      Write-Host "To reindex the market products: .\start-meili.ps1 -Reindex"
      exit 0
    }
  } catch {}
  Write-Host "  waiting ($($i + 1)s)" -NoNewline
}
Write-Host ""
Write-Host "Meilisearch did not become ready — tail of .freebuff\meili-stderr.log:" -ForegroundColor Red
Get-Content (Join-Path $Root '.freebuff\meili-stderr.log') -Tail 20
exit 1
