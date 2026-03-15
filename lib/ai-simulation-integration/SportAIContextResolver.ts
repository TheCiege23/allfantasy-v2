/**
 * SportAIContextResolver — sport-aware context for AI (scoring, roster structure, league format).
 */

/** All seven platform sports (canonical codes). Use for sport-aware logic; do not hardcode a single sport. */
export const AI_SPORT_CODES = ['NFL', 'NHL', 'NBA', 'MLB', 'NCAAB', 'NCAAF', 'SOCCER'] as const

export function normalizeSportForAI(sport: string | null | undefined): string {
  const u = (sport ?? '').toString().trim().toUpperCase()
  if (!u) return 'NFL'
  const map: Record<string, string> = {
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
  return map[u] ?? 'NFL'
}

/**
 * Short label for AI prompts (e.g. "NFL", "NBA dynasty").
 */
export function getSportContextLabel(sport: string, isDynasty?: boolean): string {
  const s = normalizeSportForAI(sport)
  return isDynasty ? `${s} dynasty` : s
}
