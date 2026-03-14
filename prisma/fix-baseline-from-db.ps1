# Fix migration drift by baselining from the actual database.
# Run from repo root: .\prisma\fix-baseline-from-db.ps1
# Then run: npx prisma migrate dev --name add_schedule_stats_tables

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "1. Backing up schema.prisma..."
Copy-Item prisma\schema.prisma prisma\schema.prisma.bak -Force

Write-Host "2. Pulling schema from database (introspect)..."
npx prisma db pull 2>&1 | Out-Null

Write-Host "3. Saving introspected schema to schema_from_db.prisma..."
Copy-Item prisma\schema.prisma prisma\schema_from_db.prisma -Force

Write-Host "4. Restoring your schema.prisma..."
Copy-Item prisma\schema.prisma.bak prisma\schema.prisma -Force

Write-Host "5. Generating baseline SQL from introspected schema (stdout only)..."
$diffScript = @"
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sql = execSync(
  'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema_from_db.prisma --script',
  { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, cwd: path.join(__dirname, '..') }
);
const outPath = path.join(__dirname, 'migrations', '0_baseline', 'migration.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Wrote baseline:', outPath);
"@
Set-Content -Path prisma\gen-baseline.js -Value $diffScript -Encoding UTF8
node prisma\gen-baseline.js
Remove-Item prisma\gen-baseline.js -Force

Write-Host "6. Removing placeholder migration 20250220..."
if (Test-Path prisma\migrations\20250220_fix_sports_cache_pk) {
  Remove-Item prisma\migrations\20250220_fix_sports_cache_pk -Recurse -Force
}

Write-Host "7. Clearing migration history for baseline in DB..."
$sql = "DELETE FROM _prisma_migrations WHERE migration_name IN ('0_baseline', '20250220_fix_sports_cache_pk');"
$sql | npx prisma db execute --stdin 2>&1 | Out-Null

Write-Host "8. Marking 0_baseline as applied (no data change)..."
npx prisma migrate resolve --applied 0_baseline

Write-Host "Done. Now run: npx prisma migrate dev --name add_schedule_stats_tables"
Write-Host "If you still see drift, the script may need the schema path adjusted."
