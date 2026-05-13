<#
.SYNOPSIS
    AllFantasy staging deployment runbook — Vercel Preview environment.

.DESCRIPTION
    Automates the steps to push the current branch as a Vercel Preview, wait for
    the deployment to be READY, run Prisma migrate against the staging database,
    then run the HTTP smoke validation suite.

    Prerequisite tools (all must be on PATH):
      git          — source control
      node ≥ 20    — runs staging-validate.mjs
      vercel CLI   — optional but used for env var inspection + log tailing
      npx          — for prisma migrate deploy

    Required env vars (set before running):
      STAGING_DATABASE_URL   — non-pooled Neon staging branch URL (for migrate)
      STAGING_NEXTAUTH_URL   — the preview URL Vercel assigned (filled in after deploy)

    Optional env vars:
      VERCEL_TOKEN           — personal access token; used by Vercel CLI & MCP
      STAGING_LEAGUE_ID      — seeded league for draft endpoint checks
      STAGING_DRAFT_ID       — matching draft ID for SSE check

.EXAMPLE
    # Full staging run from the feat/p2-production-hardening branch:
    $env:STAGING_DATABASE_URL = "postgresql://user:pw@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
    powershell -ExecutionPolicy Bypass -File scripts/staging-deploy.ps1

.EXAMPLE
    # Validate only (skip push + migrate):
    $env:BASE_URL = "https://allfantasy-v2-abc123.vercel.app"
    powershell -ExecutionPolicy Bypass -File scripts/staging-deploy.ps1 -ValidateOnly
#>

[CmdletBinding()]
param(
    [switch]$ValidateOnly,   # Skip git push + migrate; only run staging-validate.mjs
    [switch]$SkipMigrate,    # Skip Prisma migrate but still push and validate
    [string]$Branch = ''     # Override branch name (default: current git branch)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Helpers ───────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host "`n── $msg ─────────────────────────────────────────────" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "  ✅  $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "  ⚠️   $msg" -ForegroundColor Yellow
}

function Write-Err([string]$msg) {
    Write-Host "  ❌  $msg" -ForegroundColor Red
}

function Assert-Command([string]$cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Err "$cmd not found on PATH. Install it before running this script."
        exit 1
    }
}

