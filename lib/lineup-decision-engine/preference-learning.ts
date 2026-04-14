import type { UserLineupPreferenceProfileInput } from './types'

/**
 * Long-term: persist accept/reject events and weekly outcomes; for now this merges
 * API-supplied profile with safe defaults so preferences never dominate projections.
 */
export function normalizePreferenceProfile(
  raw?: UserLineupPreferenceProfileInput | null
): UserLineupPreferenceProfileInput {
  const preferenceWeight = Math.max(0, Math.min(1, raw?.preferenceWeight ?? 0.35))
  return {
    prefersStableVeterans: clamp01(raw?.prefersStableVeterans),
    prefersHighCeiling: clamp01(raw?.prefersHighCeiling),
    prefersRookies: clamp01(raw?.prefersRookies),
    prefersStarsOverMatchups: clamp01(raw?.prefersStarsOverMatchups),
    prefersTeamLoyalty: clamp01(raw?.prefersTeamLoyalty),
    prefersConsistency: clamp01(raw?.prefersConsistency),
    prefersAggressiveUnderdogLineups: clamp01(raw?.prefersAggressiveUnderdogLineups),
    prefersSafeFavoriteLineups: clamp01(raw?.prefersSafeFavoriteLineups),
    prefersMatchupChasing: clamp01(raw?.prefersMatchupChasing),
    prefersSamePositionEmergency: clamp01(raw?.prefersSamePositionEmergency),
    allowsAutoSub: clamp01(raw?.allowsAutoSub),
    injuryContingencyTrust: clamp01(raw?.injuryContingencyTrust),
    positionTrust: raw?.positionTrust,
    preferenceWeight,
  }
}

function clamp01(n?: number): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined
  return Math.max(0, Math.min(1, n))
}
