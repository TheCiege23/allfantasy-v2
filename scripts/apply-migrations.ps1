# Apply all pending Prisma migrations (non-interactive).
# Run from repo root: .\scripts\apply-migrations.ps1
# Use this to auto-apply migrations in PowerShell (e.g. after pull or adding new migrations).
$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { Join-Path $PSScriptRoot ".." } else { ".." }
Set-Location $root

Write-Host "Applying Prisma migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Migrations applied." -ForegroundColor Green
