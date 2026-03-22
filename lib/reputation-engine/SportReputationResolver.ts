/**
 * SportReputationResolver — normalizes and labels sport for reputation engine.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

import { REPUTATION_SPORTS } from './types'
import {
  normalizeToSupportedSport,
  type SupportedSport,
  isSupportedSport,
  DEFAULT_SPORT,
} from '@/lib/sport-scope'

export function normalizeSportForReputation(sport: string | null | undefined): SupportedSport {
  return normalizeToSupportedSport(sport)
}

export function getReputationSportLabel(sport: string | null | undefined): string {
  const s = normalizeSportForReputation(sport ?? DEFAULT_SPORT)
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
      return s
  }
}

export function isSupportedReputationSport(s: string | null | undefined): boolean {
  return isSupportedSport(s) && (REPUTATION_SPORTS as readonly string[]).includes(s.toUpperCase())
}
