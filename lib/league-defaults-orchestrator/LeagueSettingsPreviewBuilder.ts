/**
 * Builds the exact League.settings object that will be persisted on league creation.
 * Use so frontend "settings preview" matches what is actually saved.
 */
import type { LeagueSport } from '@prisma/client'
import { buildInitialLeagueSettings } from '@/lib/sport-defaults/LeagueDefaultSettingsService'
import { resolveSportVariantContext } from './SportVariantContextResolver'

export interface CreationOverrides {
  superflex?: boolean
  roster_mode?: 'redraft' | 'dynasty' | 'keeper'
  /** Any additional keys to merge (e.g. from form). */
  extra?: Record<string, unknown>
}

/**
 * Build the exact settings object that will be written to League.settings when a league is created.
 * Pass the same sport and variant (and optional overrides) that the create API will use so preview matches persisted values.
 */
export function buildSettingsPreview(
  sport: LeagueSport | string,
  variant?: string | null,
  overrides?: CreationOverrides
): Record<string, unknown> {
  const context = resolveSportVariantContext(sport as LeagueSport, variant ?? null)
  const base = buildInitialLeagueSettings(context.sport, context.variant ?? undefined) as Record<string, unknown>

  const merged = { ...base }
  if (overrides?.superflex) merged.superflex = true
  if (overrides?.roster_mode) merged.roster_mode = overrides.roster_mode
  if (overrides?.extra && typeof overrides.extra === 'object') {
    Object.assign(merged, overrides.extra)
  }
  return merged
}

/**
 * Return a minimal summary of settings that will be saved (for preview panel comparison).
 */
export function getSettingsPreviewSummary(
  sport: LeagueSport | string,
  variant?: string | null,
  overrides?: CreationOverrides
): {
  playoff_team_count: number
  regular_season_length: number
  schedule_unit: string
  waiver_mode: string
  roster_mode: string
  lock_time_behavior: string
} {
  const settings = buildSettingsPreview(sport, variant, overrides)
  return {
    playoff_team_count: (settings.playoff_team_count as number) ?? 6,
    regular_season_length: (settings.regular_season_length as number) ?? 18,
    schedule_unit: (settings.schedule_unit as string) ?? 'week',
    waiver_mode: (settings.waiver_mode as string) ?? 'faab',
    roster_mode: (settings.roster_mode as string) ?? 'redraft',
    lock_time_behavior: (settings.lock_time_behavior as string) ?? 'first_game',
  }
}