function Invoke-Step([string]$description, [scriptblock]$block) {
    Write-Host "  ▶  $description" -ForegroundColor DarkCyan
    & $block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Write-Err "$description failed (exit $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

# ── Prerequisites ─────────────────────────────────────────────────────────────

Write-Step "Prerequisites"
Assert-Command "git"
Assert-Command "node"
Assert-Command "npx"

$nodeVersion = & node --version 2>&1
Write-OK "Node.js $nodeVersion"

$gitVersion = & git --version 2>&1
Write-OK "git $gitVersion"

# Vercel CLI is optional but recommended
$hasVercel = $null -ne (Get-Command "vercel" -ErrorAction SilentlyContinue)
if ($hasVercel) {
    $vercelVersion = & vercel --version 2>&1
    Write-OK "Vercel CLI $vercelVersion"
} else {
    Write-Warn "Vercel CLI not found. Install with: npm i -g vercel"
    Write-Warn "Push will go via git; deployment monitoring will be manual."
}

# ── Resolve branch ─────────────────────────────────────────────────────────────

Write-Step "Branch detection"

if ($Branch -eq '') {
    $Branch = (& git rev-parse --abbrev-ref HEAD 2>&1).Trim()
    if ($LASTEXITCODE -ne 0 -or $Branch -eq 'HEAD') {
        Write-Err "Could not determine current branch. Pass -Branch <name> explicitly."
        exit 1
    }
}

Write-OK "Branch: $Branch"

if ($Branch -eq 'main' -or $Branch -eq 'master') {
    Write-Warn "You are on $Branch. Deploying main goes straight to production."
    Write-Warn "This script is intended for feature/fix branches that create Preview deployments."
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

# ── Check for uncommitted changes ─────────────────────────────────────────────

Write-Step "Working tree check"

$statusOutput = & git status --porcelain 2>&1
if ($statusOutput) {
    Write-Warn "Uncommitted changes detected:"
    Write-Host $statusOutput -ForegroundColor DarkGray
    $confirm = Read-Host "Push with uncommitted changes? They will NOT be included. Continue? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Tip: run 'git add . && git commit' first, then re-run this script."
        exit 0
    }
} else {
    Write-OK "Working tree clean"
}

if ($ValidateOnly) {
    Write-Host "`n[ValidateOnly mode] Skipping push and migrate." -ForegroundColor Yellow
    goto Validate
}

# ── Push branch to remote ─────────────────────────────────────────────────────

Write-Step "Push branch → GitHub"

Invoke-Step "git push origin $Branch --set-upstream" {
    & git push origin $Branch --set-upstream
}

Write-OK "Branch pushed. Vercel will auto-deploy a Preview if the project is connected."

# ── Wait for Vercel Preview deployment ────────────────────────────────────────

Write-Step "Vercel Preview deployment"

if ($hasVercel -and $env:VERCEL_TOKEN) {
    Write-Host "  ▶  Waiting for Vercel Preview deployment on branch '$Branch'..."
    Write-Host "     (This may take 2–4 minutes for a Next.js build)"

    # Poll vercel CLI for the latest preview deployment URL
    $maxWait = 300  # 5 minutes
    $interval = 15
    $elapsed = 0
    $deployUrl = ''

    while ($elapsed -lt $maxWait) {
        Start-Sleep -Seconds $interval
        $elapsed += $interval

        $deploymentsJson = & vercel ls --token $env:VERCEL_TOKEN --json 2>&1
        if ($LASTEXITCODE -eq 0) {
            try {
                $deployments = $deploymentsJson | ConvertFrom-Json
                $preview = $deployments | Where-Object {
                    $_.target -ne 'production' -and $_.meta.githubCommitRef -eq $Branch
                } | Select-Object -First 1

                if ($preview) {
                    if ($preview.state -eq 'READY') {
                        $deployUrl = "https://$($preview.url)"
                        Write-OK "Preview is READY: $deployUrl (waited ${elapsed}s)"
                        break
                    } elseif ($preview.state -eq 'ERROR' -or $preview.state -eq 'CANCELED') {
                        Write-Err "Deployment $($preview.uid) entered state $($preview.state)"
                        Write-Host "  Run: vercel logs $($preview.uid) to see build output"
                        exit 1
                    } else {
                        Write-Host "  ... ${elapsed}s — deployment state: $($preview.state)"
                    }
                } else {
                    Write-Host "  ... ${elapsed}s — no preview deployment found for branch yet"
                }
            } catch {
                Write-Warn "Could not parse Vercel deployment list: $_"
            }
        }
    }

    if ($deployUrl -eq '') {
        Write-Warn "Timed out waiting for Vercel Preview (${maxWait}s). Check the dashboard:"
        Write-Warn "  https://vercel.com/dashboard"
        Write-Host ""
        Write-Host "Once the deployment is READY, run:"
        Write-Host "  `$env:BASE_URL = 'https://<preview-url>.vercel.app'"
        Write-Host "  node scripts/staging-validate.mjs"
        exit 0
    }

    $env:BASE_URL = $deployUrl
} else {
    Write-Warn "Vercel CLI or VERCEL_TOKEN not available. Check Vercel dashboard for preview URL."
    Write-Host ""
    Write-Host "Once the deployment is READY:"
    Write-Host "  1. Copy the Preview URL from https://vercel.com/dashboard"
    Write-Host "  2. Set env: `$env:BASE_URL = 'https://<preview>.vercel.app'"
    Write-Host "  3. Re-run this script with -ValidateOnly, or run:"
    Write-Host "     node scripts/staging-validate.mjs"
    Write-Host ""

    if (-not $env:BASE_URL) {
        Write-Err "BASE_URL is not set. Cannot run validation. Set it and re-run with -ValidateOnly."
        exit 1
    }
    Write-Warn "Using BASE_URL=$env:BASE_URL from environment."
}

# ── Prisma migrate deploy ─────────────────────────────────────────────────────

Write-Step "Prisma migrate deploy (staging DB)"

if ($SkipMigrate) {
    Write-Warn "Skipping Prisma migrate (--SkipMigrate flag set)"
} elseif (-not $env:STAGING_DATABASE_URL) {
    Write-Warn "STAGING_DATABASE_URL is not set. Skipping migrate."
    Write-Warn "Set STAGING_DATABASE_URL to the non-pooled staging Neon URL and re-run."
} else {
    Write-Host "  ▶  Running: prisma migrate deploy against staging DB..."

    $savedUrl = $env:DATABASE_URL
    $savedDirect = $env:DIRECT_URL
    try {
        $env:DATABASE_URL  = $env:STAGING_DATABASE_URL
        $env:DIRECT_URL    = $env:STAGING_DATABASE_URL

        Invoke-Step "npx prisma migrate deploy (staging)" {
            & npx prisma migrate deploy
        }
        Write-OK "Prisma migrations applied to staging DB"
    } finally {
        $env:DATABASE_URL = $savedUrl
        $env:DIRECT_URL   = $savedDirect
    }
}

# ── Validate ──────────────────────────────────────────────────────────────────

:Validate
Write-Step "Staging HTTP smoke validation"

if (-not $env:BASE_URL) {
    Write-Err "BASE_URL is not set. Cannot validate."
    Write-Host "Set: `$env:BASE_URL = 'https://<your-preview-url>.vercel.app'"
    exit 1
}

Write-Host "  Target: $env:BASE_URL"

$validateArgs = @()
if ($env:STAGING_LEAGUE_ID) { $validateArgs += @("--env", "STAGING_LEAGUE_ID=$env:STAGING_LEAGUE_ID") }
if ($env:STAGING_DRAFT_ID)  { $validateArgs += @("--env", "STAGING_DRAFT_ID=$env:STAGING_DRAFT_ID") }

& node scripts/staging-validate.mjs
$exitCode = $LASTEXITCODE

Write-Step "Result"

if ($exitCode -eq 0) {
    Write-OK "Staging validation PASSED"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Manually verify draft room in browser: $env:BASE_URL/draft"
    Write-Host "  2. Open DevTools → Network → filter 'stream' → confirm SSE events"
    Write-Host "  3. Run k6 load test:"
    Write-Host "     k6 run --env BASE_URL=$env:BASE_URL --env LEAGUE_ID=<id> --env DRAFT_ID=<id> scripts/load-test/draft-pick.k6.js"
    Write-Host "  4. When satisfied, merge PR to main → production deploy"
} else {
    Write-Err "Staging validation FAILED (exit $exitCode)"
    Write-Host ""
    Write-Host "Debug steps:" -ForegroundColor Yellow
    Write-Host "  1. Check Vercel function logs: vercel logs --token `$env:VERCEL_TOKEN"
    Write-Host "  2. Run with VERBOSE=1: `$env:VERBOSE=1; node scripts/staging-validate.mjs"
    Write-Host "  3. Check /api/health directly: curl $env:BASE_URL/api/health"
    exit 1
}
