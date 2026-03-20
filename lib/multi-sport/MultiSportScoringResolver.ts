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
  /** IDP scoring style: balanced | tackle_heavy | big_play_heavy. When set with IDP variant, format becomes IDP-{value}. */
  idpScoringPreset?: string | null
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
 * For IDP leagues, pass idpScoringPreset (from IdpLeagueConfig) to use balanced/tackle_heavy/big_play_heavy.
 */
export function buildLeagueSettingsForScoring(
  league: LeagueForScoring,
  idpScoringPreset?: string | null
): LeagueSettingsForScoring {
  const settings = (league.settings ?? {}) as Record<string, unknown>
  const variantFromSettings = settings.leagueVariant
  const leagueVariant =
    league.leagueVariant ??
    (typeof variantFromSettings === 'string' ? variantFromSettings : null) ??
    null
  const out: LeagueSettingsForScoring = { ...settings, leagueVariant }
  if (idpScoringPreset != null) out.idpScoringPreset = idpScoringPreset
  return out
}

/**
 * Build league settings for scoring including IDP preset when league is IDP. Call with leagueId when resolving rules for matchup/scoring.
 */
export async function getLeagueSettingsForScoring(leagueId: string): Promise<LeagueSettingsForScoring | null> {
  const { prisma } = await import('@/lib/prisma')
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, settings: true },
  })
  if (!league) return null
  let idpScoringPreset: string | null = null
  if (league.sport === 'NFL' && (league.leagueVariant === 'IDP' || league.leagueVariant === 'DYNASTY_IDP' || league.leagueVariant === 'idp')) {
    const config = await prisma.idpLeagueConfig.findUnique({
      where: { leagueId },
      select: { scoringPreset: true },
    })
    idpScoringPreset = config?.scoringPreset ?? null
  }
  return buildLeagueSettingsForScoring(
    { sport: league.sport, leagueVariant: league.leagueVariant, settings: league.settings as Record<string, unknown> },
    idpScoringPreset
  )
}

/**
 * Resolve format type for scoring from league_settings. Used when formatType is not explicitly passed.
 * For IDP leagues, idpScoringPreset (balanced | tackle_heavy | big_play_heavy) yields IDP-balanced, IDP-tackle_heavy, IDP-big_play_heavy.
 */
export function resolveFormatTypeFromLeagueSettings(
  leagueSport: LeagueSport,
  leagueSettings?: LeagueSettingsForScoring | null
): string | undefined {
  if (!leagueSettings) return undefined
  const variant = (leagueSettings.leagueVariant as string)?.toUpperCase()
  if (leagueSport === 'NFL' && (variant === 'IDP' || variant === 'DYNASTY_IDP')) {
    const preset = (leagueSettings.idpScoringPreset as string)?.toLowerCase()
    if (preset === 'tackle_heavy') return 'IDP-tackle_heavy'
    if (preset === 'big_play_heavy') return 'IDP-big_play_heavy'
    return 'IDP-balanced'
  }
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
  const resolvedLeagueSettings =
    leagueSettings ?? (formatType ? null : await getLeagueSettingsForScoring(leagueId))
  const format =
    formatType ??
    resolveFormatTypeFromLeagueSettings(leagueSport, resolvedLeagueSettings) ??
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
