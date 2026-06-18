import { prisma } from '@/lib/prisma'
import type { CanonicalNflDataCoverage } from './types'

type DbClient = typeof prisma

type CoverageField = {
  count: number
  latest: Date | null
  staleAfterHours: number
}

const STALE_HOURS = {
  players: 24 * 7,
  teams: 24 * 30,
  schedule: 24 * 2,
  depthCharts: 24 * 2,
  seasonStats: 24 * 3,
  injuries: 24,
  weeklyProjections: 24,
  rosProjections: 24 * 3,
  tradeValues: 24 * 3,
} satisfies Record<string, number>

function iso(value: Date | null | undefined): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null
}

function stale(latest: Date | null, hours: number, now: Date): boolean {
  if (!latest) return false
  return now.getTime() - latest.getTime() > hours * 60 * 60 * 1000
}

async function countAndLatest(
  model: { count: Function; findFirst: Function } | undefined,
  where: Record<string, unknown>,
  dateField: string,
): Promise<{ count: number; latest: Date | null }> {
  if (!model?.count || !model?.findFirst) return { count: 0, latest: null }
  const [count, latest] = await Promise.all([
    model.count({ where }).catch(() => 0),
    model
      .findFirst({
        where,
        orderBy: { [dateField]: 'desc' },
        select: { [dateField]: true },
      })
      .catch(() => null),
  ])
  const date = latest?.[dateField]
  return {
    count: Number(count ?? 0),
    latest: date instanceof Date ? date : null,
  }
}

async function maxField(
  left: Promise<{ count: number; latest: Date | null }>,
  right: Promise<{ count: number; latest: Date | null }>,
): Promise<{ count: number; latest: Date | null }> {
  const [a, b] = await Promise.all([left, right])
  return {
    count: a.count + b.count,
    latest: !a.latest || (b.latest && b.latest > a.latest) ? b.latest : a.latest,
  }
}

function pushState(args: {
  key: keyof typeof STALE_HOURS
  label: string
  field: CoverageField
  missingFields: string[]
  staleFields: string[]
  lastFetchedAt: Record<string, string | null>
  counts: Record<string, number>
  now: Date
}): boolean {
  args.counts[args.key] = args.field.count
  args.lastFetchedAt[args.key] = iso(args.field.latest)
  if (args.field.count <= 0) {
    args.missingFields.push(args.label)
    return false
  }
  if (stale(args.field.latest, args.field.staleAfterHours, args.now)) {
    args.staleFields.push(args.label)
  }
  return true
}

export async function getCanonicalNflDataCoverage(options?: {
  season?: number
  week?: number | null
  now?: Date
  prismaClient?: DbClient
}): Promise<CanonicalNflDataCoverage> {
  const db = (options?.prismaClient ?? prisma) as DbClient
  const now = options?.now ?? new Date()
  const season = Number.isFinite(Number(options?.season))
    ? Number(options?.season)
    : now.getUTCFullYear()
  const week = options?.week != null && Number.isFinite(Number(options.week)) ? Number(options.week) : null
  const seasonString = String(season)

  const weeklyWhere =
    week != null
      ? { sport: 'NFL', season: seasonString, week }
      : { sport: 'NFL', season: seasonString }
  const afWeeklyWhere =
    week != null
      ? { sport: 'NFL', season, week }
      : { sport: 'NFL', season, week: { not: null } }

  const [
    players,
    teams,
    schedule,
    depthCharts,
    seasonStats,
    injuries,
    weeklyProjections,
    rosProjections,
    tradeValues,
  ] = await Promise.all([
    countAndLatest((db as any).sportsPlayer, { sport: 'NFL' }, 'fetchedAt'),
    countAndLatest((db as any).sportsTeam, { sport: 'NFL' }, 'fetchedAt'),
    countAndLatest((db as any).gameSchedule, { sportType: 'NFL', season }, 'updatedAt'),
    countAndLatest((db as any).depthChart, { sport: 'NFL' }, 'fetchedAt'),
    countAndLatest(
      (db as any).playerSeasonStats,
      { sport: 'NFL', season: seasonString, seasonType: 'regular' },
      'fetchedAt',
    ),
    maxField(
      countAndLatest((db as any).sportsInjury, { sport: 'NFL' }, 'fetchedAt'),
      countAndLatest((db as any).injuryReportRecord, { sport: 'NFL' }, 'reportDate'),
    ),
    maxField(
      countAndLatest((db as any).fantasyProjection, weeklyWhere, 'fetchedAt'),
      countAndLatest((db as any).aFProjectionSnapshot, afWeeklyWhere, 'computedAt'),
    ),
    countAndLatest((db as any).aFProjectionSnapshot, { sport: 'NFL', season, week: null }, 'computedAt'),
    maxField(
      countAndLatest((db as any).sportsPlayerRecord, { sport: 'NFL', dynastyValue: { not: null } }, 'lastUpdated'),
      countAndLatest((db as any).sportsDataCache, { cacheKey: { contains: 'fantasycalc' } }, 'createdAt'),
    ),
  ])

  const missingFields: string[] = []
  const staleFields: string[] = []
  const lastFetchedAt: Record<string, string | null> = {}
  const counts: Record<string, number> = {}
  const hasPlayers = pushState({
    key: 'players',
    label: 'players',
    field: { ...players, staleAfterHours: STALE_HOURS.players },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasTeams = pushState({
    key: 'teams',
    label: 'teams',
    field: { ...teams, staleAfterHours: STALE_HOURS.teams },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasSchedule = pushState({
    key: 'schedule',
    label: 'schedule',
    field: { ...schedule, staleAfterHours: STALE_HOURS.schedule },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasDepthCharts = pushState({
    key: 'depthCharts',
    label: 'depth charts',
    field: { ...depthCharts, staleAfterHours: STALE_HOURS.depthCharts },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasSeasonStats = pushState({
    key: 'seasonStats',
    label: 'season stats',
    field: { ...seasonStats, staleAfterHours: STALE_HOURS.seasonStats },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasInjuries = pushState({
    key: 'injuries',
    label: 'injuries',
    field: { ...injuries, staleAfterHours: STALE_HOURS.injuries },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasWeeklyProjections = pushState({
    key: 'weeklyProjections',
    label: 'weekly projections',
    field: { ...weeklyProjections, staleAfterHours: STALE_HOURS.weeklyProjections },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasRosProjections = pushState({
    key: 'rosProjections',
    label: 'ROS projections',
    field: { ...rosProjections, staleAfterHours: STALE_HOURS.rosProjections },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })
  const hasTradeValues = pushState({
    key: 'tradeValues',
    label: 'trade values',
    field: { ...tradeValues, staleAfterHours: STALE_HOURS.tradeValues },
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    now,
  })

  return {
    sport: 'NFL',
    season,
    week,
    hasPlayers,
    hasTeams,
    hasSchedule,
    hasDepthCharts,
    hasSeasonStats,
    hasInjuries,
    hasWeeklyProjections,
    hasRosProjections,
    hasTradeValues,
    missingFields,
    staleFields,
    lastFetchedAt,
    counts,
    generatedAt: now.toISOString(),
  }
}
