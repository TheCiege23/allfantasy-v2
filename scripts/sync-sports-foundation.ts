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
import { recordProviderSync } from '@/lib/provider-sync-logger'
import { prisma } from '@/lib/prisma'
import {
  syncNFLDepthChartsToDb,
  syncNFLPlayersToDb,
  syncNFLTeamsToDb,
} from '@/lib/rolling-insights'
import { buildFoundationCadencePlan } from '@/lib/sports-foundation/syncCadence'
import { importCollegePlayers } from '@/lib/workers/devy-data-worker'

type SupportedFoundationSport = 'NFL' | 'NCAAF'

type Args = {
  apply: boolean
  json: boolean
  season: number
  week: number
  historyStart: number
  historyEnd: number
  projectionSeason: number
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

type ProviderEnvStatus = {
  provider: string
  configured: boolean
  source: string | null
  missing: string[]
}

type SyncJobRunRecord = {
  id: string
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
    historyEnd: nowSeason,
    projectionSeason: nowSeason,
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
    } else if (raw.startsWith('--history-end=')) {
      const parsed = Number(raw.slice('--history-end='.length))
      if (Number.isFinite(parsed) && parsed > 2000) out.historyEnd = Math.trunc(parsed)
    } else if (raw.startsWith('--projection-season=')) {
      const parsed = Number(raw.slice('--projection-season='.length))
      if (Number.isFinite(parsed) && parsed > 2000) out.projectionSeason = Math.trunc(parsed)
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
  if (out.historyEnd < out.historyStart) {
    out.historyEnd = out.historyStart
  }
  if (out.historyEnd > out.season) {
    out.historyEnd = out.season
  }

  return out
}

function normalizeProviderEnvAliases() {
  const apiSports =
    process.env.APISPORTS_KEY?.trim() ||
    process.env.APISPORTS_API_KEY?.trim() ||
    process.env.API_SPORTS_KEY?.trim() ||
    process.env.SPORTS_API_KEY?.trim() ||
    ''
  if (apiSports) {
    process.env.APISPORTS_KEY ||= apiSports
    process.env.APISPORTS_API_KEY ||= apiSports
    process.env.API_SPORTS_KEY ||= apiSports
    process.env.SPORTS_API_KEY ||= apiSports
  }

  const theSportsDb =
    process.env.THESPORTSDB_API_KEY?.trim() ||
    process.env.THE_SPORTS_DB_API_KEY?.trim() ||
    process.env.SPORTSDB_API_KEY?.trim() ||
    process.env.thesportsdb_api_key?.trim() ||
    ''
  if (theSportsDb) {
    process.env.THESPORTSDB_API_KEY ||= theSportsDb
    process.env.THE_SPORTS_DB_API_KEY ||= theSportsDb
    process.env.SPORTSDB_API_KEY ||= theSportsDb
    process.env.thesportsdb_api_key ||= theSportsDb
  }

  const rollingInsights =
    process.env.ROLLING_INSIGHTS_API_KEY?.trim() ||
    process.env.ROLLINGINSIGHTS_API_KEY?.trim() ||
    ''
  if (rollingInsights) {
    process.env.ROLLING_INSIGHTS_API_KEY ||= rollingInsights
    process.env.ROLLINGINSIGHTS_API_KEY ||= rollingInsights
  }

  const cfbd = process.env.CFBD_API_KEY?.trim() || process.env.CFBD_KEY?.trim() || ''
  if (cfbd) {
    process.env.CFBD_API_KEY ||= cfbd
    process.env.CFBD_KEY ||= cfbd
    process.env.COLLEGE_FOOTBALL_DATA_API_KEY ||= cfbd
  }

  const clearSports =
    process.env.CLEARSPORTS_API_KEY?.trim() ||
    process.env.CLEAR_SPORTS_API_KEY?.trim() ||
    process.env.CLEARSPORTS_KEY?.trim() ||
    ''
  if (clearSports) {
    process.env.CLEARSPORTS_API_KEY ||= clearSports
    process.env.CLEAR_SPORTS_API_KEY ||= clearSports
    process.env.CLEARSPORTS_KEY ||= clearSports
  }
}

function resolveProviderEnvStatus(): ProviderEnvStatus[] {
  const statuses: ProviderEnvStatus[] = [
    {
      provider: 'Rolling Insights',
      configured: Boolean(
        process.env.ROLLING_INSIGHTS_API_KEY?.trim() ||
          process.env.ROLLING_INSIGHTS_CLIENT_ID?.trim() && process.env.ROLLING_INSIGHTS_CLIENT_SECRET?.trim() ||
          process.env.ROLLING_INSIGHTS_CLIENT_ID2?.trim() && process.env.ROLLING_INSIGHTS_CLIENT_SECRET2?.trim(),
      ),
      source:
        process.env.ROLLING_INSIGHTS_API_KEY?.trim()
          ? 'ROLLING_INSIGHTS_API_KEY'
          : process.env.ROLLING_INSIGHTS_CLIENT_ID?.trim() && process.env.ROLLING_INSIGHTS_CLIENT_SECRET?.trim()
            ? 'ROLLING_INSIGHTS_CLIENT_ID/ROLLING_INSIGHTS_CLIENT_SECRET'
            : process.env.ROLLING_INSIGHTS_CLIENT_ID2?.trim() && process.env.ROLLING_INSIGHTS_CLIENT_SECRET2?.trim()
              ? 'ROLLING_INSIGHTS_CLIENT_ID2/ROLLING_INSIGHTS_CLIENT_SECRET2'
              : null,
      missing: ['ROLLING_INSIGHTS_API_KEY', 'ROLLING_INSIGHTS_CLIENT_ID/ROLLING_INSIGHTS_CLIENT_SECRET'],
    },
    {
      provider: 'TheSportsDB',
      configured: Boolean(process.env.THESPORTSDB_API_KEY?.trim()),
      source: process.env.THESPORTSDB_API_KEY?.trim() ? 'THESPORTSDB_API_KEY' : null,
      missing: ['THESPORTSDB_API_KEY'],
    },
    {
      provider: 'API-Sports',
      configured: Boolean(process.env.APISPORTS_API_KEY?.trim()),
      source: process.env.APISPORTS_API_KEY?.trim() ? 'APISPORTS_API_KEY' : null,
      missing: ['SPORTS_API_KEY', 'APISPORTS_KEY', 'API_SPORTS_KEY'],
    },
    {
      provider: 'ClearSports',
      configured: Boolean(process.env.CLEARSPORTS_API_KEY?.trim()),
      source: process.env.CLEARSPORTS_API_KEY?.trim() ? 'CLEARSPORTS_API_KEY' : null,
      missing: ['CLEARSPORTS_API_KEY'],
    },
    {
      provider: 'CFBD',
      configured: Boolean(process.env.CFBD_API_KEY?.trim()),
      source: process.env.CFBD_API_KEY?.trim() ? 'CFBD_API_KEY' : null,
      missing: ['CFBD_API_KEY'],
    },
  ]
  return statuses
}

async function createJobRun(args: Args, providerStatus: ProviderEnvStatus[]): Promise<SyncJobRunRecord | null> {
  const model = (prisma as any).syncJobRun
  if (!model?.create) return null

  const row = await model.create({
    data: {
      jobName: 'sync_sports_foundation',
      jobScope: args.sports.join(','),
      trigger: args.apply ? 'manual_apply' : 'manual_dry_run',
      status: 'running',
      metadata: {
        season: args.season,
        week: args.week,
        historyStart: args.historyStart,
        historyEnd: args.historyEnd,
        projectionSeason: args.projectionSeason,
        sports: args.sports,
        providerStatus,
      },
      startedAt: new Date(),
    },
    select: { id: true },
  })
  return row as SyncJobRunRecord
}

async function markJobRunComplete(input: {
  jobRun: SyncJobRunRecord | null
  startedMs: number
  status: 'success' | 'partial_failure'
  rowsRead: number
  rowsWritten: number
  rowsSkipped: number
  metadata: Record<string, unknown>
  errorMessage?: string | null
}): Promise<void> {
  if (!input.jobRun?.id) return
  const model = (prisma as any).syncJobRun
  if (!model?.update) return

  await model.update({
    where: { id: input.jobRun.id },
    data: {
      status: input.status,
      rowsRead: input.rowsRead,
      rowsWritten: input.rowsWritten,
      rowsSkipped: input.rowsSkipped,
      metadata: input.metadata,
      errorMessage: input.errorMessage ?? null,
      completedAt: new Date(),
      durationMs: Math.max(0, Date.now() - input.startedMs),
    },
  })
}

function stepRowsRead(step: StepResult): number {
  if (!step.counts) return 0
  const readishKeys = ['fetched', 'providerRows', 'validForGameSchedule', 'cacheWrites']
  return readishKeys.reduce((sum, key) => {
    const value = step.counts?.[key]
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0)
  }, 0)
}

