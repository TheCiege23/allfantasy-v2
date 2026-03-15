# Run reputation migration. If migrate dev times out (P1002), apply SQL in Neon then run the resolve step.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Running Prisma migration..." -ForegroundColor Cyan
try {
    npx prisma migrate dev
    Write-Host "Migration completed." -ForegroundColor Green
    exit 0
} catch {
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Migration failed (often P1002 timeout). Options:" -ForegroundColor Yellow
        Write-Host "1. Close other apps using the DB, wait 30s, then run this script again."
        Write-Host "2. Or apply manually: open Neon SQL Editor, run the SQL in:"
        Write-Host "   prisma\migrations\20260315002659_add_reputation_system\migration.sql"
        Write-Host "   Then in PowerShell run:"
        Write-Host "   npx prisma migrate resolve --applied 20260315002659_add_reputation_system" -ForegroundColor White
        Write-Host ""
        exit $LASTEXITCODE
    }
    throw
}
