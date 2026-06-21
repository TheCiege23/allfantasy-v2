/**
 * T2 Team Context Engine V1 — deterministic team profile. No AI.
 *
 * Stance:
 *   winPct ≥ 0.58  AND (no seed OR seed ≤ leagueSize/2)  → contender
 *   winPct ≤ 0.40                                         → rebuilder
 *   otherwise                                             → middle
 *
 * Positional depth: count active players per position against STARTER_NEEDS. A position with fewer
 * than its need is "weak"; with ≥ need+2 startable bodies is "strong". `depthIssues` is true when any
 * core position is below its starter need.
 */

import type { TeamProfile, TeamStance } from './types'

/** Minimum startable bodies per core position (standard redraft). */
export const STARTER_NEEDS: Record<string, number> = { QB: 1, RB: 2, WR: 2, TE: 1 }
const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

export interface TeamProfileInput {
  rosterId: string
  wins: number
  losses: number
  ties?: number
  pointsFor: number
  playoffSeed?: number | null
  leagueSize?: number
  /** Active roster player positions (one entry per player). */
  positions: string[]
}

export function buildTeamProfile(input: TeamProfileInput): TeamProfile {
  const games = input.wins + input.losses + (input.ties ?? 0)
  const winPct = games > 0 ? (input.wins + 0.5 * (input.ties ?? 0)) / games : 0.5

  const leagueSize = input.leagueSize ?? 12
  const seedTopHalf = input.playoffSeed == null || input.playoffSeed <= Math.ceil(leagueSize / 2)

  let stance: TeamStance = 'middle'
  if (winPct >= 0.58 && seedTopHalf) stance = 'contender'
  else if (winPct <= 0.4) stance = 'rebuilder'

  const counts: Record<string, number> = {}
  for (const raw of input.positions) {
    const pos = String(raw || '').toUpperCase()
    const key = pos === 'DEF' ? 'DST' : pos
    counts[key] = (counts[key] ?? 0) + 1
  }

  const weakPositions: string[] = []
  const strongPositions: string[] = []
  let depthIssues = false
  for (const pos of CORE_POSITIONS) {
    const need = STARTER_NEEDS[pos] ?? 1
    const have = counts[pos] ?? 0
    if (have < need) {
      weakPositions.push(pos)
      depthIssues = true
    } else if (have >= need + 2) {
      strongPositions.push(pos)
    }
  }

  return {
    rosterId: input.rosterId,
    stance,
    winPct: Math.round(winPct * 1000) / 1000,
    pointsFor: input.pointsFor,
    weakPositions,
    strongPositions,
    depthIssues,
  }
}
