/**
 * Multi-sport scoring resolver: resolve effective scoring rules by league/sport.
 * Used by matchup engine and fantasy point calculation.
 */
import type { LeagueSport } from '@prisma/client'
import { getLeagueScoringRules, getScoringTemplate, type ScoringRuleDto } from './ScoringTemplateResolver'
import { resolveSportConfigForLeague, leagueSportToSportType } from './SportConfigResolver'

/**
 * Get effective scoring rules for a league (template + league overrides).
 */
export async function resolveScoringRulesForLeague(
  leagueId: string,
  leagueSport: LeagueSport,
  formatType?: string
): Promise<ScoringRuleDto[]> {
  const config = resolveSportConfigForLeague(leagueSport)
  const format = formatType ?? config.defaultFormat
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
