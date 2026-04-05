/**
 * Server-side eligibility for dispersal draft creation (dynasty / devy / salary-style).
 * Delegates to `isLeagueEligibleForDispersalDraft` so API and UI stay aligned.
 */

import { isLeagueEligibleForDispersalDraft } from '@/lib/league/dispersal-draft-eligibility'

export function isDispersalDraftDynastyEligible(league: {
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
  return isLeagueEligibleForDispersalDraft({
    isDynasty: league.isDynasty,
    leagueType,
    leagueVariant: league.leagueVariant,
  })
}
