/**
 * Unified league defaults orchestrator. Single entry point for resolving and applying
 * all sport-aware and variant-aware presets during league creation.
 *
 * Responsibilities:
 * - Resolve and apply: sport metadata, league settings, roster, scoring, draft, waiver, playoff, schedule, team/player pool context, league_variant.
 * - Ensure frontend preview values match persisted created league values.
 * - NFL IDP treated as NFL variant; Soccer as first-class sport.
 */
import type { LeagueSport } from '@prisma/client'
import { resolveLeaguePresetPipeline } from './LeaguePresetResolutionPipeline'
import { buildSettingsPreview, getSettingsPreviewSummary } from './LeagueSettingsPreviewBuilder'
import { runLeagueInitialization } from './LeagueCreationInitializationService'
import { resolveSportVariantContext } from './SportVariantContextResolver'
import type { LeagueCreationDefaultsPayload } from '@/lib/sport-defaults/LeagueCreationDefaultsLoader'
import type { BootstrapResult } from '@/lib/league-creation/LeagueBootstrapOrchestrator'
import type { CreationOverrides } from './LeagueSettingsPreviewBuilder'

export type { LeagueCreationDefaultsPayload }
export type { BootstrapResult }
export type { CreationOverrides }
export { resolveSportVariantContext } from './SportVariantContextResolver'
export { buildSettingsPreview, getSettingsPreviewSummary } from './LeagueSettingsPreviewBuilder'
export { runLeagueInitialization } from './LeagueCreationInitializationService'

/**
 * Get the full creation payload for a sport and variant (for form and preset summary).
 * Same data as GET /api/sport-defaults?sport=X&load=creation&variant=Y.
 */
export async function getCreationPayload(
  sport: LeagueSport | string,
  variant?: string | null
): Promise<LeagueCreationDefaultsPayload> {
  const result = await resolveLeaguePresetPipeline(sport as LeagueSport, variant ?? null)
  return result.payload
}

/**
 * Get the exact initial settings object that will be persisted to League.settings.
 * Use so preview panel and saved league configuration match. Pass same overrides as create API (e.g. superflex, dynasty).
 */
export function getInitialSettingsForCreation(
  sport: LeagueSport | string,
  variant?: string | null,
  overrides?: CreationOverrides
): Record<string, unknown> {
  return buildSettingsPreview(sport as LeagueSport, variant ?? null, overrides)
}

/**
 * Get creation payload and initial settings in one call (for preview consistency).
 */
export async function getCreationPayloadAndSettings(
  sport: LeagueSport | string,
  variant?: string | null,
  overrides?: CreationOverrides
): Promise<{
  payload: LeagueCreationDefaultsPayload
  initialSettings: Record<string, unknown>
  settingsSummary: ReturnType<typeof getSettingsPreviewSummary>
  context: ReturnType<typeof resolveSportVariantContext>
}> {
  const pipeline = await resolveLeaguePresetPipeline(sport as LeagueSport, variant ?? null)
  const initialSettings = overrides
    ? buildSettingsPreview(pipeline.context.sport, pipeline.context.variant, overrides)
    : pipeline.initialSettingsForPreview
  const settingsSummary = getSettingsPreviewSummary(
    pipeline.context.sport,
    pipeline.context.variant,
    overrides ?? undefined
  )
  return {
    payload: pipeline.payload,
    initialSettings,
    settingsSummary,
    context: pipeline.context,
  }
}

/**
 * Run post-create initialization (roster, settings, scoring, waiver, draft, playoff, schedule, player pool).
 * Call once after League is created. Idempotent where applicable.
 */
export async function runPostCreateInitialization(
  leagueId: string,
  sport: LeagueSport | string,
  variantOrFormat?: string | null
): Promise<BootstrapResult> {
  return runLeagueInitialization(leagueId, sport as LeagueSport, variantOrFormat ?? null)
}
