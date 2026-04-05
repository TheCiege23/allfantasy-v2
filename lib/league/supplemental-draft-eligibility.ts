type LeagueEligibilityFields = {
  isDynasty: boolean
  leagueType: string | null
  leagueVariant: string | null
}

/**
 * Supplemental draft is intended for dynasty / devy / C2C / salary-cap style leagues — not pure redraft.
 */
export function isLeagueEligibleForSupplementalDraft(league: LeagueEligibilityFields): boolean {
  const lt = (league.leagueType ?? '').toLowerCase()
  if (lt === 'redraft') return false
  if (league.isDynasty) return true
  const lv = (league.leagueVariant ?? '').toLowerCase()
  if (
    lv.includes('devy') ||
    lv.includes('c2c') ||
    lv.includes('merged_devy') ||
    lv.includes('salary') ||
    lv.includes('cap') ||
    lv.includes('dynasty') ||
    lv.includes('idp')
  ) {
    return true
  }
  return false
}
