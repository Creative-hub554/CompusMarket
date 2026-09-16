# Start Next.js dev server from Freebuff worktree frontend and check preview

$ErrorActionPreference = 'SilentlyContinue'

$Node = 'C:\Program Files\nodejs\node.exe'
$Worktree = 'C:\workspace\www.champey.com\.freebuff\worktrees\1de27e1f-b456-4105-99e4-e87b9ca5e42b'
$FrontendDir = Join-Path $Worktree 'apps\frontend'
$LogFile = Join-Path $Worktree 'preview-fe.log'
$ErrFile = $LogFile + '.err'

Write-Host 'Starting Next.js dev from worktree frontend...' -ForegroundColor Cyan
$proc = Start-Process -FilePath $Node `
  -ArgumentList 'node_modules\next\dist\bin\next', 'dev', '-p', '3000' `
  -WorkingDirectory $FrontendDir `
  -RedirectStandardOutput $LogFile `
  -RedirectStandardError $ErrFile `
  -WindowStyle Hidden -PassThru

Write-Host "Next.js PID: $($proc.Id)"

# Wait for server to come up
$found = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep 1
  try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:3000/en' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
      $found = $true
      Write-Host "Frontend UP after $($i+1)s - HTTP 200" -ForegroundColor Green
      break
    }
  } catch {}
  Write-Host "Waiting... $($i+1)s" -NoNewline
}

Write-Host ''

if (-not $found) {
  Write-Host 'Frontend did NOT come up' -ForegroundColor Red
  if (Test-Path $ErrFile) {
    Write-Host 'stderr:' -ForegroundColor Yellow
    Get-Content $ErrFile -Tail 20 | ForEach-Object { Write-Host "  $_" }
  }
  if (Test-Path $LogFile) {
    Write-Host 'stdout tail:' -ForegroundColor Yellow
    Get-Content $LogFile -Tail 20 | ForEach-Object { Write-Host "  $_" }
  }
  exit 1
}

# Check the preview
Write-Host '=== Preview check ===' -ForegroundColor Cyan
try {
  $html = Invoke-WebRequest -Uri 'http://localhost:3000/en' -UseBasicParsing -TimeoutSec 5
  Write-Host "HTTP status: $($html.StatusCode)"
  
  $hasPageTitle = $html.Content -match 'page-title'
  Write-Host "page-title class in HTML: $(if ($hasPageTitle) { 'YES' } else { 'NO' })"
  
  # Get CSS
  $cssResp = Invoke-WebRequest -Uri 'http://localhost:3000/_next/static/css/app/%5Blocale%5D/layout.css' -UseBasicParsing -TimeoutSec 5
  $css = $cssResp.Content
  
  $hasCssPageTitle = $css -match 'page-title'
  Write-Host "page-title in CSS: $(if ($hasCssPageTitle) { 'YES' } else { 'NO' })"
  
  if ($hasCssPageTitle) {
    $match = [regex]::Match($css, '\.page-title[^{]*\{[^}]*\}')
    Write-Host "page-title CSS block:"
    Write-Host "  $match"
    
    # Check for font-serif-title
    $hasSerifVar = $css -match 'font-serif-title'
    Write-Host "font-serif-title variable: $(if ($hasSerifVar) { 'YES' } else { 'NO' })"
    
    # Check for --font-khmer
    $hasKhmer = $css -match 'font-khmer'
    Write-Host "font-khmer reference: $(if ($hasKhmer) { 'YES' } else { 'NO' })"
    
    # Check for Fraunces
    $hasFraunces = $css -match 'Fraunces'
    Write-Host "Fraunces font: $(if ($hasFraunces) { 'YES' } else { 'NO' })"
  }
  
  # What do the h1 elements look like?
  $h1s = [regex]::Matches($html.Content, '<h1[^>]*>.*?</h1>')
  Write-Host "h1 elements found: $($h1s.Count)"
  for ($i = 0; $i -lt [Math]::Min(3, $h1s.Count); $i++) {
    Write-Host "  h1[$i]: $($h1s[$i].Value.Substring(0, [Math]::Min(100, $h1s[$i].Value.Length)))"
  }
} catch {
  Write-Host "Error checking preview: $_" -ForegroundColor Red
}

Write-Host ''
Write-Host 'Preview URL: http://localhost:3000' -ForegroundColor Green
Write-Host 'Open it in your browser to see the new design' -ForegroundColor Green
