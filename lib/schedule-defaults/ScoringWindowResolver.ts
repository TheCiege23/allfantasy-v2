/**
 * Resolves scoring window and lock behavior for a league. Used by scoring aggregation and lineup lock logic.
 */
import { prisma } from '@/lib/prisma'
import { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface ScoringWindowConfig {
  lock_time_behavior: string
  lock_window_behavior: string
  scoring_period_behavior: string
  schedule_unit: string
  reschedule_handling: string
  doubleheader_handling: string
  sport: string
  variant: string | null
}

/**
 * Get scoring window and lock config for a league (for scoring windows and lock timing).
 */
export async function getScoringWindowConfigForLeague(leagueId: string): Promise<ScoringWindowConfig | null> {
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

  return {
    lock_time_behavior: fromSettings<string>('lock_time_behavior', defaults.lock_time_behavior),
    lock_window_behavior: fromSettings<string>('schedule_lock_window_behavior', defaults.lock_window_behavior ?? defaults.lock_time_behavior),
    scoring_period_behavior: fromSettings<string>('schedule_scoring_period_behavior', defaults.scoring_period_behavior ?? 'full_period'),
    schedule_unit: fromSettings<string>('schedule_unit', defaults.schedule_unit),
    reschedule_handling: fromSettings<string>('schedule_reschedule_handling', defaults.reschedule_handling ?? 'use_final_time'),
    doubleheader_handling: fromSettings<string>('schedule_doubleheader_handling', defaults.doubleheader_or_multi_game_handling ?? 'all_games_count'),
    sport,
    variant,
  }
}