function stepRowsWritten(step: StepResult): number {
  if (!step.counts) return 0
  const writeishKeys = [
    'written',
    'playersWritten',
    'teamsWritten',
    'depthChartsWritten',
    'generated',
    'persisted',
    'rosPersisted',
    'players',
    'games',
    'teams',
    'playerStats',
    'injuries',
    'news',
  ]
  return writeishKeys.reduce((sum, key) => {
    const value = step.counts?.[key]
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0)
  }, 0)
}

function stepRowsSkipped(step: StepResult): number {
  if (!step.counts) return 0
  const skipKeys = ['skipped', 'rowsSkipped', 'unmatched', 'skippedAmbiguous', 'skippedMissingWeek', 'skippedMissingStats']
  return skipKeys.reduce((sum, key) => {
    const value = step.counts?.[key]
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0)
  }, 0)
}

async function captureFoundationDbSnapshot(input: {
  sport: SupportedFoundationSport
  historyStart: number
  historyEnd: number
  projectionSeason: number
}): Promise<Record<string, number>> {
  const historyYears = Array.from(
    { length: Math.max(0, input.historyEnd - input.historyStart + 1) },
    (_, index) => String(input.historyStart + index),
  )
  const sport = input.sport

  const [players, playersWithImages, seasonStats, projections, activeInjuries, identityRows] = await Promise.all([
    (prisma as any).sportsPlayer.count({ where: { sport } }).catch(() => 0),
    (prisma as any).sportsPlayer.count({ where: { sport, imageUrl: { not: null } } }).catch(() => 0),
    (prisma as any).playerSeasonStats.count({
      where: {
        sport,
        ...(historyYears.length > 0 ? { season: { in: historyYears } } : {}),
      },
    }).catch(() => 0),
    (prisma as any).fantasyProjection.count({
      where: { sport, season: String(input.projectionSeason) },
    }).catch(() => 0),
    (prisma as any).sportsInjury.count({
      where: { sport, expiresAt: { gte: new Date() } },
    }).catch(() => 0),
    (prisma as any).playerIdentityMap.count({ where: { sport } }).catch(() => 0),
  ])

  return {
    players,
    playersWithImages,
    missingImages: Math.max(0, players - playersWithImages),
    seasonStats,
    projections,
    activeInjuries,
    identityRows,
  }
}

