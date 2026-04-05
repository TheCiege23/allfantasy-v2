/**
 * Server-side eligibility for supplemental draft creation (dynasty / devy / salary-style).
 * Delegates to `isLeagueEligibleForSupplementalDraft` so API and UI stay aligned.
 */

import { isLeagueEligibleForSupplementalDraft } from '@/lib/league/supplemental-draft-eligibility'

export function isSupplementalDraftDynastyEligible(league: {
  isDynasty: boolean
  leagueVariant: string | null
  leagueType: string | null
  settings: unknown
}): boolean {
  const s =
    league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
      ? (league.settings as Record<string, unknown>)
      : {}
  const leagueType =
    league.leagueType ?? (typeof s.leagueType === 'string' ? s.leagueType : null)
  return isLeagueEligibleForSupplementalDraft({
    isDynasty: league.isDynasty,
    leagueType,
    leagueVariant: league.leagueVariant,
  })
}
