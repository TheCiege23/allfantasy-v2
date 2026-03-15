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

  return {
    lock_time_behavior: (settings.lock_time_behavior as string) ?? defaults.lock_time_behavior,
    lock_window_behavior: (settings.schedule_lock_window_behavior as string) ?? defaults.lock_window_behavior ?? defaults.lock_time_behavior,
    scoring_period_behavior: (settings.schedule_scoring_period_behavior as string) ?? defaults.scoring_period_behavior ?? 'full_period',
    schedule_unit: (settings.schedule_unit as string) ?? defaults.schedule_unit,
    reschedule_handling: (settings.schedule_reschedule_handling as string) ?? defaults.reschedule_handling ?? 'use_final_time',
    doubleheader_handling: (settings.schedule_doubleheader_handling as string) ?? defaults.doubleheader_or_multi_game_handling ?? 'all_games_count',
    sport,
    variant,
  }
}
