/**
 * Fetch league standings for weighted draft lottery.
 * Maps LeagueTeam (standings) to Roster (slotOrder rosterId) by index.
 */

import { prisma } from '@/lib/prisma'
import type { LotteryEligibleTeam, LotteryEligibilityMode, LotteryWeightingMode, LotteryTiebreakMode } from './types'

export interface StandingsRow {
  rosterId: string
  displayName: string
  teamIndex: number
  rank: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  /** Max PF if available (dynasty); else pointsFor. */
  maxPf: number
}

/**
 * Get standings for a league: one row per team with rosterId and displayName.
 * Teams and rosters are paired by canonical (id) order; then rows are sorted by currentRank for lottery use.
 */
export async function getStandingsForLottery(leagueId: string): Promise<StandingsRow[]> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      leagueSize: true,
      rosters: { select: { id: true }, orderBy: { id: 'asc' } },
      teams: {
        select: {
          id: true,
          ownerName: true,
          teamName: true,
          wins: true,
          losses: true,
          ties: true,
          pointsFor: true,
          currentRank: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  })
  if (!league) return []

  const rosters = league.rosters ?? []
  const teams = league.teams ?? []
  const teamCount = league.leagueSize ?? Math.max(rosters.length, teams.length)

  const rows: StandingsRow[] = []
  for (let i = 0; i < teamCount; i++) {
    const t = teams[i]
    const rosterId = rosters[i]?.id ?? t?.id ?? `placeholder-${i + 1}`
    const displayName = t ? (t.teamName || t.ownerName || `Team ${i + 1}`) : `Team ${i + 1}`
    const rank = t?.currentRank ?? i + 1
    rows.push({
      rosterId,
      displayName,
      teamIndex: i,
      rank,
      wins: t?.wins ?? 0,
      losses: t?.losses ?? 0,
      ties: t?.ties ?? 0,
      pointsFor: t?.pointsFor ?? 0,
      maxPf: t?.pointsFor ?? 0,
    })
  }

  return rows
}

/**
 * Apply tiebreak to a list of standings rows (mutates sort).
 */
export function applyTiebreak(
  rows: StandingsRow[],
  tiebreakMode: LotteryTiebreakMode,
  seed: string
): void {
  if (tiebreakMode === 'lower_points_for') {
    rows.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.pointsFor - b.pointsFor
    })
    return
  }
  if (tiebreakMode === 'lower_max_pf') {
    rows.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.maxPf - b.maxPf
    })
    return
  }
  if (tiebreakMode === 'seeded_random') {
    const rng = seededRandom(seed)
    rows.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      if (a.pointsFor !== b.pointsFor) return a.pointsFor - b.pointsFor
      return rng() - 0.5
    })
  }
}

function seededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state << 5) - state + seed.charCodeAt(i)
    state |= 0
  }
  let n = 0
  return () => {
    n++
    const x = Math.sin((state >>> 0) / 0xffffffff * 997 + n * 9999) * 10000
    return x - Math.floor(x)
  }
}

/**
 * Select eligible teams for lottery based on config.
 */
export function selectEligibleTeams(
  rows: StandingsRow[],
  eligibilityMode: LotteryEligibilityMode,
  lotteryTeamCount: number,
  playoffTeamCount: number
): StandingsRow[] {
  const mode = eligibilityMode === 'custom' ? 'all_teams' : eligibilityMode
  if (mode === 'all_teams') {
    return rows.slice(0, lotteryTeamCount)
  }
  if (mode === 'bottom_n') {
    return rows.slice(-lotteryTeamCount)
  }
  const nonPlayoffCount = Math.max(0, rows.length - playoffTeamCount)
  const eligible = rows.slice(playoffTeamCount, playoffTeamCount + nonPlayoffCount)
  return eligible.slice(0, lotteryTeamCount)
}

/**
 * Compute weight for a team (higher = better lottery odds).
 */
export function computeWeight(
  row: StandingsRow,
  weightingMode: LotteryWeightingMode,
  worstRankInPool: number,
  bestRankInPool: number
): number {
  if (weightingMode === 'inverse_standings') {
    const range = Math.max(1, bestRankInPool - worstRankInPool + 1)
    const inverseRank = bestRankInPool - row.rank + 1
    return Math.max(1, inverseRank)
  }
  if (weightingMode === 'inverse_points_for' || weightingMode === 'inverse_max_pf') {
    const pf = weightingMode === 'inverse_max_pf' ? row.maxPf : row.pointsFor
    return Math.max(0.1, 1000 - pf)
  }
  return 1
}

/**
 * Build lottery-eligible teams with weights and odds for display.
 */
export function buildEligibleTeamsWithOdds(
  eligible: StandingsRow[],
  weightingMode: LotteryWeightingMode
): LotteryEligibleTeam[] {
  if (eligible.length === 0) return []
  const worstRank = Math.max(...eligible.map((r) => r.rank))
  const bestRank = Math.min(...eligible.map((r) => r.rank))
  const withWeight = eligible.map((r) => ({
    ...r,
    weight: computeWeight(r, weightingMode, worstRank, bestRank),
  }))
  const totalWeight = withWeight.reduce((s, r) => s + r.weight, 0)
  return withWeight.map((r) => ({
    rosterId: r.rosterId,
    displayName: r.displayName,
    teamIndex: r.teamIndex,
    rank: r.rank,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    pointsFor: r.pointsFor,
    weight: r.weight,
    oddsPercent: totalWeight > 0 ? (r.weight / totalWeight) * 100 : 0,
  }))
}
