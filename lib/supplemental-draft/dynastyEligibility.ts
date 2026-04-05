/**
 * Supplemental draft is limited to dynasty-style leagues (explicit flag or variant/settings).
 */

export function isSupplementalDraftDynastyEligible(league: {
  isDynasty: boolean
  leagueVariant: string | null
  settings: unknown
}): boolean {
  if (league.isDynasty) return true
  const v = String(league.leagueVariant ?? '').toLowerCase()
  if (v.includes('dynasty') || v.includes('devy')) return true
  const s =
    league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
      ? (league.settings as Record<string, unknown>)
      : {}
  const lt = String(s.leagueType ?? s.format ?? s.mode ?? '').toLowerCase()
  if (lt.includes('dynasty') || lt.includes('devy')) return true
  return false
}
