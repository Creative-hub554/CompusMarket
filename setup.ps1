$env:Path = "C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm;$env:Path"

Write-Host "Installing dependencies for Khmeronlineshopbytheo..." -ForegroundColor Green
pnpm install

Write-Host "Generating Prisma client..." -ForegroundColor Green
pnpm --filter @theo/database exec prisma generate

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start development:" -ForegroundColor Cyan
Write-Host "  pnpm --filter frontend dev      # Frontend (http://localhost:3000)"
Write-Host "  pnpm --filter admin dev         # Admin (http://localhost:3001)"
Write-Host "  pnpm --filter backend dev       # Backend (http://localhost:4000)"
Write-Host ""
Write-Host "To start all services:" -ForegroundColor Cyan
Write-Host "  pnpm dev                        # Uses Turbo to run all"
