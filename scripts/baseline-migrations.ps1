# Baseline existing database to current Prisma migration history, then deploy.
# Run from repo root: .\scripts\baseline-migrations.ps1
$ErrorActionPreference = "Stop"
# Keep Prisma CLI non-zero exits non-terminating so we can handle P3008 idempotently.
if ($PSVersionTable.PSVersion.Major -ge 7 -and (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
  $PSNativeCommandUseErrorActionPreference = $false
}
$root = if ($PSScriptRoot) { Join-Path $PSScriptRoot ".." } else { ".." }
Set-Location $root

function Get-DatabaseUrl {
  if ($env:DATABASE_URL) {
    return $env:DATABASE_URL
  }

  $envPath = Join-Path $root ".env"
  if (-not (Test-Path $envPath)) {
    return $null
  }

  $dbLine = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
  if (-not $dbLine) {
    return $null
  }

  return $dbLine.Split('=', 2)[1].Trim().Trim('"')
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

$dbUrl = Get-DatabaseUrl
if (-not $dbUrl) {
  Write-Error "DATABASE_URL is not set in env or .env."
}

# Prisma migrate can fail against Supabase transaction pooler (:6543) and can
# fail with P1001 when DIRECT_URL points to blocked direct hosts. For
# baseline/deploy, force both DATABASE_URL and DIRECT_URL to session pooler.
$sessionUrl = To-SessionPoolerUrl $dbUrl
$env:DATABASE_URL = $sessionUrl
$env:DIRECT_URL = $sessionUrl
$env:PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"
Write-Host "Using Supabase session pooler (:5432) for baseline/deploy." -ForegroundColor Yellow

$migrationsDir = Join-Path $root "prisma/migrations"
if (-not (Test-Path $migrationsDir)) {
  Write-Error "Migrations directory not found: $migrationsDir"
}

$migrations = Get-ChildItem $migrationsDir -Directory | Sort-Object Name
if (-not $migrations -or $migrations.Count -eq 0) {
  Write-Error "No migrations found in prisma/migrations."
}

Write-Host ("Baselining {0} migrations..." -f $migrations.Count) -ForegroundColor Cyan

foreach ($migration in $migrations) {
  $name = $migration.Name
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $result = cmd /c "npx prisma migrate resolve --applied $name" 2>&1
  $ErrorActionPreference = $previousErrorActionPreference
  $exitCode = $LASTEXITCODE

  if ($exitCode -eq 0) {
    Write-Host ("Applied marker set: {0}" -f $name) -ForegroundColor DarkGreen
    continue
  }

  $text = $result | Out-String
  if ($text -match "P3008" -or $text -match "already recorded as applied") {
    Write-Host ("Already applied: {0}" -f $name) -ForegroundColor DarkYellow
    continue
  }

  Write-Host $text
  exit $exitCode
}

Write-Host "Running prisma migrate deploy..." -ForegroundColor Cyan
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$deployResult = cmd /c "npx prisma migrate deploy" 2>&1
$ErrorActionPreference = $previousErrorActionPreference
$deployResult | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$supplementalSql = Join-Path $root "scripts/sql/platform-backend-indexes.sql"
if (Test-Path $supplementalSql) {
  Write-Host "Applying supplemental backend indexes..." -ForegroundColor Cyan
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $supplementalResult = cmd /c "npx prisma db execute --file \"$supplementalSql\" --schema prisma/schema.prisma" 2>&1
  $ErrorActionPreference = $previousErrorActionPreference
  $supplementalResult | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Baseline and deploy complete." -ForegroundColor Green
