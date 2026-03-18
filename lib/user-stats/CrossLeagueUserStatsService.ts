/**
 * Cross-League User Stats (PROMPT 221).
 * Aggregates wins, losses, championships, playoff appearances, draft grades, trade success across all leagues.
 * Resolves user via UserProfile.sleeperUserId -> Roster.platformUserId for main app leagues.
 */

import { prisma } from "@/lib/prisma"
import { getMergedHistoricalSeasonResultsForManager } from "@/lib/season-results/HistoricalSeasonResultService"

export interface CrossLeagueUserStatsResult {
  wins: number
  losses: number
  ties: number
  championships: number
  playoffAppearances: number
  draftGrades: { count: number; averageScore: number; latestGrade: string | null }
  tradeSuccess: { tradesSent: number; tradesAccepted: number; acceptanceRate: number }
  seasonsPlayed: number
  leaguesPlayed: number
}

/**
 * Resolve app user id to platform user id (sleeper) for roster lookup.
 */
async function getPlatformUserId(appUserId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId: appUserId },
    select: { sleeperUserId: true },
  })
  return profile?.sleeperUserId ?? null
}

/**
 * Get all roster IDs that belong to this user across leagues (Roster.platformUserId = sleeperUserId).
 */
async function getUserRosterIds(
  platformUserId: string
): Promise<{ leagueId: string; rosterId: string; playerData: unknown }[]> {
  const rosters = await prisma.roster.findMany({
    where: { platformUserId },
    select: { id: true, leagueId: true, playerData: true },
  })
  return rosters.map((r) => ({
    leagueId: r.leagueId,
    rosterId: r.id,
    playerData: r.playerData,
  }))
}

/**
 * Compute cross-league user stats for an app user.
 * Uses SeasonResult (wins, losses, champion), DraftGrade (score, grade), HallOfFameRow (championships), and manager_trade_tendencies if available.
 */
export async function getCrossLeagueUserStats(appUserId: string): Promise<CrossLeagueUserStatsResult> {
  const platformUserId = await getPlatformUserId(appUserId)
  const rosterPairs = platformUserId ? await getUserRosterIds(platformUserId) : []

  const result: CrossLeagueUserStatsResult = {
    wins: 0,
    losses: 0,
    ties: 0,
    championships: 0,
    playoffAppearances: 0,
    draftGrades: { count: 0, averageScore: 0, latestGrade: null },
    tradeSuccess: { tradesSent: 0, tradesAccepted: 0, acceptanceRate: 0 },
    seasonsPlayed: 0,
    leaguesPlayed: 0,
  }

  if (!platformUserId || rosterPairs.length === 0) return result

  const rosterIds = rosterPairs.map((p) => p.rosterId)
  const leagueIds = Array.from(new Set(rosterPairs.map((pair) => pair.leagueId)))

  const [seasonResults, draftGrades, tradeTendencies] = await Promise.all([
    getMergedHistoricalSeasonResultsForManager({
      managerId: platformUserId,
      rosters: rosterPairs.map((pair) => ({
        id: pair.rosterId,
        leagueId: pair.leagueId,
        platformUserId,
        playerData: pair.playerData,
      })),
    }),
    prisma.draftGrade.findMany({
      where: {
        leagueId: { in: leagueIds },
        rosterId: { in: rosterIds },
      },
      select: { grade: true, score: true, season: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    platformUserId
      ? (prisma as any).manager_trade_tendencies
          .findUnique({ where: { user_id: platformUserId } })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  const seasonsSeen = new Set<string>()
  for (const s of seasonResults) {
    result.wins += s.wins ?? 0
    result.losses += s.losses ?? 0
    if (s.champion) result.championships += 1
    const key = `${s.leagueId}:${s.season}`
    if (!seasonsSeen.has(key) && (s.madePlayoffs || s.champion)) {
      seasonsSeen.add(key)
      result.playoffAppearances += 1
    }
  }
  result.seasonsPlayed = seasonResults.length
  result.leaguesPlayed = new Set(seasonResults.map((s) => s.leagueId)).size

  if (draftGrades.length > 0) {
    const scores = draftGrades.map((g) => Number(g.score))
    result.draftGrades.count = draftGrades.length
    result.draftGrades.averageScore =
      scores.reduce((a, b) => a + b, 0) / scores.length
    result.draftGrades.latestGrade = draftGrades[0]?.grade ?? null
  }

  if (tradeTendencies && typeof tradeTendencies === "object") {
    const sent = Number((tradeTendencies as any).trades_sent ?? 0)
    const accepted = Number((tradeTendencies as any).trades_accepted ?? 0)
    result.tradeSuccess.tradesSent = sent
    result.tradeSuccess.tradesAccepted = accepted
    result.tradeSuccess.acceptanceRate = sent > 0 ? accepted / sent : 0
  }

  return result
}
