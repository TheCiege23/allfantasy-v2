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

/** IDP slot counts for best ball (grouped: DL/LB/DB/IDP_FLEX; split: DE/DT/LB/CB/S). */
export interface IdpBestBallSlots {
  de?: number
  dt?: number
  lb: number
  cb?: number
  s?: number
  dl?: number
  db?: number
  idpFlex?: number
}

export interface DevyBestBallSlotsNFL {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  superflex: boolean
  /** When set, optimizer fills IDP slots (grouped or split) with highest-scoring eligible players. */
  idp?: IdpBestBallSlots
}

export interface DevyBestBallSlotsNBA {
  g: number
  f: number
  c: number
  flex: number
}

const NFL_FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])
const NFL_SUPERFLEX_ELIGIBLE = new Set(['QB', 'RB', 'WR', 'TE'])
const IDP_POSITIONS = new Set(['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'])
const DL_ELIGIBLE = new Set(['DE', 'DT'])
const DB_ELIGIBLE = new Set(['CB', 'S', 'SS', 'FS'])
const IDP_FLEX_ELIGIBLE = new Set(['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'])
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

  const byPos: Record<string, typeof eligible> = {
    QB: [], RB: [], WR: [], TE: [],
    DE: [], DT: [], LB: [], CB: [], S: [], SS: [], FS: [],
  }
  for (const p of eligible) {
    if (byPos[p.pos]) byPos[p.pos].push(p)
    else if (IDP_POSITIONS.has(p.pos)) {
      const slot = p.pos === 'SS' || p.pos === 'FS' ? 'S' : p.pos
      if (byPos[slot]) byPos[slot].push(p)
    }
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

  const idp = slots.idp
  if (idp) {
    const idpEligible = eligible.filter((p) => !used.has(p.playerId) && IDP_POSITIONS.has(p.pos))
    idpEligible.sort((a, b) => b.points - a.points)

    const takeIdp = (pred: (pos: string) => boolean, count: number) => {
      let n = 0
      for (const p of idpEligible) {
        if (n >= count) break
        if (used.has(p.playerId) || !pred(p.pos)) continue
        used.add(p.playerId)
        starters.push(p)
        n++
      }
    }

    if ((idp.de ?? 0) > 0) take('DE', idp.de!)
    if ((idp.dt ?? 0) > 0) take('DT', idp.dt!)
    if (idp.lb > 0) take('LB', idp.lb)
    if ((idp.cb ?? 0) > 0) take('CB', idp.cb!)
    if ((idp.s ?? 0) > 0) take('S', idp.s ?? 0)
    const dlN: number = idp.dl !== undefined && idp.dl !== null ? idp.dl : 0
    const dbN: number = idp.db !== undefined && idp.db !== null ? idp.db : 0
    const flexN: number = idp.idpFlex !== undefined && idp.idpFlex !== null ? idp.idpFlex : 0
    if (dlN > 0) takeIdp((pos) => DL_ELIGIBLE.has(pos), dlN)
    if (dbN > 0) takeIdp((pos) => DB_ELIGIBLE.has(pos), dbN)
    if (flexN > 0) takeIdp((pos) => IDP_FLEX_ELIGIBLE.has(pos), flexN)
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
