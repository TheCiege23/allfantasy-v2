/**
 * Strategy Meta Engine (PROMPT 136).
 * Analyzes fantasy strategy trends across leagues.
 * Detects: draft strategy shifts, position value changes, waiver strategy trends.
 * Data sources: league data warehouse, draft logs, trade history.
 */
import { prisma } from '@/lib/prisma'
import { getPositionCountsFromRoster } from '@/lib/strategy-meta/RosterCompositionAnalyzer'
import { getStrategyLabelForSport } from '@/lib/strategy-meta/SportStrategyResolver'
import { detectStrategies, toLeagueFormat } from '@/lib/strategy-meta/StrategyPatternAnalyzer'
import { getStrategyMetaReports } from '@/lib/strategy-meta/StrategyReportService'
import type { StrategyType } from '@/lib/strategy-meta/types'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  DraftStrategyShift,
  MetaAnalysisMode,
  MetaAnalysisOptions,
  MetaAnalysisResult,
  MetaInsightHeadline,
  MetaOverviewCard,
  MetaSourceCoverage,
  MetaTrendDirection,
  PositionValueChange,
  WaiverStrategyTrend,
} from './types'

const DEFAULT_WINDOW_DAYS = 30

const EARLY_ROUND_LIMIT_BY_SPORT: Record<string, number> = {
  NFL: 4,
  NCAAF: 4,
  NBA: 3,
  NCAAB: 3,
  MLB: 5,
  NHL: 4,
  SOCCER: 3,
}

const STREAMING_POSITIONS_BY_SPORT: Record<string, string[]> = {
  NFL: ['DST', 'K', 'TE'],
  NCAAF: ['DST', 'K', 'TE'],
  NBA: ['C'],
  NCAAB: ['C'],
  MLB: ['P', 'SP', 'RP', 'C'],
  NHL: ['G', 'D'],
  SOCCER: ['GKP', 'DEF'],
}

const SPORT_POSITION_ALIASES: Record<string, Record<string, string>> = {
  NFL: { HB: 'RB', FB: 'RB', PK: 'K', DEF: 'DST', D: 'DST' },
  NCAAF: { HB: 'RB', FB: 'RB', PK: 'K', DEF: 'DST', D: 'DST' },
  NBA: { G: 'PG', F: 'SF', UTIL: 'SF' },
  NCAAB: { G: 'PG', F: 'SF', UTIL: 'SF' },
  MLB: { SP: 'P', RP: 'P' },
  NHL: {},
  SOCCER: { GK: 'GKP', G: 'GKP', MIDFIELDER: 'MID', M: 'MID', F: 'FWD', FW: 'FWD', FORWARD: 'FWD', D: 'DEF' },
}

interface DraftFactRow {
  leagueId: string
  sport: string
  round: number
  pickNumber: number
  playerId: string
  managerId: string | null
  season: number | null
  createdAt: Date
}

interface DraftPeriodSelection {
  analysisMode: MetaAnalysisMode
  recentRows: DraftFactRow[]
  priorRows: DraftFactRow[]
  allRows: DraftFactRow[]
}

interface LeagueContext {
  sport: string
  leagueFormat: string
  leagueSize: number | null
  season: number | null
}

interface StandingContext {
  wins: number
  losses: number
  ties: number
  rank: number | null
  pointsFor: number
}

interface StrategyTeamSample {
  sport: string
  leagueFormat: string
  strategyType: string
  confidence: number
  signals: string[]
  successScore: number | null
  earlyRoundFocus: string[]
}

interface StrategyPeriodMetric {
  sport: string
  leagueFormat: string
  strategyType: string
  usageRate: number
  successRate: number
  sampleSize: number
  confidence: number
  earlyRoundFocus: string[]
  supportingSignals: string[]
}

interface PositionInsightAggregate {
  sampleSize: number
  avgValueGiven: number | null
  avgValueReceived: number | null
  marketTrend: string | null
  confidenceScore: number | null
}

interface DraftShiftBuildInput {
  strategyType: string
  strategyLabel: string
  sport: string
  leagueFormat: string
  usageRate: number
  successRate: number
  sampleSize: number
  recentUsageRate: number
  baselineUsageRate: number
  recentSuccessRate: number
  baselineSuccessRate: number | null
  earlyRoundFocus: string[]
  supportingSignals: string[]
  reportDirection?: string | null
  confidence: number
}

interface PositionValueBuildInput {
  position: string
  sport: string
  avgValueGiven: number | null
  avgValueReceived: number | null
  sampleSize: number
  marketTrend: string | null
  draftShare: number
  priorDraftShare: number | null
  rosterPressure: number
  tradeDemandScore: number
  usageRate: number
  confidence: number
  preferredDirection?: string | null
}

interface WaiverTrendBuildInput {
  sport: string
  addCount: number
  dropCount: number
  windowDays: number
  primaryPosition: string | null
  topAddPositions: string[]
  faabAggression: number | null
  churnRate: number
  streamingScore: number
  priorNetRate: number
  currentNetRate: number
  confidence: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, digits: number = 2): number {
  return Number(value.toFixed(digits))
}

function average(values: Array<number | null | undefined>, digits: number = 2): number | null {
  const usable = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (usable.length === 0) return null
  return roundTo(usable.reduce((sum, value) => sum + value, 0) / usable.length, digits)
}

function safeNormalizeSport(value: string | null | undefined): string | null {
  if (!value) return null
  const compact = value.trim().toUpperCase().replace(/[\s-]/g, '')
  const aliasMap: Record<string, string> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAAB',
    NCAAM: 'NCAAB',
    NCAABASKETBALL: 'NCAAB',
    NCAAF: 'NCAAF',
    NCAAFOOTBALL: 'NCAAF',
    SOCCER: 'SOCCER',
    EPL: 'SOCCER',
  }
  const normalized = aliasMap[compact] ?? compact
  return (SUPPORTED_SPORTS as readonly string[]).includes(normalized) ? normalized : null
}

function normalizePosition(sport: string, rawPosition: string | null | undefined): string | null {
  if (!rawPosition) return null
  const cleaned = rawPosition.trim().toUpperCase()
  if (!cleaned) return null
  const first = cleaned.split('/')[0]
  return SPORT_POSITION_ALIASES[sport]?.[first] ?? first
}

function getEarlyRoundLimit(sport: string): number {
  return EARLY_ROUND_LIMIT_BY_SPORT[sport] ?? 4
}

function extractIdsFromUnknown(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') return entry
        if (entry && typeof entry === 'object' && 'id' in (entry as Record<string, unknown>)) {
          const id = (entry as Record<string, unknown>).id
          return typeof id === 'string' ? id : null
        }
        return null
      })
      .filter((entry): entry is string => Boolean(entry))
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) => extractIdsFromUnknown(entry))
  }
  return []
}

function parseTradePositions(raw: unknown, sport: string): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const position = (entry as Record<string, unknown>).position
      return typeof position === 'string' ? normalizePosition(sport, position) : null
    })
    .filter((entry): entry is string => Boolean(entry))
}

function formatPct(value: number, digits: number = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}

