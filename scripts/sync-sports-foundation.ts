import 'dotenv/config'

import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import { syncClearSportsToDb } from '@/lib/clear-sports'
import { importNcaafFantasyData } from '@/lib/fantasy-data/importNcaafFantasyData'
import { importNflFantasyData } from '@/lib/fantasy-data/importNflFantasyData'
import { generateAndPersistCanonicalNflProjections } from '@/lib/nfl-data-foundation/nflDataFoundationService'
import {
  backfillNflRollingInsightsIdentities,
  rollingInsightsSeasonRange,
  syncNflFoundationInjuries,
  syncNflFoundationSchedule,
  syncNflFoundationSeasonStats,
} from '@/lib/nfl-data-foundation/nflFoundationSync'
import {
  syncNFLDepthChartsToDb,
  syncNFLPlayersToDb,
  syncNFLTeamsToDb,
} from '@/lib/rolling-insights'
import { importCollegePlayers } from '@/lib/workers/devy-data-worker'

type SupportedFoundationSport = 'NFL' | 'NCAAF'

type Args = {
  apply: boolean
  json: boolean
  season: number
  week: number
  historyStart: number
  sports: SupportedFoundationSport[]
  skipClearSports: boolean
  skipTheSportsDb: boolean
  skipSleeper: boolean
  skipCollege: boolean
}

type StepResult = {
  step: string
  ok: boolean
  detail?: string
  counts?: Record<string, number | string | boolean | null>
  warnings?: string[]
  errors?: string[]
}

function currentSeason(): number {
  return new Date().getUTCFullYear()
}

function parseArgs(argv: string[]): Args {
  const nowSeason = currentSeason()
  const out: Args = {
    apply: false,
    json: false,
    season: nowSeason,
    week: 1,
    historyStart: nowSeason,
    sports: ['NFL', 'NCAAF'],
    skipClearSports: false,
    skipTheSportsDb: false,
    skipSleeper: false,
    skipCollege: false,
  }

  for (const raw of argv) {
    if (raw === '--apply') out.apply = true
    else if (raw === '--json') out.json = true
    else if (raw === '--skip-clearsports') out.skipClearSports = true
    else if (raw === '--skip-thesportsdb') out.skipTheSportsDb = true
    else if (raw === '--skip-sleeper') out.skipSleeper = true
    else if (raw === '--skip-college') out.skipCollege = true
    else if (raw.startsWith('--season=')) {
      const parsed = Number(raw.slice('--season='.length))
      if (Number.isFinite(parsed) && parsed > 2000) out.season = Math.trunc(parsed)
    } else if (raw.startsWith('--week=')) {
      const parsed = Number(raw.slice('--week='.length))
      if (Number.isFinite(parsed) && parsed > 0) out.week = Math.trunc(parsed)
    } else if (raw.startsWith('--history-start=')) {
      const parsed = Number(raw.slice('--history-start='.length))
      if (Number.isFinite(parsed) && parsed > 2000) out.historyStart = Math.trunc(parsed)
    } else if (raw.startsWith('--sports=')) {
      const parsed = raw
        .slice('--sports='.length)
        .split(',')
        .map((part) => part.trim().toUpperCase())
        .filter((part): part is SupportedFoundationSport => part === 'NFL' || part === 'NCAAF')
      if (parsed.length) out.sports = [...new Set(parsed)]
    }
  }

  if (out.historyStart > out.season) {
    out.historyStart = out.season
  }

  return out
}

function normalizeProviderEnvAliases() {
  const apiSports =
    process.env.APISPORTS_API_KEY?.trim() ||
    process.env.API_SPORTS_KEY?.trim() ||
    process.env.SPORTS_API_KEY?.trim() ||
    ''
  if (apiSports) {
    process.env.APISPORTS_API_KEY ||= apiSports
    process.env.API_SPORTS_KEY ||= apiSports
    process.env.SPORTS_API_KEY ||= apiSports
  }

  const cfbd = process.env.CFBD_API_KEY?.trim() || process.env.CFBD_KEY?.trim() || ''
  if (cfbd) {
    process.env.CFBD_API_KEY ||= cfbd
    process.env.CFBD_KEY ||= cfbd
  }

  const clearSports =
    process.env.CLEARSPORTS_API_KEY?.trim() ||
    process.env.CLEAR_SPORTS_API_KEY?.trim() ||
    ''
  if (clearSports) {
    process.env.CLEARSPORTS_API_KEY ||= clearSports
    process.env.CLEAR_SPORTS_API_KEY ||= clearSports
  }
}

