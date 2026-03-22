/**
 * SportAIContextResolver — sport-aware context for AI (scoring, roster structure, league format).
 */

import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  normalizeToSupportedSport,
  type SupportedSport,
} from '@/lib/sport-scope'

/** All seven platform sports (canonical codes). */
export const AI_SPORT_CODES: readonly SupportedSport[] = [...SUPPORTED_SPORTS]

export function normalizeSportForAI(sport: string | null | undefined): SupportedSport {
  const u = (sport ?? '').toString().trim().toUpperCase()
  if (!u) return DEFAULT_SPORT
  const map: Record<string, SupportedSport> = {
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
  return normalizeToSupportedSport(map[u] ?? u)
}

/**
 * Short label for AI prompts (e.g. "NFL", "NBA dynasty").
 */
export function getSportContextLabel(sport: string, isDynasty?: boolean): string {
  const s = normalizeSportForAI(sport)
  return isDynasty ? `${s} dynasty` : s
}
