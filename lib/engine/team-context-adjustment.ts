/**
 * lib/engine/team-context-adjustment.ts
 * Team context adjustment engine — modifies trade value based on:
 * - Team needs (positional gaps)
 * - Points scored vs points allowed
 * - Win/Loss record
 * - Championship window (contender vs rebuild)
 * - Bench strength
 *
 * Returns a multiplier (0.80–1.20) applied to the raw value.
 * Performance target: <5ms per team.
 */

import type { TradePlayerAsset, SportKey } from './trade-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamContextInput {
  sport: SportKey
  /** Team's current roster */
  roster: TradePlayerAsset[]
  /** Win-loss record */
  wins: number
  losses: number
  ties?: number
  /** Points scored and allowed this season */
  pointsFor: number
  pointsAgainst: number
  /** League standing / rank */
  rank?: number
  totalTeams?: number
  /** Is this team a contender or rebuilder? */
  direction?: 'CONTEND' | 'REBUILD' | 'MIDDLE' | 'FRAGILE_CONTEND'
  /** Roster slot requirements */
  rosterSlots?: Record<string, number> // e.g. { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 2 }
  /** Current season week (for window calculations) */
  currentWeek?: number
  totalWeeks?: number
}

export interface TeamContextResult {
  /** Multiplier to apply to player value (0.80–1.20) */
  multiplier: number
  /** Direction: contend, rebuild, middle */
  window: 'contender' | 'rebuilder' | 'middle'
  /** Positional needs — positions where the team is weakest */
  needs: string[]
  /** Bench depth score (0–100) */
  benchStrength: number
  /** Points differential */
  pointsDiff: number
  /** Win percentage */
  winPct: number
  /** Breakdown of adjustment factors */
  breakdown: {
    needsAdj: number // -0.10 to +0.10
    recordAdj: number // -0.05 to +0.05
    pointsDiffAdj: number // -0.05 to +0.05
    windowAdj: number // -0.05 to +0.10
    benchAdj: number // -0.03 to +0.03
  }
}

// ---------------------------------------------------------------------------
// Position requirements by sport (minimum starters)
// ---------------------------------------------------------------------------