function logLine(args: Args, line: string) {
  if (!args.json) console.log(line)
}

function childStepName(scriptPath: string, scriptArgs: string[]): string {
  return `${scriptPath} ${scriptArgs.join(' ')}`.trim()
}

async function runTsxScript(
  scriptPath: string,
  scriptArgs: string[],
  args: Args,
): Promise<StepResult> {
  const step = childStepName(scriptPath, scriptArgs)
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--env-file=.env', '--require', './scripts/_audit-preload.cjs', '--import', 'tsx', scriptPath, ...scriptArgs],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: args.json ? 'pipe' : 'inherit',
      },
    )

    let stderr = ''
    if (args.json) {
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })
    }

    child.on('close', (code) => {
      resolve({
        step,
        ok: code === 0,
        detail: code === 0 ? 'completed' : `exit code ${code ?? 'unknown'}`,
        errors: code === 0 ? [] : stderr.trim() ? [stderr.trim().slice(0, 600)] : [],
      })
    })
  })
}

async function runNflFoundation(args: Args): Promise<StepResult[]> {
  const steps: StepResult[] = []
  const riSeason = rollingInsightsSeasonRange(args.season)

  const importSummary = await importNflFantasyData({
    season: args.season,
    week: args.week,
    dryRun: !args.apply,
  })
  steps.push({
    step: 'importNflFantasyData',
    ok: importSummary.ok,
    detail: importSummary.dryRun ? 'dry-run' : 'write',
    counts: importSummary.counts,
    warnings: importSummary.warnings,
    errors: importSummary.errors,
  })

  if (!args.apply) {
    return steps
  }

  const teamsWritten = await syncNFLTeamsToDb()
  steps.push({
    step: 'syncNFLTeamsToDb',
    ok: true,
    counts: { teamsWritten },
  })

  const playersWritten = await syncNFLPlayersToDb({ season: riSeason })
  steps.push({
    step: 'syncNFLPlayersToDb',
    ok: true,
    counts: { playersWritten, rollingInsightsSeason: riSeason },
  })

  const depthChartsWritten = await syncNFLDepthChartsToDb({ season: riSeason })
  steps.push({
    step: 'syncNFLDepthChartsToDb',
    ok: true,
    counts: { depthChartsWritten, rollingInsightsSeason: riSeason },
  })

  if (!args.skipSleeper) {
    steps.push(
      await runTsxScript('scripts/sync-rookies-from-sleeper.ts', ['--all'], args),
    )
  }

  if (!args.skipTheSportsDb) {
    steps.push(
      await runTsxScript('scripts/sync-thesportsdb-players.ts', ['--apply', '--league', 'NFL'], args),
    )
  }

  const schedule = await syncNflFoundationSchedule({ season: args.season, write: true })
  steps.push({
    step: 'syncNflFoundationSchedule',
    ok: schedule.written >= 0,
    counts: {
      selectedRollingInsightsSeason: schedule.selectedRollingInsightsSeason,
      fetched: schedule.fetched,
      validForGameSchedule: schedule.validForGameSchedule,
      written: schedule.written,
    },
  })

  for (let season = args.historyStart; season <= args.season; season += 1) {
    const seasonStats = await syncNflFoundationSeasonStats({
      season,
      write: true,
      prismaClient: undefined,
    })
    steps.push({
      step: `syncNflFoundationSeasonStats:${season}`,
      ok: seasonStats.errors.length === 0,
      counts: {
        providerRows: seasonStats.providerRows,
        rowsWithRegularSeason: seasonStats.rowsWithRegularSeason,
        rowsWithFantasyPoints: seasonStats.rowsWithFantasyPoints,
        matchedSportsPlayers: seasonStats.matchedSportsPlayers,
        writeCandidates: seasonStats.writeCandidates,
        written: seasonStats.written,
      },
      errors: seasonStats.errors,
    })
  }

  const injuries = await syncNflFoundationInjuries({ write: true })
  steps.push({
    step: 'syncNflFoundationInjuries',
    ok: injuries.error == null,
    counts: {
      available: injuries.available,
      providerRows: injuries.providerRows,
      normalizedRows: injuries.normalizedRows,
      written: injuries.written,
    },
    errors: injuries.error ? [injuries.error] : [],
  })

  const identities = await backfillNflRollingInsightsIdentities({ write: true })
  steps.push({
    step: 'backfillNflRollingInsightsIdentities',
    ok: identities.errors.length === 0,
    counts: {
      created: identities.created,
      updated: identities.updated,
      unmatched: identities.unmatched,
      skippedAmbiguous: identities.skippedAmbiguous,
      estimatedMatchRateAfter: identities.estimatedMatchRateAfter,
    },
    errors: identities.errors,
  })

  const projections = await generateAndPersistCanonicalNflProjections({
    season: args.season,
    week: args.week,
    write: true,
  })
  steps.push({
    step: 'generateAndPersistCanonicalNflProjections',
    ok: true,
    counts: {
      generated: projections.generated,
      persisted: projections.persisted,
      rosPersisted: projections.rosPersisted,
      skipped: projections.skipped,
    },
  })

  return steps
}

