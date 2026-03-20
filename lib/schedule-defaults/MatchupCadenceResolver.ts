/**
 * Resolves matchup cadence for a league. Used by matchup generation and schedule display.
 */
import { prisma } from '@/lib/prisma'
import { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface MatchupCadenceConfig {
  schedule_unit: string
  matchup_frequency: string
  matchup_cadence: string
  head_to_head_behavior: string
  regular_season_length: number
  schedule_generation_strategy: string
  sport: string
  variant: string | null
}

/**
 * Get matchup cadence config for a league (for matchup generation and UI).
 */
export async function getMatchupCadenceForLeague(leagueId: string): Promise<MatchupCadenceConfig | null> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, settings: true },
  })
  if (!league) return null

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const defaults = resolveDefaultScheduleConfig(sportType, variant ?? undefined)

  const fromSettings = <T>(key: string, fallback: T): T => {
    const value = settings[key]
    return value === undefined || value === null ? fallback : (value as T)
  }

  const cadence = fromSettings<string>('schedule_cadence', defaults.matchup_cadence ?? defaults.matchup_frequency)
  const strategy = fromSettings<string>('schedule_generation_strategy', defaults.schedule_generation_strategy ?? 'round_robin')

  return {
    schedule_unit: fromSettings<string>('schedule_unit', defaults.schedule_unit),
    matchup_frequency: fromSettings<string>('matchup_frequency', defaults.matchup_frequency),
    matchup_cadence: typeof cadence === 'string' ? cadence : defaults.matchup_frequency,
    head_to_head_behavior: fromSettings<string>('schedule_head_to_head_behavior', defaults.head_to_head_or_points_behavior ?? 'head_to_head'),
    regular_season_length: fromSettings<number>('regular_season_length', defaults.regular_season_length),
    schedule_generation_strategy: typeof strategy === 'string' ? strategy : 'round_robin',
    sport,
    variant,
  }
}
