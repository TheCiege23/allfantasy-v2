/**
 * Ensures a league has schedule behavior config in League.settings (sport- and variant-aware).
 * Idempotent: merges default schedule keys only when missing so commissioner overrides are preserved.
 */
import { prisma } from '@/lib/prisma'
import { resolveDefaultScheduleConfig } from '@/lib/sport-defaults/DefaultScheduleConfigResolver'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface LeagueScheduleBootstrapResult {
  leagueId: string
  scheduleConfigApplied: boolean
  sport: string
  variant: string | null
}

const SCHEDULE_KEYS = [
  'schedule_cadence',
  'schedule_head_to_head_behavior',
  'schedule_lock_window_behavior',
  'schedule_scoring_period_behavior',
  'schedule_reschedule_handling',
  'schedule_doubleheader_handling',
  'schedule_playoff_transition_point',
  'schedule_generation_strategy',
] as const

/**
 * Ensure league has schedule behavior keys in League.settings. If any are missing, merge in sport defaults.
 */
export async function bootstrapLeagueScheduleConfig(leagueId: string): Promise<LeagueScheduleBootstrapResult> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, leagueVariant: true, settings: true },
  })
  if (!league) {
    return { leagueId, scheduleConfigApplied: false, sport: '', variant: null }
  }

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const schedule = resolveDefaultScheduleConfig(sportType, variant ?? undefined)

  const hasAnyScheduleKey = SCHEDULE_KEYS.some((k) => settings[k] !== undefined)
  if (hasAnyScheduleKey) {
    return { leagueId, scheduleConfigApplied: false, sport, variant }
  }

  const scheduleBlock = {
    schedule_cadence: schedule.matchup_cadence ?? schedule.matchup_frequency,
    schedule_head_to_head_behavior: schedule.head_to_head_or_points_behavior ?? 'head_to_head',
    schedule_lock_window_behavior: schedule.lock_window_behavior ?? schedule.lock_time_behavior,
    schedule_scoring_period_behavior: schedule.scoring_period_behavior ?? 'full_period',
    schedule_reschedule_handling: schedule.reschedule_handling ?? 'use_final_time',
    schedule_doubleheader_handling: schedule.doubleheader_or_multi_game_handling ?? 'all_games_count',
    schedule_playoff_transition_point: schedule.playoff_transition_point ?? null,
    schedule_generation_strategy: schedule.schedule_generation_strategy ?? 'round_robin',
  }

  await (prisma as any).league.update({
    where: { id: leagueId },
    data: { settings: { ...settings, ...scheduleBlock } },
  })

  return { leagueId, scheduleConfigApplied: true, sport, variant }
}
