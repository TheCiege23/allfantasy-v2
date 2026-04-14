import { normalizePositionToken } from './normalize-position'

/** Mirrors `lib/lineup-optimizer-engine/LineupOptimizerEngine` flex maps for roster legality. */
const FLEX_GROUPS: Record<string, string[]> = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPERFLEX: ['QB', 'RB', 'WR', 'TE'],
  SFLEX: ['QB', 'RB', 'WR', 'TE'],
  UTIL: [
    'PG',
    'SG',
    'SF',
    'PF',
    'C',
    'QB',
    'RB',
    'WR',
    'TE',
    'GKP',
    'DEF',
    'MID',
    'FWD',
    'LW',
    'RW',
    'D',
    'G',
    'SP',
    'RP',
    'P',
    '1B',
    '2B',
    '3B',
    'SS',
    'OF',
    'GOLFER',
    'DRIVER',
    'DST',
  ],
  ANY: [
    'PG',
    'SG',
    'SF',
    'PF',
    'C',
    'QB',
    'RB',
    'WR',
    'TE',
    'GKP',
    'DEF',
    'MID',
    'FWD',
    'LW',
    'RW',
    'D',
    'G',
    'SP',
    'RP',
    'P',
    '1B',
    '2B',
    '3B',
    'SS',
    'OF',
    'GOLFER',
    'DRIVER',
    'DST',
  ],
  G: ['PG', 'SG'],
  F: ['SF', 'PF'],
  W: ['LW', 'RW'],
}

export function allowedPositionsForSlotCode(slotCode: string): Set<string> {
  const code = normalizePositionToken(slotCode)
  const flex = FLEX_GROUPS[code]
  if (flex) return new Set(flex)
  return new Set([code])
}

export function playerEligibleForSlot(playerPositions: string[], slotAllowed: Set<string>): boolean {
  for (const raw of playerPositions) {
    const p = normalizePositionToken(raw)
    if (p && slotAllowed.has(p)) return true
  }
  return false
}

/**
 * Same-position preference before flex depth: how well candidate matches vacated starter positions.
 */
export function slotFitScore(input: {
  slotAllowed: Set<string>
  vacatedStarterPositions: string[]
  candidatePositions: string[]
}): number {
  const cand = input.candidatePositions.map((p) => normalizePositionToken(p)).filter(Boolean)
  const vacated = input.vacatedStarterPositions.map((p) => normalizePositionToken(p)).filter(Boolean)

  let best = 40
  for (const c of cand) {
    if (!input.slotAllowed.has(c)) continue
    if (vacated.includes(c)) best = Math.max(best, 100)
    else if (['RB', 'WR', 'TE'].includes(c) && input.slotAllowed.size > 3) best = Math.max(best, 88)
    else best = Math.max(best, 82)
  }
  return Math.min(100, best)
}
