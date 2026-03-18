/**
 * Multi-sport matchup scoring: compute roster fantasy points from player game stats and league scoring rules.
 * Used by live scoring and matchup engine; compatible with WeeklyMatchup and TeamPerformance.
 */
import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveScoringRulesForLeague, type LeagueSettingsForScoring } from './MultiSportScoringResolver'
import { computeFantasyPoints } from '@/lib/scoring-defaults/FantasyPointCalculator'
import type { PlayerStatsRecord } from '@/lib/scoring-defaults/types'
import type { ScoringRuleDto } from './ScoringTemplateResolver'

export interface RosterScoreInput {
  leagueId: string
  leagueSport: LeagueSport
  season: number
  weekOrRound: number
  /** Player IDs that are in the roster lineup (starters + bench; only starters count if you pass starterIds). */
  rosterPlayerIds: string[]
  /** If set, only sum points for these IDs (e.g. starters only). Otherwise sum all rosterPlayerIds. */
  starterPlayerIds?: string[]
  formatType?: string
  /** Optional league settings (e.g. from getLeagueSettingsForScoring) for IDP scoring preset resolution. */
  leagueSettings?: LeagueSettingsForScoring | null
}

export interface RosterScoreResult {
  totalPoints: number
  byPlayerId: Record<string, number>
  usedPlayerIds: string[]
}

/**
 * Compute fantasy points for a roster for a given week from PlayerGameStat.
 * Uses league scoring rules (template + overrides). If no PlayerGameStat rows exist, returns 0.
 */
export async function computeRosterScoreForWeek(
  input: RosterScoreInput
): Promise<RosterScoreResult> {
  const rules = await resolveScoringRulesForLeague(
    input.leagueId,
    input.leagueSport,
    input.formatType,
    input.leagueSettings
  )
  const idsToScore = input.starterPlayerIds ?? input.rosterPlayerIds
  if (idsToScore.length === 0) {
    return { totalPoints: 0, byPlayerId: {}, usedPlayerIds: [] }
  }

  const stats = await prisma.playerGameStat.findMany({
    where: {
      sportType: input.leagueSport,
      season: input.season,
      weekOrRound: input.weekOrRound,
      playerId: { in: idsToScore },
    },
    select: { playerId: true, normalizedStatMap: true, fantasyPoints: true },
  })

  const byPlayerId: Record<string, number> = {}
  let totalPoints = 0
  for (const row of stats) {
    const raw = row.normalizedStatMap as Record<string, number> | null
    const points =
      row.fantasyPoints != null && row.fantasyPoints > 0
        ? row.fantasyPoints
        : computeFantasyPoints((raw ?? {}) as PlayerStatsRecord, rules as ScoringRuleDto[])
    byPlayerId[row.playerId] = Math.round(points * 100) / 100
    totalPoints += byPlayerId[row.playerId]
  }

  return {
    totalPoints: Math.round(totalPoints * 100) / 100,
    byPlayerId,
    usedPlayerIds: stats.map((s) => s.playerId),
  }
}

/**
 * Compute fantasy points for a single player's stats using league scoring rules.
 * Useful when you have stats in memory (e.g. from feed) and want to score them.
 */
export async function computePlayerFantasyPoints(
  leagueId: string,
  leagueSport: LeagueSport,
  stats: PlayerStatsRecord,
  formatType?: string
): Promise<number> {
  const rules = await resolveScoringRulesForLeague(leagueId, leagueSport, formatType)
  return computeFantasyPoints(stats, rules as ScoringRuleDto[])
}
