/**
 * AI memory / personalization — combines rollups + legacy AI tables.
 * Deterministic-first: returns nulls when DB unavailable; callers must fall back.
 */

import { prisma } from '@/lib/prisma'
import type { AiPlayerMarketMetric, AiLeagueTypeMetric, AiUserTendency } from '@prisma/client'

export type UserAiProfile = {
  legacy: Awaited<ReturnType<typeof prisma.aIUserProfile.findUnique>>
  tendencies: AiUserTendency | null
}

export type LeagueAiProfile = {
  context: Awaited<ReturnType<typeof prisma.aILeagueContext.findUnique>>
  metrics: AiLeagueTypeMetric | null
}

export type PlayerMarketSignal = {
  metrics: AiPlayerMarketMetric | null
  /** Human-readable bullets for prompts */
  notes: string[]
}

export type RecommendationContext = {
  userProfile: UserAiProfile | null
  leagueProfile: LeagueAiProfile | null
  marketState: { sport: string; season: number }
  playerSignals: Record<string, PlayerMarketSignal>
}

export async function getUserAiProfile(userId: string, sport?: string): Promise<UserAiProfile | null> {
  try {
    const [legacy, tendencies] = await Promise.all([
      prisma.aIUserProfile.findUnique({ where: { userId } }),
      prisma.aiUserTendency.findUnique({
        where: { userId_sport: { userId, sport: sport ?? '' } },
      }),
    ])
    if (!legacy && !tendencies) return null
    return { legacy, tendencies }
  } catch {
    return null
  }
}

export async function getLeagueAiProfile(
  leagueId: string,
  formatHint?: { leagueType?: string; scoringProfile?: string; sport?: string },
): Promise<LeagueAiProfile | null> {
  try {
    const ctx = await prisma.aILeagueContext.findUnique({ where: { leagueId } })
    const sport = formatHint?.sport ?? ctx?.sport ?? 'NFL'
    const leagueType = formatHint?.leagueType ?? ctx?.format ?? 'redraft'
    const scoringProfile = formatHint?.scoringProfile ?? ''
    const metrics = await prisma.aiLeagueTypeMetric.findUnique({
      where: {
        sport_leagueType_scoringProfile: { sport, leagueType, scoringProfile },
      },
    })
    if (!ctx && !metrics) return null
    return { context: ctx, metrics }
  } catch {
    return null
  }
}

export async function getPlayerMarketSignal(
  playerId: string,
  sport: string,
  season: number,
): Promise<PlayerMarketSignal> {
  try {
    const metrics = await prisma.aiPlayerMarketMetric.findUnique({
      where: { playerId_sport_season: { playerId, sport, season } },
    })
    const notes: string[] = []
    if (metrics?.adpAvg != null) notes.push(`Platform ADP roll-up ~${metrics.adpAvg.toFixed(1)}`)
    if (metrics?.volatilityScore != null && metrics.volatilityScore > 40) {
      notes.push('Elevated draft volatility vs platform average for this asset')
    }
    if (metrics?.adpTrend7d != null && metrics.adpTrend7d < -0.05) {
      notes.push('ADP rising (earlier picks) over last 7d window in sampled events')
    }
    return { metrics, notes }
  } catch {
    return { metrics: null, notes: [] }
  }
}

export async function getRecommendationContext(params: {
  userId?: string | null
  leagueId?: string | null
  sport: string
  season: number
  playerIds?: string[]
  leagueType?: string
  scoringProfile?: string
}): Promise<RecommendationContext> {
  const { userId, leagueId, sport, season, playerIds = [], leagueType, scoringProfile } = params
  const playerSignals: Record<string, PlayerMarketSignal> = {}

  const [userProfile, leagueProfile] = await Promise.all([
    userId ? getUserAiProfile(userId, sport) : Promise.resolve(null),
    leagueId
      ? getLeagueAiProfile(leagueId, { sport, leagueType, scoringProfile })
      : Promise.resolve(null),
  ])

  for (const pid of playerIds.slice(0, 24)) {
    playerSignals[pid] = await getPlayerMarketSignal(pid, sport, season)
  }

  return {
    userProfile,
    leagueProfile,
    marketState: { sport, season },
    playerSignals,
  }
}
