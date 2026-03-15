/**
 * SportReputationResolver — normalizes and labels sport for reputation engine.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

import { REPUTATION_SPORTS } from './types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export function normalizeSportForReputation(sport: string | null | undefined): string {
  return normalizeToSupportedSport(sport)
}

export function getReputationSportLabel(sport: string): string {
  const s = sport?.toUpperCase()
  switch (s) {
    case 'NFL':
      return 'NFL'
    case 'NHL':
      return 'NHL'
    case 'NBA':
      return 'NBA'
    case 'MLB':
      return 'MLB'
    case 'NCAAF':
      return 'NCAA Football'
    case 'NCAAB':
      return 'NCAA Basketball'
    case 'SOCCER':
      return 'Soccer'
    default:
      return sport ?? 'Unknown'
  }
}

export function isSupportedReputationSport(s: string): boolean {
  return (REPUTATION_SPORTS as readonly string[]).includes(s.toUpperCase())
}
