/**
 * Multi-sport scoring resolver: resolve effective scoring rules by league/sport and optional league_settings.
 * Used by matchup engine and fantasy point calculation.
 * Resolution order: explicit formatType > league_settings.scoring_format / leagueVariant > sport defaultFormat.
 */
import type { LeagueSport } from '@prisma/client'
import { getLeagueScoringRules, getScoringTemplate, type ScoringRuleDto } from './ScoringTemplateResolver'
import { resolveSportConfigForLeague, leagueSportToSportType } from './SportConfigResolver'

/** Optional league settings (e.g. League.settings) to resolve scoring format when formatType not provided. */
export interface LeagueSettingsForScoring {
  scoring_format?: string | null
  leagueVariant?: string | null
  [key: string]: unknown
}

/** League-like shape for scoring resolution (sport + leagueVariant from DB, settings JSON). */
export interface LeagueForScoring {
  sport: string
  leagueVariant?: string | null
  settings?: Record<string, unknown> | null
}

/**
 * Build league settings object for scoring resolution so format is derived from League.leagueVariant
 * and League.settings (e.g. IDP, Half PPR). Pass result as fourth arg to resolveScoringRulesForLeague.
 */
export function buildLeagueSettingsForScoring(league: LeagueForScoring): LeagueSettingsForScoring {
  const settings = (league.settings ?? {}) as Record<string, unknown>
  const variantFromSettings = settings.leagueVariant
  const leagueVariant =
    league.leagueVariant ??
    (typeof variantFromSettings === 'string' ? variantFromSettings : null) ??
    null
  return {
    ...settings,
    leagueVariant,
  }
}

/**
 * Resolve format type for scoring from league_settings. Used when formatType is not explicitly passed.
 */
export function resolveFormatTypeFromLeagueSettings(
  leagueSport: LeagueSport,
  leagueSettings?: LeagueSettingsForScoring | null
): string | undefined {
  if (!leagueSettings) return undefined
  const variant = (leagueSettings.leagueVariant as string)?.toUpperCase()
  if (leagueSport === 'NFL' && (variant === 'IDP' || variant === 'DYNASTY_IDP')) return 'IDP'
  const scoringFormat = leagueSettings.scoring_format
  if (typeof scoringFormat === 'string' && scoringFormat.trim()) return scoringFormat.trim()
  return undefined
}

/**
 * Get effective scoring rules for a league (template + league overrides).
 * Resolves format by: formatType > league_settings.scoring_format / leagueVariant > sport defaultFormat.
 */
export async function resolveScoringRulesForLeague(
  leagueId: string,
  leagueSport: LeagueSport,
  formatType?: string,
  leagueSettings?: LeagueSettingsForScoring | null
): Promise<ScoringRuleDto[]> {
  const config = resolveSportConfigForLeague(leagueSport)
  const format =
    formatType ??
    resolveFormatTypeFromLeagueSettings(leagueSport, leagueSettings) ??
    config.defaultFormat
  return getLeagueScoringRules(leagueId, leagueSportToSportType(leagueSport), format)
}

/**
 * Get scoring template only (no league overrides). Useful for display or defaults.
 */
export async function getScoringTemplateForSport(
  leagueSport: LeagueSport,
  formatType?: string
) {
  const config = resolveSportConfigForLeague(leagueSport)
  const format = formatType ?? config.defaultFormat
  return getScoringTemplate(leagueSportToSportType(leagueSport), format)
}
