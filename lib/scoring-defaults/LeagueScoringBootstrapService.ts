/**
 * Bootstraps a league's scoring setup: ensures effective scoring template is available by sport.
 * Idempotent; call after league creation so new leagues load the correct default scoring.
 * Does not create DB ScoringTemplate rows; uses in-memory defaults when no template exists.
 */
import type { LeagueSport } from '@prisma/client'
import { getScoringTemplateForSport } from '@/lib/multi-sport/MultiSportScoringResolver'
import type { ScoringTemplateDto } from '@/lib/multi-sport/ScoringTemplateResolver'

export interface BootstrapScoringResult {
  leagueId: string | null
  sport: LeagueSport
  templateId: string
  template: ScoringTemplateDto
  isDefault: boolean
}

/**
 * Get the scoring template that applies to a league's sport (for display or live scoring).
 * Use this when you need the template DTO; league overrides are applied at getLeagueScoringRules.
 */
export async function getLeagueScoringTemplate(
  leagueSport: LeagueSport,
  formatType?: string
): Promise<ScoringTemplateDto> {
  return getScoringTemplateForSport(leagueSport, formatType)
}

/**
 * Bootstrap scoring for a league: resolve and return the effective template for the league's sport.
 * League creation already uses attachRosterConfigForLeague; scoring uses the sport's default format.
 * This service does not persist anything; it returns the template that would be used for that sport.
 */
export async function bootstrapLeagueScoring(
  leagueId: string | null,
  leagueSport: LeagueSport,
  formatType?: string
): Promise<BootstrapScoringResult> {
  const template = await getScoringTemplateForSport(leagueSport, formatType)
  return {
    leagueId,
    sport: leagueSport,
    templateId: template.templateId,
    template,
    isDefault: template.templateId.startsWith('default-'),
  }
}
