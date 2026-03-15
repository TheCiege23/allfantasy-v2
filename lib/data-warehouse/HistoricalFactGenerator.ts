/**
 * HistoricalFactGenerator — generates warehouse facts from existing league/roster/matchup/draft/transaction data.
 * Used by backfill pipelines and league history aggregation.
 */

import { prisma } from '@/lib/prisma'
import { WarehouseIngestionService } from './WarehouseIngestionService'
import { normalizeStatPayload } from './StatNormalizationService'
import { normalizeSportForWarehouse } from './types'

const ingestion = new WarehouseIngestionService()

/**
 * Generate PlayerGameFact and TeamGameFact from existing PlayerGameStat / TeamGameStat.
 */
export async function generateGameFactsFromExistingStats(
  sport: string,
  season: number,
  weekOrRound: number
): Promise<{ playerFacts: number; teamFacts: number }> {
  const sportNorm = normalizeSportForWarehouse(sport)
  const playerStats = await prisma.playerGameStat.findMany({
    where: { sportType: sportNorm, season, weekOrRound },
  })
  let playerFacts = 0
  for (const s of playerStats) {
    const normalized = normalizeStatPayload(sport, (s.normalizedStatMap as Record<string, unknown>) ?? {})
    await ingestion.ingestPlayerGameFact({
      playerId: s.playerId,
      sport: sportNorm,
      gameId: s.gameId,
      statPayload: (s.statPayload as Record<string, unknown>) ?? {},
      normalizedStats: normalized,
      fantasyPoints: s.fantasyPoints,
      scoringPeriod: weekOrRound,
      season,
      weekOrRound,
    })
    playerFacts++
  }
  const teamStats = await prisma.teamGameStat.findMany({
    where: { sportType: sportNorm, season, weekOrRound },
  })
  let teamFacts = 0
  for (const s of teamStats) {
    const payload = (s.statPayload as { points?: number; opponentPoints?: number }) ?? {}
    await ingestion.ingestTeamGameFact({
      teamId: s.teamId,
      sport: sportNorm,
      gameId: s.gameId,
      pointsScored: typeof payload.points === 'number' ? payload.points : 0,
      opponentPoints: typeof payload.opponentPoints === 'number' ? payload.opponentPoints : 0,
      result: payload.points != null && payload.opponentPoints != null
        ? (payload.points > payload.opponentPoints ? 'W' : payload.points < payload.opponentPoints ? 'L' : 'T')
        : undefined,
      season,
      weekOrRound,
    })
    teamFacts++
  }
  return { playerFacts, teamFacts }
}

/**
 * Generate MatchupFact from TeamPerformance for a league/week.
 */
export async function generateMatchupFactsFromLeague(
  leagueId: string,
  season: number,
  week: number
): Promise<number> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, include: { teams: true } })
  if (!league) return 0
  const sport = normalizeSportForWarehouse(league.sport)
  const teamIds = league.teams.map((t) => t.id)
  const perfs = await prisma.teamPerformance.findMany({
    where: { teamId: { in: teamIds }, season, week },
  })
  const byTeam = new Map<string, { points: number }>()
  for (const p of perfs) {
    byTeam.set(p.teamId, { points: p.points })
  }
  let count = 0
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const a = teamIds[i]
      const b = teamIds[j]
      const scoreA = byTeam.get(a)?.points ?? 0
      const scoreB = byTeam.get(b)?.points ?? 0
      const winner = scoreA > scoreB ? a : scoreB > scoreA ? b : null
      await ingestion.ingestMatchupFact({
        leagueId,
        sport,
        weekOrPeriod: week,
        teamA: a,
        teamB: b,
        scoreA,
        scoreB,
        winnerTeamId: winner ?? undefined,
        season,
      })
      count++
    }
  }
  return count
}

/**
 * Generate SeasonStandingFact from LeagueTeam for a league/season.
 */
export async function generateStandingFactsFromLeague(
  leagueId: string,
  season: number
): Promise<number> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) return 0
  const sport = normalizeSportForWarehouse(league.sport)
  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    orderBy: [{ pointsFor: 'desc' }, { currentRank: 'asc' }],
  })
  let rank = 1
  for (const t of teams) {
    await ingestion.ingestSeasonStandingFact({
      leagueId,
      sport,
      season,
      teamId: t.id,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      rank: t.currentRank ?? rank,
    })
    rank++
  }
  return teams.length
}

/**
 * Generate RosterSnapshot from Roster for a league (current state as one period).
 */
export async function generateRosterSnapshotsFromLeague(
  leagueId: string,
  weekOrPeriod: number,
  season?: number
): Promise<number> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) return 0
  const sport = normalizeSportForWarehouse(league.sport)
  const rosters = await prisma.roster.findMany({ where: { leagueId } })
  let count = 0
  for (const r of rosters) {
    const playerData = (r.playerData as { roster?: unknown[]; starters?: unknown[] }) ?? {}
    const rosterPlayers = Array.isArray(playerData.roster) ? playerData.roster : []
    const lineupPlayers = Array.isArray(playerData.starters) ? playerData.starters : []
    const benchPlayers = rosterPlayers.filter(
      (p: unknown) => !lineupPlayers.some((s: unknown) => (s as { id?: string })?.id === (p as { id?: string })?.id)
    )
    await ingestion.ingestRosterSnapshot({
      leagueId,
      teamId: r.id,
      sport,
      weekOrPeriod,
      season: season ?? league.season ?? undefined,
      rosterPlayers,
      lineupPlayers,
      benchPlayers,
    })
    count++
  }
  return count
}

/**
 * Generate DraftFact from MockDraft or league draft results for a league.
 */
export async function generateDraftFactsFromMockDraft(
  mockDraftId: string
): Promise<number> {
  const draft = await prisma.mockDraft.findUnique({ where: { id: mockDraftId } })
  if (!draft?.leagueId) return 0
  const league = await prisma.league.findUnique({ where: { id: draft.leagueId } })
  const sport = league ? normalizeSportForWarehouse(league.sport) : 'NFL'
  const results = (draft.results as { picks?: Array<{ round: number; pick: number; playerId?: string; managerId?: string }> })?.picks ?? []
  let count = 0
  for (const p of results) {
    await ingestion.ingestDraftFact({
      leagueId: draft.leagueId!,
      sport,
      round: p.round ?? 1,
      pickNumber: p.pick ?? count + 1,
      playerId: p.playerId ?? '',
      managerId: p.managerId ?? undefined,
      season: league?.season ?? undefined,
    })
    count++
  }
  return count
}

/**
 * Generate TransactionFact from WaiverTransaction / WaiverClaim for a league.
 */
export async function generateTransactionFactsFromLeague(
  leagueId: string,
  since?: Date
): Promise<number> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) return 0
  const sport = normalizeSportForWarehouse(league.sport)
  const txs = await prisma.waiverTransaction.findMany({
    where: { leagueId, ...(since ? { processedAt: { gte: since } } : {}) },
    orderBy: { processedAt: 'asc' },
  })
  let count = 0
  for (const t of txs) {
    await ingestion.ingestTransactionFact({
      leagueId,
      sport,
      type: 'waiver_add',
      playerId: t.addPlayerId,
      managerId: undefined,
      rosterId: t.rosterId,
      payload: { dropPlayerId: t.dropPlayerId, faabSpent: t.faabSpent },
      weekOrPeriod: undefined,
    })
    count++
  }
  return count
}
