/**
 * Provides schedule generation context for a league (strategy, length, transition point).
 * Does not generate matchups; consumed by matchup generation or schedule UI to use correct cadence and bounds.
 */
import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface LeagueScheduleGenerationContext {
  regular_season_length: number
  schedule_unit: string
  matchup_frequency: string
  schedule_cadence: string
  schedule_generation_strategy: string
  playoff_transition_point: number | null
  sport: string
  variant: string | null
}

/**
 * Get schedule generation context for a league (for matchup generation and schedule display).
 * Call this before generating or displaying matchups to use sport-aware defaults.
 */
export async function getLeagueScheduleGenerationContext(
  leagueId: string
): Promise<LeagueScheduleGenerationContext | null> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, settings: true },
  })
  if (!league) return null

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || DEFAULT_SPORT
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const defaults = resolveDefaultScheduleConfig(sportType, variant ?? undefined)

  const fromSettings = <T>(key: string, fallback: T): T => {
    const value = settings[key]
    return value === undefined || value === null ? fallback : (value as T)
  }

  const playoffTransition = fromSettings<number | null>('schedule_playoff_transition_point', defaults.playoff_transition_point ?? null)

  return {
    regular_season_length: fromSettings<number>('regular_season_length', defaults.regular_season_length),
    schedule_unit: fromSettings<string>('schedule_unit', defaults.schedule_unit),
    matchup_frequency: fromSettings<string>('matchup_frequency', defaults.matchup_frequency),
    schedule_cadence: fromSettings<string>('schedule_cadence', defaults.matchup_cadence ?? defaults.matchup_frequency),
    schedule_generation_strategy: fromSettings<string>('schedule_generation_strategy', defaults.schedule_generation_strategy ?? 'round_robin'),
    playoff_transition_point: playoffTransition != null ? Number(playoffTransition) : null,
    sport,
    variant,
  }
}
