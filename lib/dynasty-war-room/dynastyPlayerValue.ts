/**
 * Dynasty player value + age-curve helpers (pure, deterministic).
 *
 * Dynasty value is a long-term asset value derived from dynasty ADP/ranking
 * (lower ADP = higher value). Age trajectory is a SEPARATE signal that the
 * engines combine with value for buy/sell/hold + contention-window calls — it
 * never overwrites the raw value. No fabrication: missing inputs → null/none.
 */
import type { DynastyPlayerFact } from './types'

export type DynastyValueSource = 'value' | 'adp' | 'projection' | 'none'

/** Map an average overall dynasty ADP (lower = better) onto a positive value scale. */
export function adpToDynastyValue(adp: number): number {
  return Math.round((Math.max(0, 260 - adp) / 10) * 100) / 100
}

/** Long-term dynasty asset value for a player (value → ADP → none). */
export function dynastyValue(p: DynastyPlayerFact): { value: number; source: DynastyValueSource } {
  if (p.dynastyValue != null) return { value: p.dynastyValue, source: 'value' }
  if (p.adp != null) return { value: adpToDynastyValue(p.adp), source: 'adp' }
  return { value: 0, source: 'none' }
}

/**
 * Age-trajectory bucket per position. Dynasty windows differ by position
 * (RBs decline early, WR/TE/QB hold value longer). Returns a coarse, honest
 * label used by buy/sell/hold + direction; null when age is unknown.
 */
export type AgeTrajectory = 'ascending' | 'prime' | 'aging' | 'cliff' | 'unknown'

export function ageTrajectory(position: string, age: number | null): AgeTrajectory {
  if (age == null) return 'unknown'
  const pos = position.toUpperCase()
  if (pos === 'RB') {
    if (age <= 23) return 'ascending'
    if (age <= 25) return 'prime'
    if (age <= 27) return 'aging'
    return 'cliff'
  }
  if (pos === 'WR') {
    if (age <= 23) return 'ascending'
    if (age <= 28) return 'prime'
    if (age <= 30) return 'aging'
    return 'cliff'
  }
  if (pos === 'TE') {
    if (age <= 24) return 'ascending'
    if (age <= 29) return 'prime'
    if (age <= 31) return 'aging'
    return 'cliff'
  }
  if (pos === 'QB') {
    if (age <= 25) return 'ascending'
    if (age <= 33) return 'prime'
    if (age <= 36) return 'aging'
    return 'cliff'
  }
  // K / DEF / IDP — age curve not modeled.
  return 'unknown'
}

/**
 * Deterministic structural TIER for a future rookie pick, on the same rough scale
 * as dynasty player value (so picks can be compared against players in a trade).
 *
 * This is NOT a fabricated market value — it is a transparent function of the pick's
 * own attributes (round + how many seasons out), reflecting the well-known scaling
 * that earlier rounds and nearer drafts are worth more. Far-out picks are discounted.
 * Returns null when the round is unknown.
 */
export function pickHeuristicValue(round: number | null | undefined, seasonsOut: number): number | null {
  if (round == null || !Number.isFinite(round) || round < 1) return null
  const base = round === 1 ? 18 : round === 2 ? 10 : round === 3 ? 5 : 2
  const discount = seasonsOut <= 0 ? 1.0 : seasonsOut === 1 ? 0.95 : seasonsOut === 2 ? 0.85 : 0.7
  return Math.round(base * discount * 100) / 100
}
