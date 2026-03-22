/**
 * SportBehaviorResolver — sport-aware calibration for psychological profiles.
 * Behavior signals can have different meaning per sport (e.g. trade frequency in NFL vs MLB).
 */

import type { PsychSport } from './types'
import { PSYCH_SPORTS } from './types'
import { isSupportedSport } from '@/lib/sport-scope'

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
  const canonical = SPORT_MAP[u] ?? u
  return isSupportedSport(canonical) ? canonical : null
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
  switch (sport) {
    case 'MLB':
      return 20
    case 'NBA':
      return 18
    default:
      return 15
  }
}

export function getBehaviorCalibration(sport: PsychSport): {
  lineupVolatilityWeight: number
  lateTradeWeekThreshold: number
  rookiePreferenceWeight: number
} {
  switch (sport) {
    case 'NFL':
      return { lineupVolatilityWeight: 0.8, lateTradeWeekThreshold: 9, rookiePreferenceWeight: 0.9 }
    case 'NHL':
      return { lineupVolatilityWeight: 1.05, lateTradeWeekThreshold: 10, rookiePreferenceWeight: 0.85 }
    case 'NBA':
      return { lineupVolatilityWeight: 1.1, lateTradeWeekThreshold: 11, rookiePreferenceWeight: 1.05 }
    case 'MLB':
      return { lineupVolatilityWeight: 1.15, lateTradeWeekThreshold: 12, rookiePreferenceWeight: 0.95 }
    case 'NCAAB':
      return { lineupVolatilityWeight: 1.0, lateTradeWeekThreshold: 8, rookiePreferenceWeight: 1.2 }
    case 'NCAAF':
      return { lineupVolatilityWeight: 0.95, lateTradeWeekThreshold: 7, rookiePreferenceWeight: 1.15 }
    case 'SOCCER':
      return { lineupVolatilityWeight: 1.1, lateTradeWeekThreshold: 10, rookiePreferenceWeight: 1.0 }
  }
}

export { PSYCH_SPORTS }
