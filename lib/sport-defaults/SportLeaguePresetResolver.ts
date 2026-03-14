/**
 * Resolves full league preset for a sport: defaults + templates + default league settings.
 * Use when UI or API needs "everything for league creation" including playoff/schedule/waiver/trade defaults.
 */
import type { LeagueSport } from '@prisma/client'
import { getFullLeaguePreset } from './SportLeaguePresetService'
import { getDefaultLeagueSettings, buildInitialLeagueSettings } from './LeagueDefaultSettingsService'
import type { SportType } from './types'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'

export interface ResolvedLeaguePreset {
  /** Existing preset (defaults + roster/scoring templates) */
  preset: Awaited<ReturnType<typeof getFullLeaguePreset>>
  /** Full default league settings (playoff, schedule, waiver mode, tiebreakers, lock behavior) */
  defaultLeagueSettings: ReturnType<typeof getDefaultLeagueSettings>
  /** Ready-to-store League.settings JSON (sport-specific starting point) */
  initialSettingsJson: Record<string, unknown>
}

/**
 * Resolve full league preset including default league settings for the given sport.
 */
export async function resolveSportLeaguePreset(leagueSport: LeagueSport): Promise<ResolvedLeaguePreset> {
  const preset = await getFullLeaguePreset(leagueSport)
  const sportType = leagueSportToSportType(leagueSport) as SportType
  const defaultLeagueSettings = getDefaultLeagueSettings(sportType)
  const initialSettingsJson = buildInitialLeagueSettings(sportType)
  return {
    preset,
    defaultLeagueSettings,
    initialSettingsJson,
  }
}
