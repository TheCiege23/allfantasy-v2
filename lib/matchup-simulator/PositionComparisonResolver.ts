/**
 * PositionComparisonResolver — position-by-position comparison where supported.
 * Uses sport-scope for supported sports; returns position labels and optional per-position advantage.
 */

import { SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'

export type PositionSlot = {
  id: string
  label: string
  order: number
}

/** Position labels by sport (common fantasy slots). */
const POSITIONS_BY_SPORT: Record<SupportedSport, PositionSlot[]> = {
  NFL: [
    { id: 'QB', label: 'QB', order: 1 },
    { id: 'RB', label: 'RB', order: 2 },
    { id: 'WR', label: 'WR', order: 3 },
    { id: 'TE', label: 'TE', order: 4 },
    { id: 'FLEX', label: 'FLEX', order: 5 },
    { id: 'K', label: 'K', order: 6 },
    { id: 'DST', label: 'DST', order: 7 },
  ],
  NHL: [
    { id: 'C', label: 'C', order: 1 },
    { id: 'LW', label: 'LW', order: 2 },
    { id: 'RW', label: 'RW', order: 3 },
    { id: 'D', label: 'D', order: 4 },
    { id: 'G', label: 'G', order: 5 },
    { id: 'UTIL', label: 'UTIL', order: 6 },
  ],
  NBA: [
    { id: 'PG', label: 'PG', order: 1 },
    { id: 'SG', label: 'SG', order: 2 },
    { id: 'SF', label: 'SF', order: 3 },
    { id: 'PF', label: 'PF', order: 4 },
    { id: 'C', label: 'C', order: 5 },
    { id: 'G', label: 'G', order: 6 },
    { id: 'F', label: 'F', order: 7 },
    { id: 'UTIL', label: 'UTIL', order: 8 },
  ],
  MLB: [
    { id: 'C', label: 'C', order: 1 },
    { id: '1B', label: '1B', order: 2 },
    { id: '2B', label: '2B', order: 3 },
    { id: '3B', label: '3B', order: 4 },
    { id: 'SS', label: 'SS', order: 5 },
    { id: 'OF', label: 'OF', order: 6 },
    { id: 'DH', label: 'DH', order: 7 },
    { id: 'UTIL', label: 'UTIL', order: 8 },
    { id: 'SP', label: 'SP', order: 9 },
    { id: 'RP', label: 'RP', order: 10 },
    { id: 'P', label: 'P', order: 11 },
  ],
  NCAAB: [
    { id: 'PG', label: 'PG', order: 1 },
    { id: 'SG', label: 'SG', order: 2 },
    { id: 'SF', label: 'SF', order: 3 },
    { id: 'PF', label: 'PF', order: 4 },
    { id: 'C', label: 'C', order: 5 },
    { id: 'G', label: 'G', order: 6 },
    { id: 'F', label: 'F', order: 7 },
    { id: 'UTIL', label: 'UTIL', order: 8 },
  ],
  NCAAF: [
    { id: 'QB', label: 'QB', order: 1 },
    { id: 'RB', label: 'RB', order: 2 },
    { id: 'WR', label: 'WR', order: 3 },
    { id: 'TE', label: 'TE', order: 4 },
    { id: 'FLEX', label: 'FLEX', order: 5 },
    { id: 'K', label: 'K', order: 6 },
    { id: 'DST', label: 'DST', order: 7 },
  ],
  SOCCER: [
    { id: 'GKP', label: 'GKP', order: 1 },
    { id: 'DEF', label: 'DEF', order: 2 },
    { id: 'MID', label: 'MID', order: 3 },
    { id: 'FWD', label: 'FWD', order: 4 },
    { id: 'UTIL', label: 'UTIL', order: 5 },
  ],
}

/**
 * Get ordered position slots for a sport (for position comparison block).
 */
export function getPositionSlotsForSport(sport: string): PositionSlot[] {
  const key = (SUPPORTED_SPORTS as readonly string[]).includes(sport?.toUpperCase())
    ? (sport.toUpperCase() as SupportedSport)
    : 'NFL'
  const slots = POSITIONS_BY_SPORT[key] ?? POSITIONS_BY_SPORT.NFL
  return [...slots].sort((a, b) => a.order - b.order)
}
