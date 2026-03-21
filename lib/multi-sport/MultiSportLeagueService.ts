/**
 * Multi-sport league service: sport-aware league creation and template loading.
 * Preserves existing NFL flows; new leagues get default roster + scoring template by sport.
 */
import type { LeagueSport } from '@prisma/client'
import { resolveSportConfigForLeague, leagueSportToSportType } from './SportConfigResolver'
import { getRosterTemplate, getOrCreateLeagueRosterConfig } from './RosterTemplateService'
import { getScoringTemplate, getLeagueScoringRules } from './ScoringTemplateResolver'
import type { RosterTemplateDto } from './RosterTemplateService'
import type { ScoringTemplateDto, ScoringRuleDto } from './ScoringTemplateResolver'

export interface LeagueCreationPreset {
  sport: LeagueSport
  sportDisplayName: string
  sportEmoji: string
  defaultFormat: string
  rosterTemplate: RosterTemplateDto
  scoringTemplate: ScoringTemplateDto
}

/**
 * Load creation preset for a sport (roster + scoring templates). Used by league creation UI.
 */
export async function getLeagueCreationPreset(
  leagueSport: LeagueSport,
  formatTypeOverride?: string | null
): Promise<LeagueCreationPreset> {
  const config = resolveSportConfigForLeague(leagueSport)
  const sportType = leagueSportToSportType(leagueSport)
  const formatType = formatTypeOverride?.trim() || config.defaultFormat
  const [rosterTemplate, scoringTemplate] = await Promise.all([
    getRosterTemplate(sportType, formatType),
    getScoringTemplate(sportType, formatType),
  ])
  return {
    sport: leagueSport,
    sportDisplayName: config.displayName,
    sportEmoji: config.emoji,
    defaultFormat: formatType,
    rosterTemplate,
    scoringTemplate,
  }
}

/**
 * After league is created, attach roster config for the league's sport (idempotent).
 */
export async function attachRosterConfigForLeague(
  leagueId: string,
  leagueSport: LeagueSport,
  formatType?: string
): Promise<{ templateId: string }> {
  const config = resolveSportConfigForLeague(leagueSport)
  const sportType = leagueSportToSportType(leagueSport)
  const format = formatType ?? config.defaultFormat
  const result = await getOrCreateLeagueRosterConfig(leagueId, sportType, format)
  return { templateId: result.templateId }
}

/**
 * Get effective scoring rules for a league (by league record). Used by scoring engine.
 */
export async function getScoringRulesForLeague(
  leagueId: string,
  leagueSport: LeagueSport,
  formatType?: string
): Promise<ScoringRuleDto[]> {
  const config = resolveSportConfigForLeague(leagueSport)
  const sportType = leagueSportToSportType(leagueSport)
  const format = formatType ?? config.defaultFormat
  return getLeagueScoringRules(leagueId, sportType, format)
}
