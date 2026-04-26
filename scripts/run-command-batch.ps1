[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$File,

  [int]$Retries = 0,

  [switch]$ContinueOnError
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CommandExecutable {
  param([string]$CommandText)

  $match = [regex]::Match($CommandText, '^\s*(?:&\s*)?(?:"([^"]+)"|''([^'']+)''|([^\s]+))')
  if (-not $match.Success) {
    return $null
  }

  if (-not [string]::IsNullOrWhiteSpace($match.Groups[1].Value)) {
    return $match.Groups[1].Value
  }

  if (-not [string]::IsNullOrWhiteSpace($match.Groups[2].Value)) {
    return $match.Groups[2].Value
  }

  return $match.Groups[3].Value
}

function Get-PsqlFallbackPath {
  $candidates = @(
    'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Import-DotEnv {
  param([string]$Path = '.env')

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $lines = Get-Content -LiteralPath $Path
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
      continue
    }

    $parts = $trimmed -split '=', 2
    if ($parts.Count -ne 2) {
      continue
    }

    $name = $parts[0].Trim()
    if ([string]::IsNullOrWhiteSpace($name)) {
      continue
    }

    $value = $parts[1].Trim()
    if ($value.Length -ge 2) {
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

function Resolve-ExecutableCommand {
  param([string]$CommandText)

  if ($CommandText -notmatch '^\s*psql(\s|$)') {
    return $CommandText
  }

  if (Get-Command psql -ErrorAction SilentlyContinue) {
    return $CommandText
  }

  $candidate = Get-PsqlFallbackPath
  if ($null -ne $candidate) {
    $suffix = $CommandText -replace '^\s*psql', ''
    Write-Host "psql not found in PATH; using $candidate"
    return "& '" + $candidate + "'" + $suffix
  }

  return $CommandText
}

function Test-CommandPreflight {
  param(
    [string]$CommandText,
    [int]$Index
  )

  $errors = @()
  $toolName = Get-CommandExecutable -CommandText $CommandText

  if (-not [string]::IsNullOrWhiteSpace($toolName)) {
    if ($toolName -ieq 'psql') {
      $psqlResolved = Get-Command psql -ErrorAction SilentlyContinue
      if ($null -eq $psqlResolved -and $null -eq (Get-PsqlFallbackPath)) {
        $errors += "[$Index] Missing required tool: psql"
      }
    } elseif ($toolName -notmatch '^\$') {
      $resolved = Get-Command $toolName -ErrorAction SilentlyContinue
      if ($null -eq $resolved) {
        $errors += "[$Index] Missing required tool: $toolName"
      }
    }
  }

  $envMatches = [regex]::Matches($CommandText, '\$env:([A-Za-z_][A-Za-z0-9_]*)')
  $envNames = @{}
  foreach ($match in $envMatches) {
    $envName = $match.Groups[1].Value
    if (-not $envNames.ContainsKey($envName)) {
      $envNames[$envName] = $true
    }
  }

  foreach ($envName in $envNames.Keys) {
    $value = [Environment]::GetEnvironmentVariable($envName, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
      $errors += "[$Index] Missing required environment variable: $envName"
    }
  }

  $sqlFileMatches = [regex]::Matches($CommandText, '(?:^|\s)-f\s+([^\s]+)')
  foreach ($match in $sqlFileMatches) {
    $path = $match.Groups[1].Value.Trim('"').Trim("'")
    if (-not (Test-Path -LiteralPath $path)) {
      $errors += "[$Index] SQL file not found: $path"
    }
  }

  return $errors
}

function Test-Preflight {
  param([string[]]$Commands)

  $errors = @()
  for ($i = 0; $i -lt $Commands.Count; $i++) {
    $cmd = $Commands[$i]
    $index = $i + 1
    $cmdErrors = Test-CommandPreflight -CommandText $cmd -Index $index
    if (@($cmdErrors).Count -gt 0) {
      $errors += $cmdErrors
    }
  }

  return $errors
}

function Write-BatchSummaryFooter {
  param(
    [string]$LogPath,
    [string]$Status,
    [int]$TotalCommands,
    [int]$FailedCommands,
    [int]$TotalAttempts,
    [datetime]$BatchStart,
    [datetime]$BatchEnd
  )

  $succeededCommands = $TotalCommands - $FailedCommands
  $durationSeconds = [Math]::Round(($BatchEnd - $BatchStart).TotalSeconds, 2)

  Add-Content -LiteralPath $LogPath -Value "Batch status: $Status"
  Add-Content -LiteralPath $LogPath -Value "End time (UTC): $($BatchEnd.ToUniversalTime().ToString('u'))"
  Add-Content -LiteralPath $LogPath -Value "Summary:"
  Add-Content -LiteralPath $LogPath -Value " - Total commands: $TotalCommands"
  Add-Content -LiteralPath $LogPath -Value " - Succeeded commands: $succeededCommands"
  Add-Content -LiteralPath $LogPath -Value " - Failed commands: $FailedCommands"
  Add-Content -LiteralPath $LogPath -Value " - Total attempts: $TotalAttempts"
  Add-Content -LiteralPath $LogPath -Value " - Total runtime seconds: $durationSeconds"
}

Import-DotEnv

if (-not (Test-Path -LiteralPath $File)) {
  Write-Error "Command file not found: $File"
  exit 1
}

$rawLines = Get-Content -LiteralPath $File
$commands = @()

foreach ($line in $rawLines) {
  $trimmed = $line.Trim()
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    continue
  }

  if ($trimmed.StartsWith('#')) {
    continue
  }

  $commands += $line
}

if ($commands.Count -eq 0) {
  Write-Host "No commands to run in $File"
  exit 0
}

$preflightErrors = Test-Preflight -Commands $commands
if (@($preflightErrors).Count -gt 0) {
  Write-Host "Preflight checks failed:" -ForegroundColor Red
  foreach ($preflightError in $preflightErrors) {
    Write-Host " - $preflightError" -ForegroundColor Red
  }
  exit 1
}

$batchName = [IO.Path]::GetFileNameWithoutExtension($File)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$batchStart = Get-Date
$logDir = Join-Path -Path 'logs' -ChildPath 'command-batches'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logPath = Join-Path -Path $logDir -ChildPath "$timestamp-$batchName.log"

Add-Content -LiteralPath $logPath -Value "Batch file: $File"
Add-Content -LiteralPath $logPath -Value "Start time (UTC): $($batchStart.ToUniversalTime().ToString('u'))"
Add-Content -LiteralPath $logPath -Value "Retries: $Retries"
Add-Content -LiteralPath $logPath -Value "ContinueOnError: $($ContinueOnError.IsPresent)"
Add-Content -LiteralPath $logPath -Value ""

Write-Host "Running $($commands.Count) command(s) from $File"
Write-Host "Retries per command: $Retries"
Write-Host "Continue on error: $($ContinueOnError.IsPresent)"
Write-Host "Log file: $logPath"

$failed = @()
$totalAttempts = 0

for ($i = 0; $i -lt $commands.Count; $i++) {
  $cmd = $commands[$i]
  $resolvedCmd = Resolve-ExecutableCommand -CommandText $cmd
  $index = $i + 1
  $attempt = 0
  $succeeded = $false

  while (-not $succeeded -and $attempt -le $Retries) {
    $attempt++
    $totalAttempts++
    $commandStart = Get-Date
    Add-Content -LiteralPath $logPath -Value "[$index/$($commands.Count)] Attempt $attempt start: $($commandStart.ToUniversalTime().ToString('u'))"
    Add-Content -LiteralPath $logPath -Value "Command: $cmd"
    Write-Host ""
    Write-Host "[$index/$($commands.Count)] Attempt ${attempt}: $cmd"

    & powershell -NoProfile -ExecutionPolicy Bypass -Command $resolvedCmd 2>&1 | Tee-Object -FilePath $logPath -Append
    $exitCode = $LASTEXITCODE
    $commandEnd = Get-Date
    $duration = [Math]::Round(($commandEnd - $commandStart).TotalSeconds, 2)
    Add-Content -LiteralPath $logPath -Value "Exit code: $exitCode"
    Add-Content -LiteralPath $logPath -Value "Attempt duration seconds: $duration"
    Add-Content -LiteralPath $logPath -Value "Attempt end (UTC): $($commandEnd.ToUniversalTime().ToString('u'))"
    Add-Content -LiteralPath $logPath -Value ""

    if ($null -eq $exitCode) {
      $exitCode = 0
    }

    if ($exitCode -eq 0) {
      $succeeded = $true
      Write-Host "Command succeeded"
      continue
    }

    Write-Warning "Command failed with exit code $exitCode"

    if ($attempt -le $Retries) {
      Write-Host "Retrying..."
    }
  }

  if (-not $succeeded) {
    $failed += [PSCustomObject]@{
      Index = $index
      Command = $cmd
    }

    if (-not $ContinueOnError.IsPresent) {
      $batchEnd = Get-Date
      Write-BatchSummaryFooter -LogPath $logPath -Status 'failed' -TotalCommands $commands.Count -FailedCommands $failed.Count -TotalAttempts $totalAttempts -BatchStart $batchStart -BatchEnd $batchEnd
      Write-Error "Stopping after failure. Use -ContinueOnError to run remaining commands."
      exit 1
    }
  }
}

Write-Host ""
if ($failed.Count -eq 0) {
  $batchEnd = Get-Date
  Write-BatchSummaryFooter -LogPath $logPath -Status 'success' -TotalCommands $commands.Count -FailedCommands 0 -TotalAttempts $totalAttempts -BatchStart $batchStart -BatchEnd $batchEnd
  Write-Host "Batch complete. All commands succeeded."
  exit 0
}

$batchEnd = Get-Date
Write-BatchSummaryFooter -LogPath $logPath -Status 'failed' -TotalCommands $commands.Count -FailedCommands $failed.Count -TotalAttempts $totalAttempts -BatchStart $batchStart -BatchEnd $batchEnd
Write-Warning "Batch complete with $($failed.Count) failed command(s):"
foreach ($f in $failed) {
  Write-Warning "[$($f.Index)] $($f.Command)"
}

exit 1
