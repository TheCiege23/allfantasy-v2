/**
 * SportBehaviorResolver — sport-aware calibration for psychological profiles.
 * Behavior signals can have different meaning per sport (e.g. trade frequency in NFL vs MLB).
 */

import type { PsychSport } from './types'
import { PSYCH_SPORTS } from './types'

const SPORT_MAP: Record<string, PsychSport> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAAB',
  'NCAA BASKETBALL': 'NCAAB',
  NCAAF: 'NCAAF',
  'NCAA FOOTBALL': 'NCAAF',
  SOCCER: 'SOCCER',
}

export function normalizeSportForPsych(sport: string | null | undefined): PsychSport | null {
  const u = (sport ?? '').toString().trim().toUpperCase()
  if (!u) return null
  return SPORT_MAP[u] ?? null
}

export function getPsychSportLabel(sport: string | null | undefined): string {
  const s = normalizeSportForPsych(sport)
  if (!s) return 'Unknown'
  const labels: Record<PsychSport, string> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAA Basketball',
    NCAAF: 'NCAA Football',
    SOCCER: 'Soccer',
  }
  return labels[s]
}

export function isSupportedPsychSport(sport: string | null | undefined): boolean {
  return normalizeSportForPsych(sport) != null
}

/** Optional: scale trade-frequency threshold by sport (e.g. higher bar for NFL). */
export function getTradeFrequencyThreshold(sport: PsychSport): number {
  switch (sport) {
    case 'NFL':
      return 6
    case 'MLB':
    case 'NBA':
      return 8
    default:
      return 5
  }
}

/** Optional: scale waiver-activity threshold by sport. */
export function getWaiverFocusThreshold(sport: PsychSport): number {
  return 15
}

export { PSYCH_SPORTS }
