# Prisma on Windows: EPERM when renaming query_engine-*.dll.node means another process
# (usually `next dev`) holds the file. Run this from repo root *after* stopping the dev server.
# Optional: `Get-Process node` — only use -Force if you are sure no other important Node work is running.
#
#   pwsh -File scripts/prisma-generate-win.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$nodes = Get-Process node -ErrorAction SilentlyContinue
if ($nodes) {
  Write-Host "Node processes (stop dev server with Ctrl+C first, then re-run; use Task Manager to end stray node.exe if needed):"
  $nodes | Format-Table Id, ProcessName, Path -AutoSize
}

& npx prisma generate
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
Write-Host "prisma generate OK"
