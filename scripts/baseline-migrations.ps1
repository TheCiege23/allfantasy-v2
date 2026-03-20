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

$dbUrl = Get-DatabaseUrl
if (-not $dbUrl) {
  Write-Error "DATABASE_URL is not set in env or .env."
}

# Prisma migrate can fail against Supabase transaction pooler (:6543) with P1017.
# For baseline/deploy only, switch to Supabase session pooler (:5432) when needed.
if ($dbUrl -match "pooler\.supabase\.com:6543") {
  $env:DATABASE_URL = ($dbUrl -replace ":6543", ":5432")
  $env:PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"
  Write-Host "Using Supabase session pooler (:5432) for baseline/deploy." -ForegroundColor Yellow
} else {
  $env:DATABASE_URL = $dbUrl
}

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

Write-Host "Baseline and deploy complete." -ForegroundColor Green
