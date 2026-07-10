/**
 * Fantasy OS Suite — Phase V7.1: Decision OS Validation Cohort — internal CLI (Step 12).
 *
 * The ONLY place that makes live Sleeper calls. This is an explicit INTERNAL validation workflow — it is
 * never reachable from a customer request path. It resolves a cohort of Sleeper usernames, imports league
 * data DB-lessly, classifies archetypes, runs the reachable Decision OS derivations, and writes a
 * timestamped machine-readable report + a concise human summary.
 *
 * Usage:
 *   npx tsx scripts/decision-os-validate-sleeper-cohort.ts --username=<one>            # single account
 *   npx tsx scripts/decision-os-validate-sleeper-cohort.ts --cohort=<file>            # newline-delimited list
 *   npx tsx scripts/decision-os-validate-sleeper-cohort.ts --cohort=<file> --dryRun   # resolve + discover only
 *   [--season=YYYY] [--sport=nfl] [--concurrency=3] [--maxTxWeeks=18] [--out=<dir>]
 *   [--resume=<prior report.json>]   # skip leagues already in a prior report
 *
 * Boundaries: DB-less (no DATABASE_URL, no writes to any product table); provider-agnostic downstream of
 * the resolver; no fabricated data; bounded concurrency; safe to re-run.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { normalizeCohort } from '../lib/validation-cohort/normalizeCohort'
import { runCohort } from '../lib/validation-cohort/runCohort'
import { makeDefaultFetch } from '../lib/validation-cohort/sleeperCohortClient'
import { renderHumanSummary } from '../lib/validation-cohort/reportBuilder'
import type { CohortAggregateReport } from '../lib/validation-cohort/types'

function arg(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const hasFlag = (name: string) => process.argv.slice(2).includes(`--${name}`)

function readCohortLines(): string[] {
  const single = arg('username')
  if (single) return [single]
  const file = arg('cohort')
  if (!file) return []
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`cohort file not found: ${abs}`)
    process.exit(1)
  }
  return fs.readFileSync(abs, 'utf8').split(/\r?\n/)
}

function loadResumeSet(): Set<string> {
  const file = arg('resume')
  if (!file) return new Set()
  try {
    const prior = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) as CohortAggregateReport
    return new Set(prior.perLeague.map((l) => l.leagueReference))
  } catch {
    console.warn(`could not read --resume report; proceeding without resume set`)
    return new Set()
  }
}

;(async () => {
  const lines = readCohortLines()
  if (lines.length === 0) {
    console.error('no cohort input — pass --username=<name> or --cohort=<file>')
    process.exit(1)
  }

  const accounts = normalizeCohort(lines)
  const dryRun = hasFlag('dryRun')
  const season = arg('season')
  const sport = arg('sport') ?? 'nfl'
  const concurrency = Number(arg('concurrency') ?? '3')
  const maxTxWeeks = Number(arg('maxTxWeeks') ?? '18')
  // Default output goes to the OS temp dir — reports may contain league data and must never land in the
  // repo by default. Pass --out=<dir> to write elsewhere (e.g. a gitignored analysis folder).
  const outDir = path.resolve(arg('out') ?? path.join(os.tmpdir(), 'decision-os-validation-cohort'))
  const fetchJson = makeDefaultFetch(Number(arg('timeoutMs') ?? '8000'), Number(arg('retries') ?? '2'))

  console.log(
    `[validate-cohort] candidates=${accounts.length} resolvable=${accounts.filter((a) => a.status === 'pending').length} ambiguous=${accounts.filter((a) => a.status === 'ambiguous').length} dryRun=${dryRun}`,
  )

  const { report } = await runCohort(accounts, fetchJson, {
    season,
    sport,
    concurrency,
    maxTxWeeks,
    dryRun,
    maxLeagues: arg('maxLeagues') ? Number(arg('maxLeagues')) : undefined,
    alreadyDone: loadResumeSet(),
  })

  fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const tag = dryRun ? 'dryrun' : 'run'
  const jsonPath = path.join(outDir, `cohort-${tag}-${stamp}.json`)
  const txtPath = path.join(outDir, `cohort-${tag}-${stamp}.txt`)
  fs.writeFileSync(jsonPath, JSON.stringify({ accounts, report }, null, 2))
  fs.writeFileSync(txtPath, renderHumanSummary(report))

  console.log(renderHumanSummary(report))
  console.log(`\n[validate-cohort] wrote ${jsonPath}`)
  console.log(`[validate-cohort] wrote ${txtPath}`)
  console.log(dryRun ? 'VALIDATE_COHORT_DRY_RUN_OK' : 'VALIDATE_COHORT_OK')
})().catch((err) => {
  console.error('[validate-cohort] fatal:', err)
  process.exit(1)
})