const DEFAULT_STARTER_NEEDS: Record<string, Record<string, number>> = {
  NFL: { QB: 1, RB: 2, WR: 3, TE: 1 },
  NBA: { PG: 1, SG: 1, SF: 1, PF: 1, C: 1 },
  MLB: { SP: 3, RP: 2, C: 1, '1B': 1, '2B': 1, SS: 1, '3B': 1, OF: 3 },
  NHL: { C: 2, LW: 2, RW: 2, D: 4, G: 1 },
  NCAAF: { QB: 1, RB: 2, WR: 3, TE: 1 },
  NCAAB: { PG: 1, SG: 1, SF: 1, PF: 1, C: 1 },
  SOCCER: { FW: 2, MF: 3, DF: 4, GK: 1 },
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * Compute team context adjustment for a trade.
 * Returns a multiplier (0.80–1.20) plus detailed breakdown.
 */
export function computeTeamContext(input: TeamContextInput): TeamContextResult {
  const { sport, roster, wins, losses, ties = 0, pointsFor, pointsAgainst } = input
  const totalGames = wins + losses + ties
  const winPct = totalGames > 0 ? wins / totalGames : 0.50
  const pointsDiff = pointsFor - pointsAgainst

  // 1. Determine championship window
  const window = input.direction
    ? (input.direction === 'CONTEND' || input.direction === 'FRAGILE_CONTEND' ? 'contender' : input.direction === 'REBUILD' ? 'rebuilder' : 'middle')
    : inferWindow(winPct, input.rank, input.totalTeams)

  // 2. Positional needs analysis
  const needs = computePositionalNeeds(roster, sport, input.rosterSlots)

  // 3. Bench strength
  const benchStrength = computeBenchStrength(roster, sport)

  // 4. Compute adjustment factors

  // Needs adjustment: teams with many gaps value all acquisitions slightly more
  const needsAdj = needs.length >= 3 ? 0.05 : needs.length >= 2 ? 0.02 : needs.length >= 1 ? 0.01 : -0.02

  // Record adjustment: winning teams have more leverage, losing teams more desperate
  const recordAdj = winPct >= 0.70 ? -0.03 : winPct >= 0.55 ? -0.01 : winPct <= 0.30 ? 0.04 : winPct <= 0.40 ? 0.02 : 0

  // Points differential: high-scoring teams are stronger
  const avgPd = totalGames > 0 ? pointsDiff / totalGames : 0
  const pointsDiffAdj = avgPd > 20 ? -0.03 : avgPd > 10 ? -0.01 : avgPd < -20 ? 0.04 : avgPd < -10 ? 0.02 : 0

  // Window adjustment: contenders value win-now pieces more, rebuilders value youth
  const windowAdj = window === 'contender' ? 0.05 : window === 'rebuilder' ? -0.03 : 0

  // Bench adjustment: thin benches need depth more
  const benchAdj = benchStrength < 30 ? 0.03 : benchStrength > 70 ? -0.02 : 0

  const totalAdj = needsAdj + recordAdj + pointsDiffAdj + windowAdj + benchAdj
  const multiplier = Math.round((1.0 + clamp(totalAdj, -0.20, 0.20)) * 1000) / 1000

  return {
    multiplier,
    window,
    needs,
    benchStrength,
    pointsDiff: Math.round(pointsDiff),
    winPct: Math.round(winPct * 1000) / 1000,
    breakdown: {
      needsAdj: Math.round(needsAdj * 1000) / 1000,
      recordAdj: Math.round(recordAdj * 1000) / 1000,
      pointsDiffAdj: Math.round(pointsDiffAdj * 1000) / 1000,
      windowAdj: Math.round(windowAdj * 1000) / 1000,
      benchAdj: Math.round(benchAdj * 1000) / 1000,
    },
  }
}

/**
 * Apply team context to a player's value for a specific position.
 * If the player fills a team need, value is boosted. If redundant, slightly reduced.
 */
export function applyTeamContextToPlayer(
  baseValue: number,
  playerPosition: string,
  teamCtx: TeamContextResult,
): number {
  let adjusted = baseValue * teamCtx.multiplier

  // Bonus if player fills a positional need
  if (teamCtx.needs.includes(playerPosition)) {
    adjusted *= 1.08 // 8% boost for filling a need
  }

  return Math.round(adjusted)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function inferWindow(
  winPct: number,
  rank?: number,
  totalTeams?: number,
): 'contender' | 'rebuilder' | 'middle' {
  if (rank != null && totalTeams != null) {
    const pctRank = rank / totalTeams
    if (pctRank <= 0.25) return 'contender'
    if (pctRank >= 0.75) return 'rebuilder'
  }
  if (winPct >= 0.65) return 'contender'
  if (winPct <= 0.35) return 'rebuilder'
  return 'middle'
}

function computePositionalNeeds(
  roster: TradePlayerAsset[],
  sport: SportKey,
  rosterSlots?: Record<string, number>,
): string[] {
  const needs: string[] = []
  const required = rosterSlots ?? DEFAULT_STARTER_NEEDS[sport] ?? {}

  // Count players by position on roster
  const posCounts: Record<string, number> = {}
  for (const p of roster) {
    const pos = p.pos ?? ''
    posCounts[pos] = (posCounts[pos] ?? 0) + 1
  }

  // Find positions where team is short
  for (const [pos, needed] of Object.entries(required)) {
    const have = posCounts[pos] ?? 0
    // Need at least 1.5x starters for adequate depth
    if (have < needed * 1.5) {
      needs.push(pos)
    }
  }

  return needs
}

function computeBenchStrength(roster: TradePlayerAsset[], sport: SportKey): number {
  const required = DEFAULT_STARTER_NEEDS[sport] ?? {}
  const totalRequired = Object.values(required).reduce((a, b) => a + b, 0)
  const totalRoster = roster.length
  const benchSize = Math.max(0, totalRoster - totalRequired)

  // Bench strength is ratio of bench to starters, normalized to 0–100
  const ratio = totalRequired > 0 ? benchSize / totalRequired : 0
  return Math.round(clamp(ratio * 60, 0, 100)) // 1:1 bench:starter = 60
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export { DEFAULT_STARTER_NEEDS }
