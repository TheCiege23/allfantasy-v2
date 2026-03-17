/**
 * Dynasty Intelligence Engine (PROMPT 137).
 * Calculates: age curve, market value trend, career trajectory.
 * Uses dynasty-tiers (getAgeCurveWithCliffs, getExpectedWindow) and player-trend for market signals.
 */
import { getAgeCurveWithCliffs, getExpectedWindow } from '@/lib/dynasty-tiers'
import { getPeakAgeRange } from '@/lib/dynasty-engine/SportDynastyResolver'
import { getPlayerTrend } from '@/lib/player-trend'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'
import type {
  AgeCurveResult,
  AgeCurvePoint,
  MarketValueTrend,
  CareerTrajectoryResult,
  CareerTrajectoryPoint,
  PlayerDynastyIntelligence,
  DynastyIntelligenceOptions,
} from './types'

const AGE_RANGE = { min: 21, max: 42 }

/**
 * Build age curve points for a position/sport (multiplier by age).
 */
export function getAgeCurve(sport: string, position: string): AgeCurveResult {
  const cfg = getPeakAgeRange(sport, position)
  const points: AgeCurvePoint[] = []
  for (let age = AGE_RANGE.min; age <= AGE_RANGE.max; age++) {
    const multiplier = getAgeCurveWithCliffs(position, age)
    let label: string | undefined
    if (age === cfg.peakStart) label = 'Peak start'
    if (age === cfg.peakEnd) label = 'Peak end'
    if (age === cfg.hardCliff) label = 'Cliff'
    points.push({ age, multiplier, label })
  }
  return {
    sport,
    position,
    points,
    peakAgeStart: cfg.peakStart,
    peakAgeEnd: cfg.peakEnd,
  }
}

/**
 * Market value trend from PlayerMetaTrend (waiver/trade/draft signals).
 */
export async function getMarketValueTrend(
  playerId: string,
  sport: string
): Promise<MarketValueTrend | null> {
  const row = await prisma.playerMetaTrend.findUnique({
    where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
  })
  if (!row) return null
  const delta =
    row.previousTrendScore != null && Number.isFinite(row.previousTrendScore)
      ? row.trendScore - row.previousTrendScore
      : null
  return {
    direction: row.trendingDirection as MarketValueTrend['direction'],
    trendScore: row.trendScore,
    scoreDelta: delta,
    usageChange: row.addRate - row.dropRate,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Career trajectory: projected value at year 0, 1, 2, 3, 5 using age curve and window.
 */
export function getCareerTrajectory(
  sport: string,
  position: string,
  age: number,
  baseValue: number
): CareerTrajectoryResult {
  const yearOffsets = [0, 1, 2, 3, 5]
  const points: CareerTrajectoryPoint[] = []
  for (const yearOffset of yearOffsets) {
    const futureAge = age + yearOffset
    const mult = getAgeCurveWithCliffs(position, futureAge)
    const window = getExpectedWindow(position, futureAge)
    points.push({
      yearOffset,
      projectedValue: Math.round(baseValue * mult),
      ageMultiplier: mult,
      windowYears: window,
    })
  }
  const windowNow = getExpectedWindow(position, age)
  return {
    sport,
    position,
    age,
    baseValue,
    points,
    expectedWindowYears: windowNow,
  }
}

/**
 * Full player dynasty intelligence: age curve (by position), optional market trend, optional career trajectory.
 */
export async function getPlayerDynastyIntelligence(
  options: DynastyIntelligenceOptions
): Promise<PlayerDynastyIntelligence> {
  const {
    sport,
    position: positionOpt,
    age,
    baseValue = 0,
    playerId,
  } = options
  const normalizedSport = (SUPPORTED_SPORTS as readonly string[]).includes(sport)
    ? sport
    : (SUPPORTED_SPORTS[0] as string)
  const position = (positionOpt ?? 'WR').toUpperCase()

  let displayName: string | null = null
  let resolvedPosition = position
  let resolvedAge = age ?? null
  let currentValue = baseValue

  if (playerId) {
    const player = await prisma.player.findFirst({
      where: { id: playerId, sport: normalizedSport },
      select: { name: true, position: true, birthYear: true },
    })
    if (player) {
      displayName = player.name ?? null
      if (player.position) resolvedPosition = player.position.toUpperCase()
      if (player.birthYear != null) {
        const thisYear = new Date().getFullYear()
        resolvedAge = thisYear - player.birthYear
      }
    }
  }

  const ageCurve = getAgeCurve(normalizedSport, resolvedPosition)
  const marketValueTrend = playerId
    ? await getMarketValueTrend(playerId, normalizedSport)
    : null
  const careerTrajectory =
    resolvedAge != null && (currentValue > 0 || baseValue > 0)
      ? getCareerTrajectory(
          normalizedSport,
          resolvedPosition,
          resolvedAge,
          currentValue || baseValue
        )
      : null

  if (playerId && currentValue === 0 && baseValue === 0) {
    const trend = await prisma.playerMetaTrend.findUnique({
      where: { uniq_player_meta_trend_player_sport: { playerId, sport: normalizedSport } },
      select: { trendScore: true },
    })
    if (trend) currentValue = Math.round(trend.trendScore * 100)
  }

  return {
    playerId,
    displayName,
    sport: normalizedSport,
    position: resolvedPosition,
    age: resolvedAge,
    currentValue: currentValue || baseValue,
    ageCurve,
    marketValueTrend,
    careerTrajectory,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * List positions that have age-curve logic (NFL-centric; other sports use generic).
 */
export function getDynastyIntelligenceSupportedSports(): readonly string[] {
  return SUPPORTED_SPORTS
}