async function recordFoundationStepSync(input: {
  provider: string
  entityType: string
  sport: SupportedFoundationSport
  key: string
  step: StepResult
}): Promise<void> {
  await recordProviderSync(
    {
      provider: input.provider,
      entityType: input.entityType,
      sport: input.sport,
      key: input.key,
    },
    {
      recordsImported: stepRowsRead(input.step),
      recordsUpdated: stepRowsWritten(input.step),
      recordsSkipped: stepRowsSkipped(input.step),
      error: input.step.ok ? null : input.step.errors?.[0] ?? input.step.detail ?? 'step failed',
    },
  )
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

  for (let season = args.historyStart; season <= args.historyEnd; season += 1) {
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
    season: args.projectionSeason,
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
  const providerStatus = resolveProviderEnvStatus()
  const cadence = args.sports.map((sport) =>
    buildFoundationCadencePlan({
      sport,
      season: args.projectionSeason,
    }),
  )

  if (!args.json) {
    logLine(args, '')
    logLine(args, 'Sports foundation sync')
    logLine(
      args,
      `mode=${args.apply ? 'apply' : 'dry-run'} season=${args.season} week=${args.week} historyStart=${args.historyStart} historyEnd=${args.historyEnd} projectionSeason=${args.projectionSeason}`,
    )
    logLine(args, `sports=${args.sports.join(',')}`)
    logLine(args, '')
    logLine(args, 'Provider env status')
    for (const status of providerStatus) {
      logLine(
        args,
        `- ${status.provider}: ${status.configured ? `configured via ${status.source}` : `missing (${status.missing.join(' or ')})`}`,
      )
    }
    logLine(args, '')
    logLine(args, 'Recommended sync cadence')
    for (const plan of cadence) {
      logLine(
        args,
        `- ${plan.sport}: phase=${plan.phase} preseasonRampStartsOn=${plan.preseasonRampStartsOn} seasonStartsOn=${plan.seasonStartsOn} seasonEndsOn=${plan.seasonEndsOn}`,
      )
      for (const task of plan.recommendedTasks) {
        logLine(args, `    ${task.task}: every ${task.frequencyHours}h (${task.priority})`)
      }
    }
  }

  const startedAt = Date.now()
  const steps: StepResult[] = []
  const dbSnapshots: Partial<Record<SupportedFoundationSport, Record<string, number>>> = {}
  const jobRun = await createJobRun(args, providerStatus)

  const clearSportsStep = await runGlobalClearSportsStep(args)
  if (clearSportsStep) steps.push(clearSportsStep)

  for (const sport of args.sports) {
    if (sport === 'NFL') {
      steps.push(...(await runNflFoundation(args)))
    } else if (sport === 'NCAAF') {
      steps.push(...(await runNcaafFoundation(args)))
    }
    if (args.apply) {
      dbSnapshots[sport] = await captureFoundationDbSnapshot({
        sport,
        historyStart: args.historyStart,
        historyEnd: args.historyEnd,
        projectionSeason: args.projectionSeason,
      })
    }
  }

  const ok = steps.every((step) => step.ok)
  if (args.apply) {
    for (const sport of args.sports) {
      const sportSteps = steps.filter((step) =>
        sport === 'NFL'
          ? /Nfl|NFL|nfl/i.test(step.step)
          : /Ncaaf|NCAAF|college/i.test(step.step),
      )
      for (const step of sportSteps) {
        await recordFoundationStepSync({
          provider: 'sports_foundation',
          entityType: step.step.slice(0, 64),
          sport,
          key: `${args.season}:${args.projectionSeason}`,
          step,
        })
      }
    }
  }

  const rowsRead = steps.reduce((sum, step) => sum + stepRowsRead(step), 0)
  const rowsWritten = steps.reduce((sum, step) => sum + stepRowsWritten(step), 0)
  const rowsSkipped = steps.reduce((sum, step) => sum + stepRowsSkipped(step), 0)
  const summary = {
    ok,
    mode: args.apply ? 'apply' : 'dry-run',
    season: args.season,
    week: args.week,
    historyStart: args.historyStart,
    historyEnd: args.historyEnd,
    projectionSeason: args.projectionSeason,
    sports: args.sports,
    providerStatus,
    cadence,
    dbSnapshots,
    durationMs: Date.now() - startedAt,
    steps,
  }

  await markJobRunComplete({
    jobRun,
    startedMs: startedAt,
    status: ok ? 'success' : 'partial_failure',
    rowsRead,
    rowsWritten,
    rowsSkipped,
    metadata: summary as unknown as Record<string, unknown>,
    errorMessage: ok ? null : steps.find((step) => !step.ok)?.errors?.[0] ?? 'One or more sports foundation steps failed',
  })

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
