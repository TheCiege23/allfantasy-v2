/**
 * Cross-League User Stats (PROMPT 221).
 * Aggregates wins, losses, championships, playoff appearances, draft grades, trade success across all leagues.
 * Resolves user across app and external manager ids for deterministic-first aggregation.
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

const EMPTY_RESULT: CrossLeagueUserStatsResult = {
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

function uniqueValues(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = String(value ?? "").trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

async function resolveManagerIds(appUserId: string): Promise<string[]> {
  const appUser = await prisma.appUser.findUnique({
    where: { id: appUserId },
    select: {
      id: true,
      legacyUserId: true,
      profile: { select: { sleeperUserId: true } },
    },
  })

  const legacyUser = appUser?.legacyUserId
    ? await prisma.legacyUser.findUnique({
        where: { id: appUser.legacyUserId },
        select: { sleeperUserId: true },
      })
    : null

  return uniqueValues([appUserId, appUser?.profile?.sleeperUserId, legacyUser?.sleeperUserId])
}

async function getUserRosters(
  managerIds: string[]
): Promise<Array<{ leagueId: string; rosterId: string; platformUserId: string; playerData: unknown }>> {
  if (managerIds.length === 0) return []
  const rosters = await prisma.roster.findMany({
    where: { platformUserId: { in: managerIds } },
    select: { id: true, leagueId: true, platformUserId: true, playerData: true },
  })
  return rosters.map((r) => ({
    leagueId: r.leagueId,
    rosterId: r.id,
    platformUserId: r.platformUserId,
    playerData: r.playerData,
  }))
}

async function getTradeSuccess(input: {
  managerIds: string[]
  leagueIds: string[]
}): Promise<{ tradesSent: number; tradesAccepted: number; acceptanceRate: number }> {
  const result = { tradesSent: 0, tradesAccepted: 0, acceptanceRate: 0 }
  if (input.managerIds.length === 0 || input.leagueIds.length === 0) return result

  const sentOffers = await prisma.tradeOfferEvent
    .findMany({
      where: {
        leagueId: { in: input.leagueIds },
        senderUserId: { in: input.managerIds },
      },
      select: { id: true },
    })
    .catch(() => [])

  const sentOfferIds = sentOffers.map((offer) => offer.id)
  const acceptedOutcomes =
    sentOfferIds.length > 0
      ? await prisma.tradeOutcomeEvent
          .findMany({
            where: {
              offerEventId: { in: sentOfferIds },
              outcome: "ACCEPTED",
            },
            select: { offerEventId: true },
          })
          .catch(() => [])
      : []

  const acceptedOfferIds = new Set(
    acceptedOutcomes.map((row) => String(row.offerEventId ?? "").trim()).filter(Boolean)
  )

  let fallbackSent = 0
  let fallbackAccepted = 0
  try {
    const tendencies = await (prisma as any).manager_trade_tendencies.findMany({
      where: { user_id: { in: input.managerIds } },
      select: { trades_sent: true, trades_accepted: true },
    })
    fallbackSent = tendencies.reduce(
      (sum: number, row: { trades_sent?: number | null }) => sum + Number(row?.trades_sent ?? 0),
      0
    )
    fallbackAccepted = tendencies.reduce(
      (sum: number, row: { trades_accepted?: number | null }) => sum + Number(row?.trades_accepted ?? 0),
      0
    )
  } catch {
    // Keep deterministic event-based counts as primary.
  }

  const tradesSent = Math.max(sentOfferIds.length, fallbackSent)
  const tradesAccepted = Math.max(acceptedOfferIds.size, fallbackAccepted)
  result.tradesSent = tradesSent
  result.tradesAccepted = Math.min(tradesAccepted, tradesSent)
  result.acceptanceRate = tradesSent > 0 ? result.tradesAccepted / tradesSent : 0
  return result
}

/**
 * Compute cross-league user stats for an app user.
 * Deterministic-first sources:
 * - SeasonResult + playoff metadata (wins/losses/championships/playoffs)
 * - DraftGrade (grade summary)
 * - TradeOfferEvent + TradeOutcomeEvent (trade success)
 * - HallOfFameRow / ManagerFranchiseProfile fallbacks
 */
