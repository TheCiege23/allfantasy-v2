/**
 * SportCareerResolver — sport normalization and labels for GM economy (career tracking).
 * Uses lib/sport-scope for NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import {
  isSupportedSport,
  normalizeToSupportedSport,
  SUPPORTED_SPORTS,
  type SupportedSport,
} from '@/lib/sport-scope'

export const GM_CAREER_SPORTS: readonly SupportedSport[] = SUPPORTED_SPORTS

export function normalizeSportForGMCareer(sport: string | null | undefined): SupportedSport {
  return normalizeToSupportedSport(sport)
}

export function isSupportedGMCareerSport(sport: string | null | undefined): sport is SupportedSport {
  return isSupportedSport(sport)
}

export const GM_CAREER_SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAF: 'NCAA Football',
  NCAAB: 'NCAA Basketball',
  SOCCER: 'Soccer',
}

export function getGMCareerSportLabel(sport: string): string {
  return GM_CAREER_SPORT_LABELS[sport] ?? sport
}