function formatSignedPct(value: number, digits: number = 1): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`
}

function computeSuccessScore(
  standing: StandingContext | undefined,
  leagueSize: number | null,
  maxPointsFor: number
): number | null {
  if (!standing) return null
  const gamesPlayed = standing.wins + standing.losses + standing.ties
  const winPct = gamesPlayed > 0 ? (standing.wins + standing.ties * 0.5) / gamesPlayed : null
  const rankScore =
    standing.rank != null && leagueSize != null && leagueSize > 1
      ? 1 - (standing.rank - 1) / (leagueSize - 1)
      : null
  const pointsScore = maxPointsFor > 0 ? standing.pointsFor / maxPointsFor : null
  const parts = [winPct, rankScore, pointsScore].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )
  if (parts.length === 0) return null
  return roundTo(parts.reduce((sum, value) => sum + value, 0) / parts.length, 3)
}

function determineDirection(
  delta: number,
  fallback: string | null | undefined,
  positiveThreshold: number,
  negativeThreshold: number
): MetaTrendDirection {
  if (delta >= positiveThreshold) return 'Rising'
  if (delta <= negativeThreshold) return 'Falling'
  if (fallback === 'Rising' || fallback === 'Falling' || fallback === 'Stable') return fallback
  return 'Stable'
}

function sortCountMap(counts: Map<string, number>): string[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function buildDraftStrategyShift(input: DraftShiftBuildInput): DraftStrategyShift {
  const usageDelta = roundTo(input.recentUsageRate - input.baselineUsageRate, 3)
  const successDelta =
    input.baselineSuccessRate != null
      ? roundTo(input.recentSuccessRate - input.baselineSuccessRate, 3)
      : null
  const trendingDirection = determineDirection(
    usageDelta + (successDelta ?? 0) * 0.6,
    input.reportDirection,
    0.02,
    -0.02
  )
  const shiftLabel =
    trendingDirection === 'Rising'
      ? input.earlyRoundFocus.length > 0
        ? `${input.earlyRoundFocus.join('/')} priority rising`
        : 'Adoption climbing'
      : trendingDirection === 'Falling'
        ? 'Adoption cooling'
        : 'Holding stable'
  const signalStrength = roundTo(
    clamp(
      input.recentUsageRate * 48 +
        Math.max(0, input.recentSuccessRate - 0.5) * 75 +
        Math.abs(usageDelta) * 220 +
        Math.abs(successDelta ?? 0) * 90 +
        input.confidence * 18,
      0,
      100
    ),
    1
  )
  const summary =
    trendingDirection === 'Rising'
      ? `${input.strategyLabel} is gaining share at ${formatPct(input.recentUsageRate)} with ${formatSignedPct(usageDelta)} adoption change and ${input.earlyRoundFocus.join(', ') || 'balanced'} early-round pressure.`
      : trendingDirection === 'Falling'
        ? `${input.strategyLabel} is losing ground with ${formatSignedPct(usageDelta)} adoption movement and softer success support.`
        : `${input.strategyLabel} remains stable around ${formatPct(input.recentUsageRate)} usage with limited movement versus the baseline.`

  return {
    strategyType: input.strategyType,
    strategyLabel: input.strategyLabel,
    sport: input.sport,
    leagueFormat: input.leagueFormat,
    usageRate: input.usageRate,
    successRate: input.successRate,
    trendingDirection,
    sampleSize: input.sampleSize,
    shiftLabel,
    recentUsageRate: input.recentUsageRate,
    baselineUsageRate: input.baselineUsageRate,
    usageDelta,
    recentSuccessRate: input.recentSuccessRate,
    baselineSuccessRate: input.baselineSuccessRate,
    successDelta,
    earlyRoundFocus: input.earlyRoundFocus,
    supportingSignals: input.supportingSignals,
    signalStrength,
    confidence: roundTo(clamp(input.confidence, 0.3, 0.98), 2),
    summary,
  }
}

export function buildPositionValueChange(input: PositionValueBuildInput): PositionValueChange {
  const draftShareDelta =
    input.priorDraftShare != null ? roundTo(input.draftShare - input.priorDraftShare, 3) : null
  const valueEdge =
    input.avgValueReceived != null && input.avgValueGiven != null
      ? roundTo(input.avgValueReceived - input.avgValueGiven, 2)
      : 0
  const valueScore = roundTo(
    clamp(
      (draftShareDelta ?? 0) * 180 +
        input.rosterPressure * 30 +
        input.usageRate * 18 +
        input.tradeDemandScore * 0.65 +
        valueEdge * 4,
      -100,
      100
    ),
    1
  )
  const direction = determineDirection(
    valueScore / 100,
    input.preferredDirection ?? input.marketTrend,
    0.08,
    -0.08
  )
  const summary =
    direction === 'Rising'
      ? `${input.position} is gaining value through ${formatPct(input.draftShare)} draft share, ${roundTo(input.tradeDemandScore, 1)} trade-demand signal, and ${formatPct(input.rosterPressure)} roster pressure.`
      : direction === 'Falling'
        ? `${input.position} is fading relative to the baseline, with weaker draft share and trade demand support.`
        : `${input.position} is holding steady, with the market split between trade demand and roster pressure.`

  return {
    position: input.position,
    sport: input.sport,
    avgValueGiven: input.avgValueGiven,
    avgValueReceived: input.avgValueReceived,
    sampleSize: input.sampleSize,
    marketTrend: input.marketTrend,
    direction,
    draftShare: roundTo(input.draftShare, 3),
    priorDraftShare: input.priorDraftShare != null ? roundTo(input.priorDraftShare, 3) : null,
    draftShareDelta,
    rosterPressure: roundTo(input.rosterPressure, 3),
    tradeDemandScore: roundTo(input.tradeDemandScore, 1),
    valueScore,
    confidence: roundTo(clamp(input.confidence, 0.3, 0.98), 2),
    summary,
  }
}

export function buildWaiverStrategyTrend(input: WaiverTrendBuildInput): WaiverStrategyTrend {
  const netAdds = input.addCount - input.dropCount
  const addRatePerDay = roundTo(input.addCount / Math.max(input.windowDays, 1), 2)
  const dropRatePerDay = roundTo(input.dropCount / Math.max(input.windowDays, 1), 2)
  const movementDelta = input.currentNetRate - input.priorNetRate
  const trendDirection = determineDirection(movementDelta, null, 0.3, -0.3)
  const summary =
    trendDirection === 'Rising'
      ? `${input.sport} waiver activity is leaning into ${input.primaryPosition ?? 'multi-position'} adds, with ${netAdds} net adds and a streaming score of ${roundTo(input.streamingScore, 0)}.`
      : trendDirection === 'Falling'
        ? `${input.sport} waiver churn is cooling, with fewer net adds and a lower urgency profile than the previous window.`
        : `${input.sport} waiver behavior is steady, with ${input.topAddPositions.slice(0, 2).join(', ') || 'mixed'} leading the add queue.`

  return {
    sport: input.sport,
    addCount: input.addCount,
    dropCount: input.dropCount,
    windowDays: input.windowDays,
    netAdds,
    addRatePerDay,
    dropRatePerDay,
    primaryPosition: input.primaryPosition,
    topAddPositions: input.topAddPositions,
    faabAggression: input.faabAggression != null ? roundTo(input.faabAggression, 1) : null,
    churnRate: roundTo(input.churnRate, 2),
    streamingScore: roundTo(input.streamingScore, 1),
    trendDirection,
    confidence: roundTo(clamp(input.confidence, 0.3, 0.98), 2),
    summary,
  }
}

async function loadDraftFactsForAnalysis(
  sport?: string,
  windowDays: number = DEFAULT_WINDOW_DAYS
): Promise<DraftPeriodSelection> {
  const recentSince = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const priorSince = new Date(Date.now() - windowDays * 2 * 24 * 60 * 60 * 1000)
  const sportWhere = sport ? { sport } : {}

  const recentWindowRows = await prisma.draftFact.findMany({
    where: {
      ...sportWhere,
      createdAt: { gte: priorSince },
    },
    select: {
      leagueId: true,
      sport: true,
      round: true,
      pickNumber: true,
      playerId: true,
      managerId: true,
      season: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { round: 'asc' }, { pickNumber: 'asc' }],
  })

  const recentRows = recentWindowRows.filter((row) => row.createdAt >= recentSince)
  const priorRows = recentWindowRows.filter((row) => row.createdAt < recentSince)
  if (recentRows.length >= 40 && priorRows.length >= 40) {
    return {
      analysisMode: 'time_window',
      recentRows,
      priorRows,
      allRows: recentWindowRows,
    }
  }

  const fallbackRows = await prisma.draftFact.findMany({
    where: {
      ...sportWhere,
      season: { not: null },
    },
    select: {
      leagueId: true,
      sport: true,
      round: true,
      pickNumber: true,
      playerId: true,
      managerId: true,
      season: true,
      createdAt: true,
    },
    orderBy: [{ season: 'desc' }, { round: 'asc' }, { pickNumber: 'asc' }],
    take: 8000,
  })

  const seasons = [...new Set(
    fallbackRows
      .map((row) => row.season)
      .filter((season): season is number => typeof season === 'number')
  )].sort((a, b) => b - a)
  const recentSeason = seasons[0]
  const priorSeason = seasons[1]

  return {
    analysisMode: priorSeason != null ? 'season_compare' : 'mixed',
    recentRows:
      recentSeason != null
        ? fallbackRows.filter((row) => row.season === recentSeason)
        : recentRows,
    priorRows:
      priorSeason != null
        ? fallbackRows.filter((row) => row.season === priorSeason)
        : priorRows,
    allRows: fallbackRows.length > 0 ? fallbackRows : recentWindowRows,
  }
}

function buildLeagueContextMap(rows: Array<{
  id: string
  sport: string
  leagueSize: number | null
  season: number | null
  isDynasty: boolean
  settings: unknown
}>): Map<string, LeagueContext> {
  const map = new Map<string, LeagueContext>()
  for (const row of rows) {
    const settings = (row.settings as Record<string, unknown> | null) ?? {}
    const isSuperFlex = Boolean(settings.is_superflex)
    const sport = safeNormalizeSport(row.sport) ?? 'NFL'
    map.set(row.id, {
      sport,
      leagueFormat: toLeagueFormat({
        isDynasty: row.isDynasty,
        isSuperFlex,
      }),
      leagueSize: row.leagueSize ?? null,
      season: row.season ?? null,
    })
  }
  return map
}

function buildStandingContextMaps(rows: Array<{
  leagueId: string
  season: number
  teamId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  rank: number | null
}>): {
  standingMap: Map<string, StandingContext>
  leagueSizeMap: Map<string, number>
  maxPointsForMap: Map<string, number>
} {
  const standingMap = new Map<string, StandingContext>()
  const leagueSizeMap = new Map<string, number>()
  const maxPointsForMap = new Map<string, number>()

  for (const row of rows) {
    const leagueSeasonKey = `${row.leagueId}:${row.season}`
    standingMap.set(`${leagueSeasonKey}:${row.teamId}`, {
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      rank: row.rank ?? null,
      pointsFor: row.pointsFor,
    })
    leagueSizeMap.set(leagueSeasonKey, (leagueSizeMap.get(leagueSeasonKey) ?? 0) + 1)
    maxPointsForMap.set(
      leagueSeasonKey,
      Math.max(maxPointsForMap.get(leagueSeasonKey) ?? 0, row.pointsFor)
    )
  }

  return {
    standingMap,
    leagueSizeMap,
    maxPointsForMap,
  }
}

function buildLatestSnapshotMap(rows: Array<{
  leagueId: string
  teamId: string
  season: number | null
  weekOrPeriod: number
  rosterPlayers: unknown
  lineupPlayers: unknown
  benchPlayers: unknown
}>): Map<string, typeof rows[number]> {
  const map = new Map<string, typeof rows[number]>()
  for (const row of rows) {
    const key = `${row.leagueId}:${row.season ?? 0}:${row.teamId}`
    if (!map.has(key)) map.set(key, row)
  }
  return map
}

function buildTeamStrategySamples(args: {
  rows: DraftFactRow[]
  leagueContextMap: Map<string, LeagueContext>
  latestSnapshotMap: Map<string, {
    leagueId: string
    teamId: string
    season: number | null
    weekOrPeriod: number
    rosterPlayers: unknown
    lineupPlayers: unknown
    benchPlayers: unknown
  }>
  standingMap: Map<string, StandingContext>
  leagueSizeMap: Map<string, number>
  maxPointsForMap: Map<string, number>
  playerPositionMap: Map<string, string | null>
  leagueFormatFilter?: string
}): StrategyTeamSample[] {
  const byTeam = new Map<string, DraftFactRow[]>()
  for (const row of args.rows) {
    if (!row.managerId) continue
    const season = row.season ?? args.leagueContextMap.get(row.leagueId)?.season ?? 0
    const key = `${row.leagueId}:${season}:${row.managerId}`
    const list = byTeam.get(key) ?? []
    list.push(row)
    byTeam.set(key, list)
  }

  const samples: StrategyTeamSample[] = []
  for (const [, draftRows] of byTeam.entries()) {
    const first = draftRows[0]
    const season = first.season ?? args.leagueContextMap.get(first.leagueId)?.season ?? 0
    const leagueContext = args.leagueContextMap.get(first.leagueId)
    const sport = leagueContext?.sport ?? safeNormalizeSport(first.sport) ?? 'NFL'
    const leagueFormat = leagueContext?.leagueFormat ?? 'unknown'
    if (args.leagueFormatFilter && args.leagueFormatFilter !== leagueFormat) continue

    const picks = [...draftRows]
      .sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round
        return a.pickNumber - b.pickNumber
      })
      .map((row) => ({
        round: row.round,
        pickNo: row.pickNumber,
        rosterId: Number.parseInt(row.managerId ?? '0', 10) || 0,
        playerId: row.playerId,
        position: normalizePosition(sport, args.playerPositionMap.get(row.playerId) ?? null),
      }))

    const snapshot = args.latestSnapshotMap.get(`${first.leagueId}:${season}:${first.managerId}`)
    const rosterIds = snapshot
      ? uniqueStrings([
          ...extractIdsFromUnknown(snapshot.rosterPlayers),
          ...extractIdsFromUnknown(snapshot.lineupPlayers),
          ...extractIdsFromUnknown(snapshot.benchPlayers),
        ])
      : []
    const rosterPlayers = rosterIds
      .map((playerId) => ({
        position: normalizePosition(sport, args.playerPositionMap.get(playerId) ?? null) ?? undefined,
      }))
      .filter((player) => Boolean(player.position))
    const rosterPositions =
      rosterPlayers.length > 0
        ? getPositionCountsFromRoster(rosterPlayers)
        : picks.reduce<Record<string, number>>((acc, pick) => {
            const position = pick.position ?? 'UNK'
            acc[position] = (acc[position] ?? 0) + 1
            return acc
          }, {})

    const detected = detectStrategies({
      sport: sport as Parameters<typeof detectStrategies>[0]['sport'],
      leagueFormat: leagueFormat as Parameters<typeof detectStrategies>[0]['leagueFormat'],
      draftPicks: picks,
      rosterPositions,
    })

    const standingKey = `${first.leagueId}:${season}:${first.managerId}`
    const successScore = computeSuccessScore(
      args.standingMap.get(standingKey),
      leagueContext?.leagueSize ?? args.leagueSizeMap.get(`${first.leagueId}:${season}`) ?? null,
      args.maxPointsForMap.get(`${first.leagueId}:${season}`) ?? 0
    )
    const earlyRoundFocus = picks
      .filter((pick) => pick.round <= getEarlyRoundLimit(sport))
      .map((pick) => pick.position)
      .filter((position): position is string => Boolean(position))

    for (const strategy of detected) {
      samples.push({
        sport,
        leagueFormat,
        strategyType: strategy.strategyType,
        confidence: strategy.confidence,
        signals: strategy.signals,
        successScore,
        earlyRoundFocus,
      })
    }
  }

  return samples
}

function aggregateStrategyPeriodMetrics(samples: StrategyTeamSample[]): Map<string, StrategyPeriodMetric> {
  const byKey = new Map<
    string,
    {
      sport: string
      leagueFormat: string
      strategyType: string
      count: number
      successValues: number[]
      confidenceValues: number[]
      focusCounts: Map<string, number>
      signals: Map<string, number>
    }
  >()
  const teamsByScope = new Map<string, number>()
  for (const sample of samples) {
    const scopeKey = `${sample.sport}:${sample.leagueFormat}`
    teamsByScope.set(scopeKey, (teamsByScope.get(scopeKey) ?? 0) + 1)
    const key = `${scopeKey}:${sample.strategyType}`
    const existing =
      byKey.get(key) ?? {
        sport: sample.sport,
        leagueFormat: sample.leagueFormat,
        strategyType: sample.strategyType,
        count: 0,
        successValues: [],
        confidenceValues: [],
        focusCounts: new Map<string, number>(),
        signals: new Map<string, number>(),
      }
    existing.count += 1
    if (sample.successScore != null) existing.successValues.push(sample.successScore)
    existing.confidenceValues.push(sample.confidence)
    for (const focus of sample.earlyRoundFocus) {
      existing.focusCounts.set(focus, (existing.focusCounts.get(focus) ?? 0) + 1)
    }
    for (const signal of sample.signals) {
      existing.signals.set(signal, (existing.signals.get(signal) ?? 0) + 1)
    }
    byKey.set(key, existing)
  }

  const result = new Map<string, StrategyPeriodMetric>()
  for (const [key, value] of byKey.entries()) {
    const totalTeams = teamsByScope.get(`${value.sport}:${value.leagueFormat}`) ?? value.count
    result.set(key, {
      sport: value.sport,
      leagueFormat: value.leagueFormat,
      strategyType: value.strategyType,
      usageRate: roundTo(value.count / Math.max(totalTeams, 1), 3),
      successRate: average(value.successValues, 3) ?? 0.5,
      sampleSize: value.count,
      confidence: roundTo(
        clamp(
          (average(value.confidenceValues, 3) ?? 0.5) * 0.65 +
            clamp(value.count / Math.max(totalTeams, 1), 0, 1) * 0.35,
          0.35,
          0.96
        ),
        2
      ),
      earlyRoundFocus: sortCountMap(value.focusCounts).slice(0, 3),
      supportingSignals: sortCountMap(value.signals).slice(0, 3),
    })
  }
  return result
}

function computePositionSharesFromDraftFacts(
  rows: DraftFactRow[],
  playerPositionMap: Map<string, string | null>
): {
  shareByKey: Map<string, number>
  countByKey: Map<string, number>
} {
  const totalsBySport = new Map<string, number>()
  const countsByKey = new Map<string, number>()
  for (const row of rows) {
    const sport = safeNormalizeSport(row.sport) ?? 'NFL'
    if (row.round > getEarlyRoundLimit(sport)) continue
    const position = normalizePosition(sport, playerPositionMap.get(row.playerId) ?? null)
    if (!position) continue
    totalsBySport.set(sport, (totalsBySport.get(sport) ?? 0) + 1)
    const key = `${sport}:${position}`
    countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1)
  }
  const shares = new Map<string, number>()
  for (const [key, count] of countsByKey.entries()) {
    const sport = key.split(':')[0]
    shares.set(key, roundTo(count / Math.max(totalsBySport.get(sport) ?? 1, 1), 3))
  }
  return {
    shareByKey: shares,
    countByKey: countsByKey,
  }
}

function computeRosterPressureByPosition(args: {
  latestSnapshotMap: Map<string, {
    leagueId: string
    teamId: string
    season: number | null
    weekOrPeriod: number
    rosterPlayers: unknown
    lineupPlayers: unknown
    benchPlayers: unknown
  }>
  playerPositionMap: Map<string, string | null>
  leagueContextMap: Map<string, LeagueContext>
}): Map<string, number> {
  const totalsBySport = new Map<string, number>()
  const countsByKey = new Map<string, number>()
  for (const snapshot of args.latestSnapshotMap.values()) {
    const sport = args.leagueContextMap.get(snapshot.leagueId)?.sport ?? 'NFL'
    const playerIds = uniqueStrings([
      ...extractIdsFromUnknown(snapshot.rosterPlayers),
      ...extractIdsFromUnknown(snapshot.lineupPlayers),
      ...extractIdsFromUnknown(snapshot.benchPlayers),
    ])
    for (const playerId of playerIds) {
      const position = normalizePosition(sport, args.playerPositionMap.get(playerId) ?? null)
      if (!position) continue
      totalsBySport.set(sport, (totalsBySport.get(sport) ?? 0) + 1)
      const key = `${sport}:${position}`
      countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1)
    }
  }
  const result = new Map<string, number>()
  for (const [key, count] of countsByKey.entries()) {
    const sport = key.split(':')[0]
    result.set(key, roundTo(count / Math.max(totalsBySport.get(sport) ?? 1, 1), 3))
  }
  return result
}

function aggregateTradeInsightRows(rows: Array<{
  position: string | null
  sport: string | null
  sampleSize: number
  avgValueGiven: number | null
  avgValueReceived: number | null
  marketTrend: string | null
  confidenceScore: number | null
}>): Map<string, PositionInsightAggregate> {
  const totals = new Map<
    string,
    {
      sampleSize: number
      givenWeighted: number
      receivedWeighted: number
      givenWeight: number
      receivedWeight: number
      confidenceValues: number[]
      marketTrend: string | null
    }
  >()
  for (const row of rows) {
    const sport = safeNormalizeSport(row.sport) ?? null
    if (!sport) continue
    const position = normalizePosition(sport, row.position)
    if (!position) continue
    const key = `${sport}:${position}`
    const current =
      totals.get(key) ?? {
        sampleSize: 0,
        givenWeighted: 0,
        receivedWeighted: 0,
        givenWeight: 0,
        receivedWeight: 0,
        confidenceValues: [],
        marketTrend: row.marketTrend ?? null,
      }
    current.sampleSize += row.sampleSize ?? 0
    if (row.avgValueGiven != null) {
      const weight = Math.max(row.sampleSize, 1)
      current.givenWeighted += row.avgValueGiven * weight
      current.givenWeight += weight
    }
    if (row.avgValueReceived != null) {
      const weight = Math.max(row.sampleSize, 1)
      current.receivedWeighted += row.avgValueReceived * weight
      current.receivedWeight += weight
    }
    if (row.confidenceScore != null) current.confidenceValues.push(row.confidenceScore)
    if (row.marketTrend) current.marketTrend = row.marketTrend
    totals.set(key, current)
  }

  const result = new Map<string, PositionInsightAggregate>()
  for (const [key, value] of totals.entries()) {
    result.set(key, {
      sampleSize: value.sampleSize,
      avgValueGiven:
        value.givenWeight > 0 ? roundTo(value.givenWeighted / value.givenWeight, 2) : null,
      avgValueReceived:
        value.receivedWeight > 0 ? roundTo(value.receivedWeighted / value.receivedWeight, 2) : null,
      marketTrend: value.marketTrend ?? null,
      confidenceScore: average(value.confidenceValues, 2),
    })
  }
  return result
}

function computeTradeDemandShares(rows: Array<{
  sport: string
  playersReceived: unknown
}>): {
  shareByKey: Map<string, number>
  countByKey: Map<string, number>
} {
  const totalsBySport = new Map<string, number>()
  const countsByKey = new Map<string, number>()

  for (const row of rows) {
    const sport = safeNormalizeSport(row.sport) ?? null
    if (!sport) continue
    const positions = parseTradePositions(row.playersReceived, sport)
    for (const position of positions) {
      totalsBySport.set(sport, (totalsBySport.get(sport) ?? 0) + 1)
      const key = `${sport}:${position}`
      countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1)
    }
  }

  const shareByKey = new Map<string, number>()
  for (const [key, count] of countsByKey.entries()) {
    const sport = key.split(':')[0]
    shareByKey.set(key, roundTo(count / Math.max(totalsBySport.get(sport) ?? 1, 1), 3))
  }
  return { shareByKey, countByKey: countsByKey }
}

async function getDraftStrategyShifts(args: {
  sport?: string
  leagueFormat?: string
  draftPeriod: DraftPeriodSelection
}): Promise<{
  items: DraftStrategyShift[]
  sourceCoverage: Pick<MetaSourceCoverage, 'analysisMode' | 'strategyReportCount' | 'draftFactCount' | 'rosterSnapshotCount' | 'standingFactCount' | 'leaguesAnalyzed' | 'seasonsAnalyzed'>
  latestSnapshotMap: Map<string, {
    leagueId: string
    teamId: string
    season: number | null
    weekOrPeriod: number
    rosterPlayers: unknown
    lineupPlayers: unknown
    benchPlayers: unknown
  }>
  leagueContextMap: Map<string, LeagueContext>
  playerPositionMap: Map<string, string | null>
}> {
  const allDraftRows = args.draftPeriod.allRows
  const currentReports = await getStrategyMetaReports({
    sport: args.sport,
    leagueFormat: args.leagueFormat,
  })

  if (allDraftRows.length === 0 && currentReports.length === 0) {
    return {
      items: [],
      sourceCoverage: {
        analysisMode: args.draftPeriod.analysisMode,
        strategyReportCount: 0,
        draftFactCount: 0,
        rosterSnapshotCount: 0,
        standingFactCount: 0,
        leaguesAnalyzed: 0,
        seasonsAnalyzed: [],
      },
      latestSnapshotMap: new Map(),
      leagueContextMap: new Map(),
      playerPositionMap: new Map(),
    }
  }

  const leagueIds = uniqueStrings(allDraftRows.map((row) => row.leagueId))
  const seasons = [...new Set(
    allDraftRows
      .map((row) => row.season)
      .filter((season): season is number => typeof season === 'number')
  )].sort((a, b) => b - a)

  const [leagues, snapshots, standings] = await Promise.all([
    leagueIds.length > 0
      ? prisma.league.findMany({
          where: { id: { in: leagueIds } },
          select: {
            id: true,
            sport: true,
            leagueSize: true,
            season: true,
            isDynasty: true,
            settings: true,
          },
        })
      : Promise.resolve([]),
    leagueIds.length > 0
      ? prisma.rosterSnapshot.findMany({
          where: {
            leagueId: { in: leagueIds },
            ...(args.sport ? { sport: args.sport } : {}),
            ...(seasons.length > 0 ? { season: { in: seasons } } : {}),
          },
          select: {
            leagueId: true,
            teamId: true,
            season: true,
            weekOrPeriod: true,
            rosterPlayers: true,
            lineupPlayers: true,
            benchPlayers: true,
          },
          orderBy: [{ season: 'desc' }, { weekOrPeriod: 'desc' }],
        })
      : Promise.resolve([]),
    leagueIds.length > 0 && seasons.length > 0
      ? prisma.seasonStandingFact.findMany({
          where: {
            leagueId: { in: leagueIds },
            ...(args.sport ? { sport: args.sport } : {}),
            season: { in: seasons },
          },
          select: {
            leagueId: true,
            season: true,
            teamId: true,
            wins: true,
            losses: true,
            ties: true,
            pointsFor: true,
            rank: true,
          },
        })
      : Promise.resolve([]),
  ])

  const latestSnapshotMap = buildLatestSnapshotMap(snapshots)
  const leagueContextMap = buildLeagueContextMap(leagues)
  const { standingMap, leagueSizeMap, maxPointsForMap } = buildStandingContextMaps(standings)
  const playerIds = uniqueStrings([
    ...allDraftRows.map((row) => row.playerId),
    ...[...latestSnapshotMap.values()].flatMap((snapshot) => [
      ...extractIdsFromUnknown(snapshot.rosterPlayers),
      ...extractIdsFromUnknown(snapshot.lineupPlayers),
      ...extractIdsFromUnknown(snapshot.benchPlayers),
    ]),
  ])
  const players =
    playerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, position: true },
        })
      : []
  const playerPositionMap = new Map<string, string | null>(players.map((player) => [player.id, player.position]))

  const recentSamples = buildTeamStrategySamples({
    rows: args.draftPeriod.recentRows,
    leagueContextMap,
    latestSnapshotMap,
    standingMap,
    leagueSizeMap,
    maxPointsForMap,
    playerPositionMap,
    leagueFormatFilter: args.leagueFormat,
  })
  const priorSamples = buildTeamStrategySamples({
    rows: args.draftPeriod.priorRows,
    leagueContextMap,
    latestSnapshotMap,
    standingMap,
    leagueSizeMap,
    maxPointsForMap,
    playerPositionMap,
    leagueFormatFilter: args.leagueFormat,
  })
  const recentMetrics = aggregateStrategyPeriodMetrics(recentSamples)
  const priorMetrics = aggregateStrategyPeriodMetrics(priorSamples)
  const reportMap = new Map(
    currentReports.map((report) => [`${report.sport}:${report.leagueFormat}:${report.strategyType}`, report])
  )
  const metricKeys = new Set<string>([
    ...reportMap.keys(),
    ...recentMetrics.keys(),
    ...priorMetrics.keys(),
  ])

  const items = [...metricKeys]
    .map((key) => {
      const report = reportMap.get(key)
      const recentMetric = recentMetrics.get(key)
      const priorMetric = priorMetrics.get(key)
      const [sport, leagueFormat, strategyType] = key.split(':')
      if (args.sport && sport !== args.sport) return null
      if (args.leagueFormat && leagueFormat !== args.leagueFormat) return null

      const strategyLabel =
        report?.strategyLabel ??
        getStrategyLabelForSport(strategyType as StrategyType, sport as Parameters<typeof getStrategyLabelForSport>[1])
      const recentUsageRate = recentMetric?.usageRate ?? report?.usageRate ?? 0
      const baselineUsageRate =
        priorMetric?.usageRate ??
        clamp(
          recentUsageRate -
            (report?.trendingDirection === 'Rising'
              ? 0.03
              : report?.trendingDirection === 'Falling'
                ? -0.03
                : 0),
          0,
          1
        )
      const recentSuccessRate = recentMetric?.successRate ?? report?.successRate ?? 0.5
      const baselineSuccessRate = priorMetric?.successRate ?? null
      const confidence = recentMetric?.confidence ?? priorMetric?.confidence ?? 0.55

      return buildDraftStrategyShift({
        strategyType,
        strategyLabel,
        sport,
        leagueFormat,
        usageRate: report?.usageRate ?? recentUsageRate,
        successRate: report?.successRate ?? recentSuccessRate,
        sampleSize: report?.sampleSize ?? recentMetric?.sampleSize ?? priorMetric?.sampleSize ?? 0,
        recentUsageRate,
        baselineUsageRate,
        recentSuccessRate,
        baselineSuccessRate,
        earlyRoundFocus: recentMetric?.earlyRoundFocus ?? priorMetric?.earlyRoundFocus ?? [],
        supportingSignals: uniqueStrings([
          ...(recentMetric?.supportingSignals ?? []),
          ...(priorMetric?.supportingSignals ?? []),
        ]).slice(0, 4),
        reportDirection: report?.trendingDirection ?? null,
        confidence,
      })
    })
    .filter((item): item is DraftStrategyShift => Boolean(item))
    .sort((a, b) => {
      if (b.signalStrength !== a.signalStrength) return b.signalStrength - a.signalStrength
      return b.recentUsageRate - a.recentUsageRate
    })

  return {
    items,
    sourceCoverage: {
      analysisMode: args.draftPeriod.analysisMode,
      strategyReportCount: currentReports.length,
      draftFactCount: allDraftRows.length,
      rosterSnapshotCount: snapshots.length,
      standingFactCount: standings.length,
      leaguesAnalyzed: leagueIds.length,
      seasonsAnalyzed: seasons,
    },
    latestSnapshotMap,
    leagueContextMap,
    playerPositionMap,
  }
}

async function getPositionValueChanges(args: {
  sport?: string
  draftPeriod: DraftPeriodSelection
  latestSnapshotMap: Map<string, {
    leagueId: string
    teamId: string
    season: number | null
    weekOrPeriod: number
    rosterPlayers: unknown
    lineupPlayers: unknown
    benchPlayers: unknown
  }>
  leagueContextMap: Map<string, LeagueContext>
  playerPositionMap: Map<string, string | null>
  windowDays: number
}): Promise<{
  items: PositionValueChange[]
  tradeCount: number
  tradeInsightCount: number
}> {
  const recentSince = new Date(Date.now() - args.windowDays * 24 * 60 * 60 * 1000)
  const priorSince = new Date(Date.now() - args.windowDays * 2 * 24 * 60 * 60 * 1000)

  const [positionMetaRows, tradeInsightRows, tradeRows] = await Promise.all([
    prisma.positionMetaTrend.findMany({
      where: args.sport ? { sport: args.sport } : {},
      select: {
        position: true,
        sport: true,
        usageRate: true,
        draftRate: true,
        rosterRate: true,
        trendingDirection: true,
      },
    }),
    prisma.tradeLearningInsight.findMany({
      where: { position: { not: null } },
      select: {
        position: true,
        sport: true,
        sampleSize: true,
        avgValueGiven: true,
        avgValueReceived: true,
        marketTrend: true,
        confidenceScore: true,
      },
      take: 2000,
    }),
    prisma.leagueTrade.findMany({
      where: { createdAt: { gte: priorSince } },
      select: {
        sport: true,
        playersReceived: true,
        createdAt: true,
      },
      take: 4000,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const { shareByKey: recentDraftShares, countByKey: recentDraftCounts } =
    computePositionSharesFromDraftFacts(args.draftPeriod.recentRows, args.playerPositionMap)
  const { shareByKey: priorDraftShares } =
    computePositionSharesFromDraftFacts(args.draftPeriod.priorRows, args.playerPositionMap)
  const rosterPressureByKey = computeRosterPressureByPosition({
    latestSnapshotMap: args.latestSnapshotMap,
    playerPositionMap: args.playerPositionMap,
    leagueContextMap: args.leagueContextMap,
  })

  const normalizedTradeInsightRows = tradeInsightRows.filter((row) => {
    const sport = safeNormalizeSport(row.sport)
    return !args.sport || sport === args.sport
  })
  const tradeInsightByKey = aggregateTradeInsightRows(normalizedTradeInsightRows)
  const filteredTradeRows = tradeRows.filter((row) => {
    const sport = safeNormalizeSport(row.sport)
    return !args.sport || sport === args.sport
  })
  const { shareByKey: recentTradeDemand } = computeTradeDemandShares(
    filteredTradeRows.filter((row) => row.createdAt >= recentSince)
  )
  const { shareByKey: priorTradeDemand } = computeTradeDemandShares(
    filteredTradeRows.filter((row) => row.createdAt < recentSince)
  )

  const positionMetaByKey = new Map<string, (typeof positionMetaRows)[number]>()
  for (const row of positionMetaRows) {
    const sport = safeNormalizeSport(row.sport) ?? null
    const position = sport ? normalizePosition(sport, row.position) : null
    if (!sport || !position) continue
    positionMetaByKey.set(`${sport}:${position}`, row)
  }

  const keys = new Set<string>([
    ...positionMetaByKey.keys(),
    ...tradeInsightByKey.keys(),
    ...recentDraftShares.keys(),
    ...priorDraftShares.keys(),
    ...rosterPressureByKey.keys(),
    ...recentTradeDemand.keys(),
    ...priorTradeDemand.keys(),
  ])

  const items = [...keys]
    .map((key) => {
      const [sport, position] = key.split(':')
      if (args.sport && sport !== args.sport) return null
      const positionMeta = positionMetaByKey.get(key)
      const tradeInsight = tradeInsightByKey.get(key)
      const recentDraftShare = recentDraftShares.get(key) ?? positionMeta?.draftRate ?? 0
      const priorDraftShare = priorDraftShares.get(key) ?? null
      const rosterPressure = rosterPressureByKey.get(key) ?? positionMeta?.rosterRate ?? 0
      const usageRate = positionMeta?.usageRate ?? rosterPressure
      const tradeDemandScore = roundTo(
        ((recentTradeDemand.get(key) ?? 0) - (priorTradeDemand.get(key) ?? 0)) * 100 +
          (tradeInsight?.marketTrend === 'Rising'
            ? 8
            : tradeInsight?.marketTrend === 'Falling'
              ? -8
              : 0),
        1
      )
      const confidence = clamp(
        0.35 +
          (tradeInsight?.sampleSize ?? recentDraftCounts.get(key) ?? 0) / 250 * 0.35 +
          [
            positionMeta != null,
            tradeInsight != null,
            recentDraftShares.has(key),
            rosterPressureByKey.has(key),
          ].filter(Boolean).length /
            4 *
            0.3,
        0.35,
        0.96
      )

      return buildPositionValueChange({
        position,
        sport,
        avgValueGiven: tradeInsight?.avgValueGiven ?? null,
        avgValueReceived: tradeInsight?.avgValueReceived ?? null,
        sampleSize: (tradeInsight?.sampleSize ?? 0) + (recentDraftCounts.get(key) ?? 0),
        marketTrend: tradeInsight?.marketTrend ?? positionMeta?.trendingDirection ?? null,
        draftShare: recentDraftShare,
        priorDraftShare,
        rosterPressure,
        tradeDemandScore,
        usageRate,
        confidence,
        preferredDirection: positionMeta?.trendingDirection ?? null,
      })
    })
    .filter((item): item is PositionValueChange => Boolean(item))
    .sort((a, b) => Math.abs(b.valueScore) - Math.abs(a.valueScore))

  return {
    items,
    tradeCount: filteredTradeRows.length,
    tradeInsightCount: normalizedTradeInsightRows.length,
  }
}

async function getWaiverStrategyTrends(args: {
  sport?: string
  windowDays: number
}): Promise<{
  items: WaiverStrategyTrend[]
  waiverTransactionCount: number
  waiverClaimCount: number
  transactionFactCount: number
}> {
  const recentSince = new Date(Date.now() - args.windowDays * 24 * 60 * 60 * 1000)
  const priorSince = new Date(Date.now() - args.windowDays * 2 * 24 * 60 * 60 * 1000)

  const [waiverTransactions, waiverClaims, transactionFacts] = await Promise.all([
    prisma.waiverTransaction.findMany({
      where: { processedAt: { gte: priorSince } },
      select: {
        sportType: true,
        addPlayerId: true,
        dropPlayerId: true,
        faabSpent: true,
        processedAt: true,
      },
      take: 4000,
      orderBy: { processedAt: 'desc' },
    }),
    prisma.waiverClaim.findMany({
      where: { createdAt: { gte: priorSince } },
      select: {
        sportType: true,
        addPlayerId: true,
        dropPlayerId: true,
        faabBid: true,
        createdAt: true,
      },
      take: 4000,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transactionFact.groupBy({
      by: ['sport', 'type'],
      where: { createdAt: { gte: priorSince } },
      _count: { transactionId: true },
    }),
  ])

  const filteredTransactions = waiverTransactions.filter((row) => {
    const sport = safeNormalizeSport(row.sportType)
    return !args.sport || sport === args.sport
  })
  const filteredClaims = waiverClaims.filter((row) => {
    const sport = safeNormalizeSport(row.sportType)
    return !args.sport || sport === args.sport
  })
  const playerIds = uniqueStrings([
    ...filteredTransactions.flatMap((row) => [row.addPlayerId, row.dropPlayerId ?? '']),
    ...filteredClaims.flatMap((row) => [row.addPlayerId, row.dropPlayerId ?? '']),
  ])
  const players =
    playerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, sport: true, position: true },
        })
      : []
  const playerPositionMap = new Map<string, { sport: string; position: string | null }>(
    players.map((player) => [player.id, { sport: player.sport, position: player.position }])
  )

  const buildWindowAggregates = (
    rows: typeof filteredTransactions,
    claims: typeof filteredClaims
  ): Map<string, {
    addCount: number
    dropCount: number
    addPositionCounts: Map<string, number>
    faabValues: number[]
  }> => {
    const bySport = new Map<string, {
      addCount: number
      dropCount: number
      addPositionCounts: Map<string, number>
      faabValues: number[]
    }>()

    for (const row of rows) {
      const sport = safeNormalizeSport(row.sportType) ?? playerPositionMap.get(row.addPlayerId)?.sport ?? null
      if (!sport) continue
      const current =
        bySport.get(sport) ?? {
          addCount: 0,
          dropCount: 0,
          addPositionCounts: new Map<string, number>(),
          faabValues: [],
        }
      current.addCount += 1
      if (row.dropPlayerId) current.dropCount += 1
      const addPosition = normalizePosition(sport, playerPositionMap.get(row.addPlayerId)?.position ?? null)
      if (addPosition) {
        current.addPositionCounts.set(addPosition, (current.addPositionCounts.get(addPosition) ?? 0) + 1)
      }
      if (row.faabSpent != null) current.faabValues.push(row.faabSpent)
      bySport.set(sport, current)
    }

    for (const claim of claims) {
      const sport = safeNormalizeSport(claim.sportType) ?? playerPositionMap.get(claim.addPlayerId)?.sport ?? null
      if (!sport) continue
      const current =
        bySport.get(sport) ?? {
          addCount: 0,
          dropCount: 0,
          addPositionCounts: new Map<string, number>(),
          faabValues: [],
        }
      if (claim.faabBid != null) current.faabValues.push(claim.faabBid)
      bySport.set(sport, current)
    }

    return bySport
  }

  const recentAggregates = buildWindowAggregates(
    filteredTransactions.filter((row) => row.processedAt >= recentSince),
    filteredClaims.filter((row) => row.createdAt >= recentSince)
  )
  const priorAggregates = buildWindowAggregates(
    filteredTransactions.filter((row) => row.processedAt < recentSince),
    filteredClaims.filter((row) => row.createdAt < recentSince)
  )

  const warehouseCountsBySport = new Map<string, number>()
  for (const row of transactionFacts) {
    const sport = safeNormalizeSport(row.sport)
    if (!sport) continue
    if (args.sport && sport !== args.sport) continue
    if (!/waiver|add|drop/i.test(row.type)) continue
    warehouseCountsBySport.set(sport, (warehouseCountsBySport.get(sport) ?? 0) + row._count.transactionId)
  }

  const sports = new Set<string>([
    ...recentAggregates.keys(),
    ...priorAggregates.keys(),
    ...warehouseCountsBySport.keys(),
  ])
  const items = [...sports]
    .map((sport) => {
      const recent = recentAggregates.get(sport) ?? {
        addCount: 0,
        dropCount: 0,
        addPositionCounts: new Map<string, number>(),
        faabValues: [],
      }
      const prior = priorAggregates.get(sport) ?? {
        addCount: 0,
        dropCount: 0,
        addPositionCounts: new Map<string, number>(),
        faabValues: [],
      }
      const addCount = recent.addCount || warehouseCountsBySport.get(sport) || 0
      const dropCount = recent.dropCount
      const topAddPositions = sortCountMap(recent.addPositionCounts).slice(0, 3)
      const primaryPosition = topAddPositions[0] ?? null
      const concentration =
        addCount > 0 && primaryPosition
          ? (recent.addPositionCounts.get(primaryPosition) ?? 0) / addCount
          : 0
      const churnRate = dropCount / Math.max(addCount, 1)
      const specialistBonus = primaryPosition && STREAMING_POSITIONS_BY_SPORT[sport]?.includes(primaryPosition) ? 18 : 0
      const streamingScore = clamp(
        concentration * 45 + churnRate * 28 + specialistBonus + Math.min(18, addCount / Math.max(args.windowDays, 1) * 6),
        0,
        100
      )
      const currentNetRate = (addCount - dropCount) / Math.max(args.windowDays, 1)
      const priorNetRate = (prior.addCount - prior.dropCount) / Math.max(args.windowDays, 1)
      const confidence = clamp(
        0.35 +
          Math.min(1, (addCount + dropCount + recent.faabValues.length) / 30) * 0.4 +
          Math.min(1, (warehouseCountsBySport.get(sport) ?? 0) / 40) * 0.25,
        0.35,
        0.95
      )

      return buildWaiverStrategyTrend({
        sport,
        addCount,
        dropCount,
        windowDays: args.windowDays,
        primaryPosition,
        topAddPositions,
        faabAggression: average(recent.faabValues, 1),
        churnRate,
        streamingScore,
        priorNetRate,
        currentNetRate,
        confidence,
      })
    })
    .sort((a, b) => b.streamingScore - a.streamingScore)

  return {
    items,
    waiverTransactionCount: filteredTransactions.length,
    waiverClaimCount: filteredClaims.length,
    transactionFactCount: [...warehouseCountsBySport.values()].reduce((sum, value) => sum + value, 0),
  }
}

function buildOverviewCards(result: {
  draftStrategyShifts: DraftStrategyShift[]
  positionValueChanges: PositionValueChange[]
  waiverStrategyTrends: WaiverStrategyTrend[]
  sourceCoverage: MetaSourceCoverage
}): MetaOverviewCard[] {
  const topDraft = result.draftStrategyShifts[0]
  const topPosition = [...result.positionValueChanges].sort((a, b) => Math.abs(b.valueScore) - Math.abs(a.valueScore))[0]
  const topWaiver = result.waiverStrategyTrends[0]

  return [
    {
      id: 'draft-shift',
      label: 'Draft shift',
      value: topDraft?.strategyLabel ?? 'No signal',
      detail: topDraft ? `${formatPct(topDraft.recentUsageRate)} usage | ${formatSignedPct(topDraft.usageDelta)}` : 'Need more draft logs',
      tone: topDraft?.trendingDirection === 'Rising' ? 'positive' : topDraft?.trendingDirection === 'Falling' ? 'negative' : 'neutral',
    },
    {
      id: 'position-premium',
      label: 'Position premium',
      value: topPosition?.position ?? 'No signal',
      detail: topPosition ? `${topPosition.sport} | score ${topPosition.valueScore.toFixed(0)}` : 'Need more trade coverage',
      tone: (topPosition?.valueScore ?? 0) > 0 ? 'positive' : (topPosition?.valueScore ?? 0) < 0 ? 'negative' : 'neutral',
    },
    {
      id: 'waiver-behavior',
      label: 'Waiver behavior',
      value: topWaiver?.primaryPosition ?? (topWaiver?.sport ?? 'No signal'),
      detail: topWaiver ? `${topWaiver.sport} | streaming ${topWaiver.streamingScore.toFixed(0)}` : 'Need more waiver movement',
      tone: topWaiver?.trendDirection === 'Rising' ? 'positive' : topWaiver?.trendDirection === 'Falling' ? 'negative' : 'neutral',
    },
    {
      id: 'coverage',
      label: 'Source coverage',
      value: `${result.sourceCoverage.leaguesAnalyzed} leagues`,
      detail: `${result.sourceCoverage.draftFactCount} draft rows | ${result.sourceCoverage.tradeCount} trades | ${result.sourceCoverage.waiverTransactionCount} waivers`,
      tone: 'neutral',
    },
  ]
}

function buildHeadlines(result: {
  draftStrategyShifts: DraftStrategyShift[]
  positionValueChanges: PositionValueChange[]
  waiverStrategyTrends: WaiverStrategyTrend[]
}): MetaInsightHeadline[] {
  const headlines: MetaInsightHeadline[] = []
  if (result.draftStrategyShifts[0]) {
    headlines.push({
      id: `draft-${result.draftStrategyShifts[0].strategyType}`,
      category: 'draft',
      title: result.draftStrategyShifts[0].strategyLabel ?? result.draftStrategyShifts[0].strategyType,
      summary: result.draftStrategyShifts[0].summary,
      confidence: result.draftStrategyShifts[0].confidence,
    })
  }
  if (result.positionValueChanges[0]) {
    headlines.push({
      id: `position-${result.positionValueChanges[0].sport}-${result.positionValueChanges[0].position}`,
      category: 'position',
      title: `${result.positionValueChanges[0].sport} ${result.positionValueChanges[0].position} value`,
      summary: result.positionValueChanges[0].summary,
      confidence: result.positionValueChanges[0].confidence,
    })
  }
  if (result.waiverStrategyTrends[0]) {
    headlines.push({
      id: `waiver-${result.waiverStrategyTrends[0].sport}`,
      category: 'waiver',
      title: `${result.waiverStrategyTrends[0].sport} waiver trend`,
      summary: result.waiverStrategyTrends[0].summary,
      confidence: result.waiverStrategyTrends[0].confidence,
    })
  }
  return headlines
}

/**
 * Run full meta analysis: draft strategy shifts, position value changes, waiver strategy trends.
 */
export async function runMetaAnalysis(
  options: MetaAnalysisOptions = {}
): Promise<MetaAnalysisResult> {
  const sport =
    options.sport && (SUPPORTED_SPORTS as readonly string[]).includes(options.sport)
      ? options.sport
      : undefined
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS
  const draftPeriod = await loadDraftFactsForAnalysis(sport, windowDays)
  const draftResult = await getDraftStrategyShifts({
    sport,
    leagueFormat: options.leagueFormat,
    draftPeriod,
  })
  const [positionResult, waiverResult] = await Promise.all([
    getPositionValueChanges({
      sport,
      draftPeriod,
      latestSnapshotMap: draftResult.latestSnapshotMap,
      leagueContextMap: draftResult.leagueContextMap,
      playerPositionMap: draftResult.playerPositionMap,
      windowDays,
    }),
    getWaiverStrategyTrends({
      sport,
      windowDays,
    }),
  ])

  const sourceCoverage: MetaSourceCoverage = {
    analysisMode: draftResult.sourceCoverage.analysisMode === 'time_window' ? 'time_window' : 'mixed',
    windowDays,
    leaguesAnalyzed: draftResult.sourceCoverage.leaguesAnalyzed,
    seasonsAnalyzed: draftResult.sourceCoverage.seasonsAnalyzed,
    strategyReportCount: draftResult.sourceCoverage.strategyReportCount,
    draftFactCount: draftResult.sourceCoverage.draftFactCount,
    rosterSnapshotCount: draftResult.sourceCoverage.rosterSnapshotCount,
    standingFactCount: draftResult.sourceCoverage.standingFactCount,
    tradeCount: positionResult.tradeCount,
    tradeInsightCount: positionResult.tradeInsightCount,
    waiverTransactionCount: waiverResult.waiverTransactionCount,
    waiverClaimCount: waiverResult.waiverClaimCount,
    transactionFactCount: waiverResult.transactionFactCount,
  }

  const result: MetaAnalysisResult = {
    draftStrategyShifts: draftResult.items,
    positionValueChanges: positionResult.items,
    waiverStrategyTrends: waiverResult.items,
    overviewCards: [],
    headlines: [],
    sourceCoverage,
    sport: sport ?? null,
    generatedAt: new Date().toISOString(),
  }
  result.overviewCards = buildOverviewCards(result)
  result.headlines = buildHeadlines(result)
  return result
}

/**
 * Supported sports for meta analysis (from sport-scope).
 */
export function getMetaAnalysisSupportedSports(): readonly string[] {
  return SUPPORTED_SPORTS
}
