/**
 * Resolves projection engine inputs by sport: scoring rules and optional schedule/stat context.
 * Used by projection and simulation pipelines so they use league-specific scoring and period semantics.
 */
import type { LeagueSport } from '@prisma/client'
import { getScoringTemplateForSport } from './MultiSportScoringResolver'
import { resolveScheduleContextForLeague } from './MultiSportScheduleResolver'
import type { ScoringRuleDto } from './ScoringTemplateResolver'

export interface ProjectionSeedInput {
  leagueId?: string
  leagueSport: LeagueSport
  season: number
  weekOrRound: number
  formatType?: string
}

export interface ProjectionSeed {
  sportType: string
  season: number
  weekOrRound: number
  totalWeeksOrRounds: number
  label: 'week' | 'round'
  scoringRules: ScoringRuleDto[]
  templateId: string
}

/**
 * Resolve projection seed for a league/period: schedule context + scoring rules.
 * Use scoring rules when generating or valuing projections; use schedule context for period bounds.
 */
export async function resolveProjectionSeed(
  input: ProjectionSeedInput
): Promise<ProjectionSeed> {
  const template = await getScoringTemplateForSport(
    input.leagueSport,
    input.formatType
  )
  const scheduleCtx = await resolveScheduleContextForLeague(
    input.leagueSport,
    input.season,
    input.weekOrRound,
    input.formatType
  )
  return {
    sportType: scheduleCtx.sportType,
    season: input.season,
    weekOrRound: input.weekOrRound,
    totalWeeksOrRounds: scheduleCtx.totalWeeksOrRounds,
    label: scheduleCtx.label,
    scoringRules: template.rules,
    templateId: template.templateId,
  }
}
