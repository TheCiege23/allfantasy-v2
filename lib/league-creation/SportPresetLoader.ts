/**
 * Server-side sport preset loader for league creation.
 * Centralizes sport preset payload + feature flags for end-to-end initialization.
 */
import type { LeagueSport } from '@prisma/client'
import { getCreationPayload } from '@/lib/league-defaults-orchestrator'
import { getSportFeatureFlags } from '@/lib/sport-defaults/SportFeatureFlagsService'

export async function loadSportPresetForCreation(
  sport: LeagueSport,
  variant?: string | null
) {
  const [payload, featureFlags] = await Promise.all([
    getCreationPayload(sport, variant ?? null),
    getSportFeatureFlags(sport),
  ])
  return {
    ...payload,
    featureFlags,
  }
}
