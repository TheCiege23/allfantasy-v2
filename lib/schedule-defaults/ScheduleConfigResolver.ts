/**
 * Resolves full schedule config for a league (cadence + scoring window + generation context).
 * Used by app schedule/config API and ScheduleSettingsPanel.
 */
import { prisma } from '@/lib/prisma'
import { getMatchupCadenceForLeague } from './MatchupCadenceResolver'
import { getScoringWindowConfigForLeague } from './ScoringWindowResolver'
import { getLeagueScheduleGenerationContext } from './LeagueScheduleGenerationService'

export interface ScheduleConfigForLeague {
  schedule_unit: string
  regular_season_length: number
  matchup_frequency: string
  matchup_cadence: string
  schedule_generation_strategy: string
  playoff_transition_point: number | null
  head_to_head_behavior: string
  lock_time_behavior: string
  lock_window_behavior: string
  scoring_period_behavior: string
  reschedule_handling: string
  doubleheader_handling: string
  sport: string
  variant: string | null
}

export async function getScheduleConfigForLeague(leagueId: string): Promise<ScheduleConfigForLeague | null> {
  const [cadence, scoring, generation, league] = await Promise.all([
    getMatchupCadenceForLeague(leagueId),
    getScoringWindowConfigForLeague(leagueId),
    getLeagueScheduleGenerationContext(leagueId),
    (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { settings: true },
    }),
  ])
  if (!cadence || !generation) return null
  const settings = (league?.settings as Record<string, unknown>) ?? {}
  const headToHead = (settings.schedule_head_to_head_behavior as string) ?? 'head_to_head'
  return {
    schedule_unit: cadence.schedule_unit ?? generation.schedule_unit,
    regular_season_length: cadence.regular_season_length ?? generation.regular_season_length,
    matchup_frequency: cadence.matchup_frequency ?? generation.matchup_frequency,
    matchup_cadence: cadence.matchup_cadence ?? generation.matchup_frequency,
    schedule_generation_strategy: cadence.schedule_generation_strategy ?? generation.schedule_generation_strategy,
    playoff_transition_point: generation.playoff_transition_point ?? null,
    head_to_head_behavior: headToHead,
    lock_time_behavior: scoring?.lock_time_behavior ?? 'first_game',
    lock_window_behavior: scoring?.lock_window_behavior ?? 'first_game_of_week',
    scoring_period_behavior: scoring?.scoring_period_behavior ?? 'full_period',
    reschedule_handling: scoring?.reschedule_handling ?? 'use_final_time',
    doubleheader_handling: scoring?.doubleheader_handling ?? 'all_games_count',
    sport: cadence.sport,
    variant: cadence.variant,
  }
}
