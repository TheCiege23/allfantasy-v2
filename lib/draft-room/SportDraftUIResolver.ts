/**
 * SportDraftUIResolver — sport-aware position filter options for draft room.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER per sport-scope.
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { getPositionsForSport } from '@/lib/roster-defaults/PositionEligibilityResolver'

export type PositionFilterOption = { value: string; label: string }

/**
 * Get position filter options for draft room (All + sport positions).
 * FLEX included when sport has RB/WR/TE (e.g. NFL).
 */
export function getPositionFilterOptionsForSport(
  sport: string,
  formatType?: string
): PositionFilterOption[] {
  const normalized = normalizeToSupportedSport(sport)
  const positions = getPositionsForSport(normalized, formatType)
  const options: PositionFilterOption[] = [{ value: 'All', label: 'All' }]
  const added = new Set<string>()
  for (const p of positions) {
    if (p && !added.has(p)) {
      added.add(p)
      options.push({ value: p, label: p })
    }
  }
  // Add FLEX for football-style sports if we have RB, WR, TE
  if (
    ['NFL', 'NCAAF'].includes(normalized) &&
    positions.some((x) => ['RB', 'WR', 'TE'].includes(x)) &&
    !added.has('FLEX')
  ) {
    options.push({ value: 'FLEX', label: 'FLEX' })
  }
  return options
}

/**
 * Default roster slot names for a sport (when league roster slots not provided).
 * Used as fallback in mock draft room.
 */
export function getDefaultRosterSlotsForSport(sport: string): string[] {
  const normalized = normalizeToSupportedSport(sport)
  const map: Record<string, string[]> = {
    NFL: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'],
    NHL: ['C', 'C', 'LW', 'LW', 'RW', 'RW', 'D', 'D', 'G', 'UTIL', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'],
    NBA: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'],
    MLB: ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'UTIL', 'SP', 'SP', 'RP', 'RP', 'P', 'BENCH', 'BENCH', 'BENCH'],
    NCAAB: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'],
    NCAAF: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'],
    SOCCER: ['GKP', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD', 'UTIL', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'],
  }
  return map[normalized] ?? map.NFL
}

/**
 * List of supported sport codes for draft room (display or dropdown).
 */
export function getSupportedDraftSports(): readonly string[] {
  return SUPPORTED_SPORTS
}
