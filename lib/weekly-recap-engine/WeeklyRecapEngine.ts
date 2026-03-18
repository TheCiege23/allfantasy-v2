/**
 * Weekly Recap Engine (PROMPT 306).
 * Summarizes user performance: wins/losses, best players, AI insights.
 */

import { prisma } from "@/lib/prisma"
import { buildRecapContext } from "@/lib/sports-media-engine/RecapGenerator"
import type { WeeklyRecapPayload, WeeklyRecapLeague, LeagueRecord, WeeklyRecapPlayer } from "./types"

const DEFAULT_AI_INSIGHTS = [
  "Ask Chimmy for waiver and trade advice tailored to your leagues.",
  "Use the trade evaluator to check deal fairness before you offer.",
  "Run a mock draft to practice for your next season.",
]

/**
 * Resolve Sleeper user ID for the app user (from LegacyUser link).
 */
async function getSleeperUserId(appUserId: string): Promise<string | null> {
  const user = await prisma.appUser.findUnique({
    where: { id: appUserId },
    select: { legacyUserId: true },
  })
  if (!user?.legacyUserId) return null
  const legacy = await prisma.legacyUser.findUnique({
    where: { id: user.legacyUserId },
    select: { sleeperUserId: true },
  })
  return legacy?.sleeperUserId ?? null
}

/**
 * For a league with legacyLeagueId, find the user's LeagueTeam (wins/losses) by Sleeper user ID.
 */
async function getMyTeamRecordInLegacyLeague(
  leagueId: string,
  sleeperUserId: string
): Promise<{ wins: number; losses: number; ties: number; rank?: number; pointsFor?: number } | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { legacyLeagueId: true },
  })
  if (!league?.legacyLeagueId) return null

  const legacyRoster = await prisma.legacyRoster.findFirst({
    where: {
      leagueId: league.legacyLeagueId,
      ownerId: sleeperUserId,
    },
    select: { id: true },
  })
  if (!legacyRoster) return null

  const team = await prisma.leagueTeam.findFirst({
    where: { legacyRosterId: legacyRoster.id },
    select: { wins: true, losses: true, ties: true, currentRank: true, pointsFor: true },
  })
  if (!team) return null

  return {
    wins: team.wins ?? 0,
    losses: team.losses ?? 0,
    ties: team.ties ?? 0,
    rank: team.currentRank ?? undefined,
    pointsFor: team.pointsFor ?? undefined,
  }
}

/**
 * Optionally award first_win / ten_wins when user has reached those thresholds (progression only, no money).
 */
async function tryAwardWinAchievements(userId: string, totalWins: number): Promise<void> {
  if (totalWins < 1) return
  try {
    const { awardAchievement, hasAchievement } = await import("@/lib/achievement-system")
    if (totalWins >= 1) {
      const hasFirst = await hasAchievement(userId, "first_win")
      if (!hasFirst) await awardAchievement(userId, "first_win", { totalWins })
    }
    if (totalWins >= 10) {
      const hasTen = await hasAchievement(userId, "ten_wins")
      if (!hasTen) await awardAchievement(userId, "ten_wins", { totalWins })
    }
  } catch {
    // non-fatal
  }
}

/**
 * Build weekly recap for a user: wins/losses from their leagues, best players placeholder, AI insights.
 */
export async function buildWeeklyRecapPayload(userId: string): Promise<WeeklyRecapPayload> {
  const sleeperUserId = await getSleeperUserId(userId)

  const leagues = await prisma.league.findMany({
    where: { userId },
    select: { id: true, name: true, sport: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  })

  const recapLeagues: WeeklyRecapLeague[] = []
  let totalWins = 0
  let totalLosses = 0
  let totalTies = 0

  for (const league of leagues) {
    let myRecord: LeagueRecord | undefined
    let rank: number | undefined
    let pointsFor: number | undefined

    if (sleeperUserId) {
      const record = await getMyTeamRecordInLegacyLeague(league.id, sleeperUserId)
      if (record) {
        myRecord = {
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
        }
        totalWins += record.wins
        totalLosses += record.losses
        totalTies += record.ties
        rank = record.rank
        pointsFor = record.pointsFor
      }
    }

    if (!myRecord) {
      try {
        const ctx = await buildRecapContext({
          leagueId: league.id,
          leagueName: league.name ?? undefined,
          sport: league.sport ?? undefined,
        })
        if (ctx.teams.length > 0) {
          rank = undefined
          pointsFor = undefined
        }
      } catch {
        // ignore
      }
    }

    recapLeagues.push({
      leagueId: league.id,
      leagueName: league.name ?? "League",
      sport: league.sport ?? undefined,
      myRecord,
      rank,
      pointsFor,
    })
  }

  const bestPlayers: WeeklyRecapPlayer[] = []
  if (recapLeagues.some((l) => l.myRecord)) {
    bestPlayers.push(
      { name: "Your roster", position: undefined, reason: "Check your league for top scorers this week." }
    )
  }

  await tryAwardWinAchievements(userId, totalWins)

  const summary =
    totalWins + totalLosses + totalTies > 0
      ? `This week: ${totalWins}-${totalLosses}${totalTies > 0 ? `-${totalTies}` : ""} across ${recapLeagues.filter((l) => l.myRecord).length} league(s).`
      : recapLeagues.length > 0
        ? `You have ${recapLeagues.length} league(s). Link Sleeper to see your record here.`
        : "Add a league to get your weekly recap."

  return {
    period: "Last 7 days",
    totalWins,
    totalLosses,
    totalTies,
    leagues: recapLeagues,
    bestPlayers,
    aiInsights: DEFAULT_AI_INSIGHTS,
    summary,
  }
}
