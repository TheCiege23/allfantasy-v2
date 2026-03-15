/**
 * Single pipeline that resolves all league creation presets (metadata, league, roster, scoring,
 * draft, waiver, playoff, schedule) for a sport and variant. Ensures one consistent source of truth.
 */
import type { LeagueSport } from '@prisma/client'
import { loadLeagueCreationDefaults } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'
import { buildInitialLeagueSettings } from '@/lib/sport-defaults/LeagueDefaultSettingsService'
import { resolveSportVariantContext } from './SportVariantContextResolver'
import type { LeagueCreationDefaultsPayload } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'

export interface LeaguePresetResolutionResult {
  /** Full creation payload (for form and preview). */
  payload: LeagueCreationDefaultsPayload
  /** Exact settings object that will be persisted to League.settings (for preview consistency). */
  initialSettingsForPreview: Record<string, unknown>
  /** Resolved sport/variant context. */
  context: ReturnType<typeof resolveSportVariantContext>
}

/**
 * Resolve all presets and the exact initial settings in one call. Use for league creation flow
 * so frontend preview values match persisted created league values.
 */
export async function resolveLeaguePresetPipeline(
  sport: LeagueSport | string,
  variant?: string | null
): Promise<LeaguePresetResolutionResult> {
  const context = resolveSportVariantContext(sport as LeagueSport, variant ?? null)
  const leagueSport = context.sport

  const [payload, initialSettingsForPreview] = await Promise.all([
    loadLeagueCreationDefaults(leagueSport, context.variant ?? undefined),
    Promise.resolve(buildInitialLeagueSettings(leagueSport, context.variant ?? undefined)),
  ])

  return {
    payload,
    initialSettingsForPreview: initialSettingsForPreview as Record<string, unknown>,
    context,
  }
}