export async function getCrossLeagueUserStats(appUserId: string): Promise<CrossLeagueUserStatsResult> {
  const managerIds = await resolveManagerIds(appUserId)
  const rosterPairs = await getUserRosters(managerIds)
  const result: CrossLeagueUserStatsResult = {
    ...EMPTY_RESULT,
  }
  if (managerIds.length === 0 && rosterPairs.length === 0) return result

  const rosterIds = rosterPairs.map((p) => p.rosterId)
  const leagueIds = uniqueValues(rosterPairs.map((pair) => pair.leagueId))
  const allManagerIds = uniqueValues([...managerIds, ...rosterPairs.map((pair) => pair.platformUserId)])

  const [seasonResults, draftGrades, hallOfFameRows, managerProfiles, tradeSuccess] = await Promise.all([
    rosterPairs.length > 0
      ? getMergedHistoricalSeasonResultsForManager({
          managerId: appUserId,
          rosters: rosterPairs.map((pair) => ({
            id: pair.rosterId,
            leagueId: pair.leagueId,
            platformUserId: pair.platformUserId,
            playerData: pair.playerData,
          })),
        })
      : Promise.resolve([]),
    leagueIds.length > 0 && rosterIds.length > 0
      ? prisma.draftGrade.findMany({
          where: {
            leagueId: { in: leagueIds },
            rosterId: { in: rosterIds },
          },
          select: { grade: true, score: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    leagueIds.length > 0 && rosterIds.length > 0
      ? prisma.hallOfFameRow.findMany({
          where: { leagueId: { in: leagueIds }, rosterId: { in: rosterIds } },
          select: { championships: true, seasonsPlayed: true },
        })
      : Promise.resolve([]),
    allManagerIds.length > 0
      ? prisma.managerFranchiseProfile.findMany({
          where: { managerId: { in: allManagerIds } },
          select: {
            championshipCount: true,
            playoffAppearances: true,
            totalCareerSeasons: true,
            totalLeaguesPlayed: true,
          },
        })
      : Promise.resolve([]),
    getTradeSuccess({ managerIds: allManagerIds, leagueIds }),
  ])

  const playoffSeasonKeys = new Set<string>()
  const championshipSeasonKeys = new Set<string>()
  const seasonKeys = new Set<string>()
  const leaguesSeen = new Set<string>()
  for (const s of seasonResults) {
    result.wins += s.wins ?? 0
    result.losses += s.losses ?? 0
    const key = `${s.leagueId}:${s.season}`
    seasonKeys.add(key)
    leaguesSeen.add(s.leagueId)
    if (s.champion) championshipSeasonKeys.add(key)
    if (s.madePlayoffs || s.champion) playoffSeasonKeys.add(key)
  }
  result.championships = championshipSeasonKeys.size
  result.playoffAppearances = playoffSeasonKeys.size
  result.seasonsPlayed = seasonKeys.size
  result.leaguesPlayed = leaguesSeen.size > 0 ? leaguesSeen.size : leagueIds.length

  if (draftGrades.length > 0) {
    const scores = draftGrades.map((g) => Number(g.score))
    result.draftGrades.count = draftGrades.length
    result.draftGrades.averageScore =
      scores.reduce((a, b) => a + b, 0) / scores.length
    result.draftGrades.latestGrade = draftGrades[0]?.grade ?? null
  }

  const hofChampionships = hallOfFameRows.reduce((sum, row) => sum + Number(row.championships ?? 0), 0)
  const hofSeasons = hallOfFameRows.reduce((sum, row) => sum + Number(row.seasonsPlayed ?? 0), 0)
  result.championships = Math.max(result.championships, hofChampionships)

  const profileChampionships = managerProfiles.reduce(
    (max, row) => Math.max(max, Number(row.championshipCount ?? 0)),
    0
  )
  const profilePlayoffs = managerProfiles.reduce(
    (max, row) => Math.max(max, Number(row.playoffAppearances ?? 0)),
    0
  )
  const profileSeasons = managerProfiles.reduce(
    (max, row) => Math.max(max, Number(row.totalCareerSeasons ?? 0)),
    0
  )
  const profileLeagues = managerProfiles.reduce(
    (max, row) => Math.max(max, Number(row.totalLeaguesPlayed ?? 0)),
    0
  )
  result.championships = Math.max(result.championships, profileChampionships)
  result.playoffAppearances = Math.max(result.playoffAppearances, profilePlayoffs)
  result.seasonsPlayed = Math.max(result.seasonsPlayed, hofSeasons, profileSeasons)
  result.leaguesPlayed = Math.max(result.leaguesPlayed, profileLeagues)
  result.tradeSuccess = tradeSuccess

  return result
}
