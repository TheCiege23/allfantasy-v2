/**
 * SportDraftUIResolver — sport-aware position filter options for draft room.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER per sport-scope.
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { getPositionsForSport } from '@/lib/roster-defaults/PositionEligibilityResolver'
import { getSlotNamesForSport } from '@/lib/roster-defaults/RosterDefaultsRegistry'

export type PositionFilterOption = { value: string; label: string }

/**
 * Get position filter options for draft room (All + sport positions).
 * FLEX included when sport has RB/WR/TE (e.g. NFL).
 * For NFL IDP (formatType IDP): adds Offense, DL, LB, DB, DE, DT, CB, S, IDP FLEX.
 */
export function getPositionFilterOptionsForSport(
  sport: string,
  formatType?: string
): PositionFilterOption[] {
  const normalized = normalizeToSupportedSport(sport)
  const format = String(formatType ?? '').toUpperCase()
  const isIdp = normalized === 'NFL' && (format === 'IDP' || format === 'DYNASTY_IDP')
  if (isIdp) {
    const options: PositionFilterOption[] = [
      { value: 'All', label: 'All' },
      { value: 'Offense', label: 'Offense' },
      { value: 'DL', label: 'DL' },
      { value: 'LB', label: 'LB' },
      { value: 'DB', label: 'DB' },
      { value: 'DE', label: 'DE' },
      { value: 'DT', label: 'DT' },
      { value: 'CB', label: 'CB' },
      { value: 'S', label: 'S' },
      { value: 'IDP_FLEX', label: 'IDP FLEX' },
      { value: 'FLEX', label: 'FLEX' },
    ]
    return options
  }
  const positions = getPositionsForSport(normalized, formatType)
  const options: PositionFilterOption[] = [{ value: 'All', label: 'All' }]
  const added = new Set<string>()
  for (const p of positions) {
    if (p && !added.has(p)) {
      added.add(p)
      options.push({ value: p, label: p })
    }
  }
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
  return getSlotNamesForSport(normalized)
}

/**
 * List of supported sport codes for draft room (display or dropdown).
 */
export function getSupportedDraftSports(): readonly string[] {
  return SUPPORTED_SPORTS
}
