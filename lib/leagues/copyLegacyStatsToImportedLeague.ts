import { prisma } from '@/lib/prisma'

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * After `syncLegacyLeagueFromSleeper`, copy the user’s legacy roster row onto the matching
 * `League` row (same user, Sleeper platform, league id + season) for `/api/user/rank` aggregation.
 */
export async function copyLegacyStatsToImportedLeague(
  appUserId: string,
  legacyUserId: string,
  sleeperUserId: string,
  platformLeagueId: string,
  season: number,
): Promise<void> {
  const legacyLeague = await prisma.legacyLeague.findFirst({
    where: { userId: legacyUserId, sleeperLeagueId: platformLeagueId },
    select: {
      playoffTeams: true,
      winnerRosterId: true,
      rosters: {
        select: {
          rosterId: true,
          ownerId: true,
          isOwner: true,
          wins: true,
          losses: true,
          ties: true,
          pointsFor: true,
          pointsAgainst: true,
          playoffSeed: true,
          finalStanding: true,
          isChampion: true,
        },
      },
    },
  })

  if (!legacyLeague) return

  const roster =
    legacyLeague.rosters.find(
      (r) => r.ownerId != null && String(r.ownerId) === String(sleeperUserId),
    ) ??
    legacyLeague.rosters.find((r) => r.isOwner) ??
    null

  if (!roster) return

  const playoffTeams = safeNum(legacyLeague.playoffTeams, 0)
  const finalStanding = roster.finalStanding != null ? safeNum(roster.finalStanding) : null
  const playoffSeed = roster.playoffSeed != null ? safeNum(roster.playoffSeed) : null
  const fallbackChampion =
    legacyLeague.winnerRosterId != null &&
    safeNum(legacyLeague.winnerRosterId) === safeNum(roster.rosterId)
  const isChampion = Boolean(roster.isChampion) || fallbackChampion
  const madePlayoffs =
    (playoffSeed != null && playoffSeed > 0) ||
    isChampion ||
    (playoffTeams > 0 && finalStanding != null && finalStanding > 0 && finalStanding <= playoffTeams)

  await prisma.league.updateMany({
    where: {
      userId: appUserId,
      platform: 'sleeper',
      platformLeagueId,
      season,
    },
    data: {
      importWins: roster.wins,
      importLosses: roster.losses,
      importTies: roster.ties,
      importPointsFor: roster.pointsFor,
      importPointsAgainst: roster.pointsAgainst,
      importMadePlayoffs: madePlayoffs,
      importWonChampionship: isChampion,
      importFinalStanding: finalStanding,
    },
  })
}