async function runNcaafFoundation(args: Args): Promise<StepResult[]> {
  const steps: StepResult[] = []

  const importSummary = await importNcaafFantasyData({
    season: args.season,
    dryRun: !args.apply,
  })
  steps.push({
    step: 'importNcaafFantasyData',
    ok: importSummary.ok,
    detail: importSummary.dryRun ? 'dry-run' : 'write',
    counts: importSummary.counts,
    warnings: importSummary.warnings,
    errors: importSummary.errors,
  })

  if (!args.apply) {
    return steps
  }

  if (!args.skipCollege) {
    const college = await importCollegePlayers('NCAAF')
    steps.push({
      step: 'importCollegePlayers:NCAAF',
      ok: college.ok,
      counts: {
        created: college.created ?? 0,
        updated: college.updated ?? 0,
        processed: college.processed ?? 0,
      },
      errors: college.errors,
    })
  }

  if (!args.skipTheSportsDb) {
    steps.push(
      await runTsxScript('scripts/sync-thesportsdb-players.ts', ['--apply', '--league', 'NCAAF'], args),
    )
  }

  return steps
}

async function runGlobalClearSportsStep(args: Args): Promise<StepResult | null> {
  if (args.skipClearSports || !args.apply) return null
  const clearSports = await syncClearSportsToDb({ season: String(args.season), syncType: 'all' })
  return {
    step: 'syncClearSportsToDb',
    ok: clearSports.errors.length === 0,
    counts: {
      fetchedEndpoints: clearSports.fetchedEndpoints,
      cacheWrites: clearSports.cacheWrites,
      teams: clearSports.imported.teams,
      games: clearSports.imported.games,
      players: clearSports.imported.players,
      injuries: clearSports.imported.injuries,
      teamStats: clearSports.imported.teamStats,
      playerStats: clearSports.imported.playerStats,
      news: clearSports.imported.news,
    },
    errors: clearSports.errors,
  }
}

export async function main() {
  const args = parseArgs(process.argv.slice(2))
  normalizeProviderEnvAliases()

  if (!args.json) {
    logLine(args, '')
    logLine(args, 'Sports foundation sync')
    logLine(args, `mode=${args.apply ? 'apply' : 'dry-run'} season=${args.season} week=${args.week} historyStart=${args.historyStart}`)
    logLine(args, `sports=${args.sports.join(',')}`)
  }

  const startedAt = Date.now()
  const steps: StepResult[] = []

  const clearSportsStep = await runGlobalClearSportsStep(args)
  if (clearSportsStep) steps.push(clearSportsStep)

  for (const sport of args.sports) {
    if (sport === 'NFL') {
      steps.push(...(await runNflFoundation(args)))
    } else if (sport === 'NCAAF') {
      steps.push(...(await runNcaafFoundation(args)))
    }
  }

  const ok = steps.every((step) => step.ok)
  const summary = {
    ok,
    mode: args.apply ? 'apply' : 'dry-run',
    season: args.season,
    week: args.week,
    historyStart: args.historyStart,
    sports: args.sports,
    durationMs: Date.now() - startedAt,
    steps,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  logLine(args, '')
  logLine(args, ok ? 'Summary: success' : 'Summary: partial failure')
  for (const step of steps) {
    logLine(args, `- ${step.ok ? 'OK' : 'FAIL'} ${step.step}${step.detail ? ` (${step.detail})` : ''}`)
    if (step.errors?.length) {
      for (const error of step.errors.slice(0, 2)) {
        logLine(args, `    error: ${error}`)
      }
    }
  }
}

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null

if (entryHref && import.meta.url === entryHref) {
  main().catch((error) => {
    console.error('[sync-sports-foundation] fatal:', error instanceof Error ? error.stack ?? error.message : String(error))
    process.exit(1)
  })
}
