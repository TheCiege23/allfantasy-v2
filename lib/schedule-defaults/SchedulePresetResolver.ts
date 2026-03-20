/**
 * Resolves the schedule preset (defaults) for a given sport and league variant.
 * Used by league creation, matchup generation, and scoring window logic.
 */
import { getSchedulePreset } from './ScheduleDefaultsRegistry'
import type { DefaultScheduleConfig } from '@/lib/sport-defaults/types'

export interface SchedulePresetResult {
  preset: DefaultScheduleConfig
  sport: string
  variant: string | null
  isWeeklyCadence: boolean
  isHeadToHead: boolean
  default_schedule_unit: string
  default_regular_season_length: number
  default_matchup_cadence: string
  default_head_to_head_or_points_behavior: string
  default_lock_window_behavior: string
  default_scoring_period_behavior: string
  default_reschedule_handling: string
  default_doubleheader_or_multi_game_handling: string
  default_playoff_transition_point: number | null
  default_schedule_generation_strategy: string
}

/**
 * Resolve schedule preset by sport and optional variant.
 */
export function resolveSchedulePreset(
  sport: string,
  variant?: string | null
): SchedulePresetResult {
  const preset = getSchedulePreset(sport, variant ?? undefined)
  const cadence = String(preset.matchup_cadence ?? preset.matchup_frequency ?? 'weekly')
  const h2h = String(preset.head_to_head_or_points_behavior ?? 'head_to_head')
  return {
    preset,
    sport,
    variant: variant ?? null,
    isWeeklyCadence: cadence === 'weekly',
    isHeadToHead: h2h === 'head_to_head',
    default_schedule_unit: preset.schedule_unit,
    default_regular_season_length: preset.regular_season_length,
    default_matchup_cadence: cadence,
    default_head_to_head_or_points_behavior: h2h,
    default_lock_window_behavior: String(preset.lock_window_behavior ?? preset.lock_time_behavior),
    default_scoring_period_behavior: String(preset.scoring_period_behavior ?? 'full_period'),
    default_reschedule_handling: String(preset.reschedule_handling ?? 'use_final_time'),
    default_doubleheader_or_multi_game_handling: String(preset.doubleheader_or_multi_game_handling ?? 'all_games_count'),
    default_playoff_transition_point: preset.playoff_transition_point ?? null,
    default_schedule_generation_strategy: String(preset.schedule_generation_strategy ?? 'round_robin'),
  }
}
