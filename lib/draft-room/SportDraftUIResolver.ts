/**
 * SportDraftUIResolver — sport-aware position filter options for draft room.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER per sport-scope.
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { getPositionsForSport } from '@/lib/roster-defaults/PositionEligibilityResolver'
import { getSlotNamesForSport } from '@/lib/roster-defaults/RosterDefaultsRegistry'

export type PositionFilterOption = { value: string; label: string }
export type DraftSportOption = { value: string; label: string }

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
  const positions = getPositionsForSport(normalized, formatType)
  const options: PositionFilterOption[] = [{ value: 'All', label: 'All' }]
  const addOption = (value: string, label: string = value) => {
    if (!options.some((opt) => opt.value === value)) options.push({ value, label })
  }

  if (isIdp) {
    const upper = new Set(positions.map((p) => p.toUpperCase()))
    const hasOffense = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'].some((p) => upper.has(p))
    if (hasOffense) addOption('Offense', 'Offense')
    if (upper.has('DE') || upper.has('DT')) addOption('DL', 'DL')
    if (upper.has('LB')) addOption('LB', 'LB')
    if (upper.has('CB') || upper.has('S')) addOption('DB', 'DB')
    if (upper.has('DE') || upper.has('DT') || upper.has('LB') || upper.has('CB') || upper.has('S')) {
      addOption('IDP_FLEX', 'IDP FLEX')
    }
    if (['RB', 'WR', 'TE'].some((p) => upper.has(p))) addOption('FLEX', 'FLEX')

    for (const p of positions) addOption(p, p)
    return options
  }

  const added = new Set<string>(['All'])
  for (const p of positions) {
    if (p && !added.has(p)) {
      added.add(p)
      addOption(p, p)
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

const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAA Basketball',
  NCAAF: 'NCAA Football',
  SOCCER: 'Soccer',
}

export function getDraftSportOptions(): DraftSportOption[] {
  return SUPPORTED_SPORTS.map((sport) => ({
    value: sport,
    label: SPORT_LABELS[sport] ?? sport,
  }))
}
