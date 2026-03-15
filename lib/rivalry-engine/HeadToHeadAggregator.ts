/**
 * HeadToHeadAggregator — aggregates head-to-head matchup history for rivalry scoring.
 * Uses warehouse MatchupFact or WeeklyMatchup and league teams to build H2H + close games + upset flags.
 */

import { prisma } from '@/lib/prisma'

export interface HeadToHeadMatchup {
  season: number
  weekOrPeriod: number
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  winnerTeamId: string | null
}

export interface HeadToHeadSummary {
  managerAId: string
  managerBId: string
  totalMatchups: number
  winsA: number
  winsB: number
  closeGameCount: number
  upsetWins: number
  matchups: HeadToHeadMatchup[]
}

const CLOSE_GAME_MARGIN = 15
const UPSET_MARGIN_POINTS = 20

/**
 * Canonical pair key (lower id first) for consistent grouping.
 */
function pairKey(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`
}

/**
 * Aggregate head-to-head from MatchupFact for a league/season.
 * Returns one summary per manager pair (managerAId/managerBId as team externalId or owner id).
 */
export async function aggregateHeadToHeadForLeague(
  leagueId: string,
  season: number,
  options?: { useTeamIds?: boolean }
): Promise<HeadToHeadSummary[]> {
  const facts = await prisma.matchupFact.findMany({
    where: { leagueId, season },
    orderBy: [{ weekOrPeriod: 'asc' }],
  })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league?.teams?.length) return []

  const teamByExternalId = new Map<string, { id: string; externalId: string; ownerName: string }>()
  for (const t of league.teams) {
    teamByExternalId.set(t.externalId, t)
    teamByExternalId.set(t.id, t)
  }

  const byPair = new Map<
    string,
    { managerAId: string; managerBId: string; matchups: HeadToHeadMatchup[] }
  >()

  for (const f of facts) {
    const teamARec = teamByExternalId.get(f.teamA)
    const teamBRec = teamByExternalId.get(f.teamB)
    const idA = teamARec?.externalId ?? f.teamA
    const idB = teamBRec?.externalId ?? f.teamB
    const managerAId = options?.useTeamIds ? idA : (teamARec?.ownerName ?? idA)
    const managerBId = options?.useTeamIds ? idB : (teamBRec?.ownerName ?? idB)
    const key = pairKey(managerAId, managerBId)
    if (!byPair.has(key)) {
      byPair.set(key, {
        managerAId: managerAId < managerBId ? managerAId : managerBId,
        managerBId: managerAId < managerBId ? managerBId : managerAId,
        matchups: [],
      })
    }
    const entry = byPair.get(key)!
    const scoreA = f.scoreA ?? 0
    const scoreB = f.scoreB ?? 0
    entry.matchups.push({
      season: f.season ?? season,
      weekOrPeriod: f.weekOrPeriod,
      teamAId: f.teamA,
      teamBId: f.teamB,
      scoreA,
      scoreB,
      winnerTeamId: f.winnerTeamId ?? null,
    })
  }

  const summaries: HeadToHeadSummary[] = []
  for (const [, entry] of byPair) {
    let winsA = 0
    let winsB = 0
    let closeCount = 0
    let upsetCount = 0
    for (const m of entry.matchups) {
      const margin = Math.abs(m.scoreA - m.scoreB)
      if (margin < CLOSE_GAME_MARGIN) closeCount++
      if (m.winnerTeamId) {
        const winnerIsA = m.winnerTeamId === m.teamAId
        if (winnerIsA) winsA++
        else winsB++
        const higherScore = m.scoreA >= m.scoreB ? m.scoreA : m.scoreB
        const lowerScore = m.scoreA >= m.scoreB ? m.scoreB : m.scoreA
        if (higherScore - lowerScore <= UPSET_MARGIN_POINTS && margin > 0) upsetCount++
      }
    }
    summaries.push({
      managerAId: entry.managerAId,
      managerBId: entry.managerBId,
      totalMatchups: entry.matchups.length,
      winsA,
      winsB,
      closeGameCount: closeCount,
      upsetWins: upsetCount,
      matchups: entry.matchups,
    })
  }
  return summaries
}
