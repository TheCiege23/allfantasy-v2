/**
 * BracketBoardRenderer — pure helpers for bracket board: round labels, region order, cell keys.
 */

export const DEFAULT_REGION_ORDER = ['West', 'East', 'South', 'Midwest'] as const

/**
 * Round display label (e.g. "Round of 64", "Championship").
 */
export function getRoundLabel(round: number): string {
  const labels: Record<number, string> = {
    0: 'First Four',
    1: 'Round of 64',
    2: 'Round of 32',
    3: 'Sweet 16',
    4: 'Elite 8',
    5: 'Final Four',
    6: 'Championship',
  }
  return labels[round] ?? `Round ${round}`
}

/**
 * Short round label for compact UI.
 */
export function getRoundShortLabel(round: number): string {
  const labels: Record<number, string> = {
    0: 'FF',
    1: 'R64',
    2: 'R32',
    3: 'S16',
    4: 'E8',
    5: 'F4',
    6: 'CH',
  }
  return labels[round] ?? `R${round}`
}

/**
 * Cell key for React list (round + slot or node id).
 */
export function getBracketCellKey(round: number, slotOrId: string): string {
  return `r${round}-${slotOrId}`
}
