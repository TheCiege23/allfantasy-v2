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

function To-SessionPoolerUrl([string]$url) {
  if (-not $url) { return $null }
  $next = $url
  if ($next -match "pooler\.supabase\.com:6543") {
    $next = ($next -replace ":6543", ":5432")
  }
  if ($next -match "db\.[A-Za-z0-9]+\.supabase\.co:5432") {
    $next = ($next -replace "db\.[A-Za-z0-9]+\.supabase\.co:5432", "aws-0-us-west-2.pooler.supabase.com:5432")
  }
  return $next
}

if ($dbUrl) {
  $sessionUrl = To-SessionPoolerUrl $dbUrl
  $env:DATABASE_URL = $sessionUrl
  $env:DIRECT_URL = $sessionUrl
  $env:PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"
  Write-Host "Using Supabase session pooler (:5432) for migration deploy." -ForegroundColor Yellow
}

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$supplementalSql = Join-Path $root "scripts/sql/platform-backend-indexes.sql"
if (Test-Path $supplementalSql) {
  Write-Host "Applying supplemental backend indexes..." -ForegroundColor Cyan
  npx prisma db execute --file "$supplementalSql" --schema prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Migrations applied." -ForegroundColor Green
