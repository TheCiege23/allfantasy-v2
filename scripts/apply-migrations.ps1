# Apply all pending Prisma migrations (non-interactive).
# Run from repo root: .\scripts\apply-migrations.ps1
# Use this to auto-apply migrations in PowerShell (e.g. after pull or adding new migrations).
$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { Join-Path $PSScriptRoot ".." } else { ".." }
Set-Location $root

Write-Host "Applying Prisma migrations..." -ForegroundColor Cyan
# Prisma migrate can fail against Supabase transaction pooler (:6543) with P1017.
# For deploy only, switch to Supabase session pooler (:5432) when needed.
$envPath = Join-Path $root ".env"
$dbUrl = $null
if (Test-Path $envPath) {
  $dbLine = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
  if ($dbLine) {
    $dbUrl = $dbLine.Split('=', 2)[1].Trim().Trim('"')
  }
}

if ($dbUrl -and $dbUrl -match "pooler\.supabase\.com:6543") {
  $env:DATABASE_URL = ($dbUrl -replace ":6543", ":5432")
  $env:PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"
  Write-Host "Using Supabase session pooler (:5432) for migration deploy." -ForegroundColor Yellow
}

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Migrations applied." -ForegroundColor Green
