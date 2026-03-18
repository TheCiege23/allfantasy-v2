/**
 * PROMPT 4: Deterministic best ball optimizer for Devy Dynasty.
 * NFL: QB, RB, WR, TE, FLEX, optional SUPER_FLEX. NCAA devy = 0 until promoted; taxi per league toggle.
 * NBA: G, F, C, FLEX. NCAA devy = 0 until promoted.
 */

import type { DevyLeagueConfigShape } from '../types'

export interface BestBallPlayerInput {
  playerId: string
  name: string
  position: string
  points: number
  /** True if NCAA devy (not yet promoted) — scores 0 in best ball. */
  isNcaaDevy: boolean
  /** True if on taxi; contributes only when taxiProRookiesScoreInBestBall and is pro rookie. */
  isTaxi: boolean
  /** True if pro rookie (first year pro); matters when on taxi and taxiScoringAllowed. */
  isProRookie?: boolean
}

export interface DevyBestBallSlotsNFL {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  superflex: boolean
}

export interface DevyBestBallSlotsNBA {
  g: number
  f: number
  c: number
  flex: number
}

const NFL_FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])
const NFL_SUPERFLEX_ELIGIBLE = new Set(['QB', 'RB', 'WR', 'TE'])
const NBA_G = new Set(['PG', 'SG', 'G'])
const NBA_F = new Set(['SF', 'PF', 'F'])
const NBA_C = new Set(['C'])

function mapNbaPosition(pos: string): 'G' | 'F' | 'C' {
  const u = pos.toUpperCase()
  if (NBA_G.has(u)) return 'G'
  if (NBA_F.has(u)) return 'F'
  if (NBA_C.has(u)) return 'C'
  if (u === 'G' || u === 'F') return u
  return 'F'
}

/**
 * Filter to players who can contribute to best ball this period.
 * NCAA devy = 0 (excluded from lineup). Taxi: only if config allows and is pro rookie.
 */
function eligibleForBestBall(
  p: BestBallPlayerInput,
  config: { taxiProRookiesScoreInBestBall?: boolean }
): boolean {
  if (p.isNcaaDevy) return false
  if (p.isTaxi) {
    if (!config.taxiProRookiesScoreInBestBall) return false
    return p.isProRookie === true
  }
  return true
}

/**
 * NFL best ball: choose highest-scoring eligible lineup. Slots from config or defaults.
 */
export function optimizeNflBestBallLineup(
  players: BestBallPlayerInput[],
  slots: DevyBestBallSlotsNFL,
  config: Pick<DevyLeagueConfigShape, 'taxiProRookiesScoreInBestBall'>
): { totalPoints: number; starters: BestBallPlayerInput[] } {
  const eligible = players
    .filter((p) => eligibleForBestBall(p, config))
    .map((p) => ({ ...p, pos: p.position.toUpperCase() }))

  const byPos: Record<string, typeof eligible> = { QB: [], RB: [], WR: [], TE: [] }
  for (const p of eligible) {
    if (byPos[p.pos]) byPos[p.pos].push(p)
  }
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort((a, b) => b.points - a.points)
  }

  const used = new Set<string>()
  const starters: BestBallPlayerInput[] = []

  function take(pos: string, count: number) {
    const pool = byPos[pos] || []
    let n = 0
    for (const p of pool) {
      if (n >= count) break
      const key = p.playerId
      if (used.has(key)) continue
      used.add(key)
      starters.push(p)
      n++
    }
  }

  take('QB', slots.qb)
  take('RB', slots.rb)
  take('WR', slots.wr)
  take('TE', slots.te)

  const flexPool = eligible.filter((p) => !used.has(p.playerId) && NFL_FLEX_ELIGIBLE.has(p.pos))
  flexPool.sort((a, b) => b.points - a.points)
  for (let i = 0; i < slots.flex && i < flexPool.length; i++) {
    used.add(flexPool[i].playerId)
    starters.push(flexPool[i])
  }

  if (slots.superflex) {
    const sfPool = eligible.filter((p) => !used.has(p.playerId) && NFL_SUPERFLEX_ELIGIBLE.has(p.pos))
    sfPool.sort((a, b) => b.points - a.points)
    if (sfPool.length > 0) {
      used.add(sfPool[0].playerId)
      starters.push(sfPool[0])
    }
  }

  const totalPoints = starters.reduce((s, p) => s + p.points, 0)
  return { totalPoints, starters }
}

/**
 * NBA best ball: G, F, C, FLEX. NCAA devy = 0.
 */
export function optimizeNbaBestBallLineup(
  players: BestBallPlayerInput[],
  slots: DevyBestBallSlotsNBA,
  config: Pick<DevyLeagueConfigShape, 'taxiProRookiesScoreInBestBall'>
): { totalPoints: number; starters: BestBallPlayerInput[] } {
  const eligible = players
    .filter((p) => eligibleForBestBall(p, config))
    .map((p) => ({ ...p, slot: mapNbaPosition(p.position) }))

  const bySlot: Record<string, typeof eligible> = { G: [], F: [], C: [] }
  for (const p of eligible) {
    bySlot[p.slot].push(p)
  }
  for (const slot of Object.keys(bySlot)) {
    bySlot[slot].sort((a, b) => b.points - a.points)
  }

  const used = new Set<string>()
  const starters: BestBallPlayerInput[] = []

  function take(slot: 'G' | 'F' | 'C', count: number) {
    const pool = bySlot[slot] || []
    let n = 0
    for (const p of pool) {
      if (n >= count) break
      if (used.has(p.playerId)) continue
      used.add(p.playerId)
      starters.push(p)
      n++
    }
  }

  take('G', slots.g)
  take('F', slots.f)
  take('C', slots.c)

  const flexPool = eligible.filter((p) => !used.has(p.playerId))
  flexPool.sort((a, b) => b.points - a.points)
  for (let i = 0; i < slots.flex && i < flexPool.length; i++) {
    used.add(flexPool[i].playerId)
    starters.push(flexPool[i])
  }

  const totalPoints = starters.reduce((s, p) => s + p.points, 0)
  return { totalPoints, starters }
}

/**
 * Default NFL slots (1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, no SF).
 */
export const DEFAULT_NFL_BESTBALL_SLOTS: DevyBestBallSlotsNFL = {
  qb: 1,
  rb: 2,
  wr: 2,
  te: 1,
  flex: 1,
  superflex: false,
}

/**
 * Default NBA slots (1 G, 1 F, 1 C, 1 FLEX).
 */
export const DEFAULT_NBA_BESTBALL_SLOTS: DevyBestBallSlotsNBA = {
  g: 1,
  f: 1,
  c: 1,
  flex: 1,
}
