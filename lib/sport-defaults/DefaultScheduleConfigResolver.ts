/**
 * Resolves default schedule and lock behavior per sport.
 * Used by LeagueDefaultSettingsService and league creation initialization.
 *
 * Sport-specific expectations:
 * - NFL: 18-week regular season, weekly matchups, lock at first game of week, IR allows Out.
 * - NBA: 24-week, weekly matchups, lineup lock at first game of slate.
 * - MLB: 26-week, slate_lock, heavier game volume and scoring period handling.
 * - NHL: 25-week, first_game lock, hockey schedule density.
 * - NCAAF: 15-week, weekly football cadence, shorter season.
 * - NCAAB: 18-week, basketball cadence for college.
 * - SOCCER: 38-week, weekly fixtures, sport-aware lock timing.
 */
import type { SportType, DefaultScheduleConfig } from './types'

const CONFIGS: Record<SportType, DefaultScheduleConfig> = {
  NFL: {
    sport_type: 'NFL',
    schedule_unit: 'week',
    regular_season_length: 18,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'first_game_of_week',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 15,
    schedule_generation_strategy: 'round_robin',
  },
  NBA: {
    sport_type: 'NBA',
    schedule_unit: 'week',
    regular_season_length: 24,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'first_game_of_slate',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 22,
    schedule_generation_strategy: 'round_robin',
  },
  MLB: {
    sport_type: 'MLB',
    schedule_unit: 'week',
    regular_season_length: 26,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'slate_lock',
    injury_slot_behavior: 'ir_only',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'slate_lock',
    scoring_period_behavior: 'slate_based',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 24,
    schedule_generation_strategy: 'round_robin',
  },
  NHL: {
    sport_type: 'NHL',
    schedule_unit: 'week',
    regular_season_length: 25,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'first_game_of_slate',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 22,
    schedule_generation_strategy: 'round_robin',
  },
  NCAAF: {
    sport_type: 'NCAAF',
    schedule_unit: 'week',
    regular_season_length: 15,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'first_game_of_week',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 13,
    schedule_generation_strategy: 'round_robin',
  },
  NCAAB: {
    sport_type: 'NCAAB',
    schedule_unit: 'week',
    regular_season_length: 18,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'first_game_of_slate',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 16,
    schedule_generation_strategy: 'round_robin',
  },
  SOCCER: {
    sport_type: 'SOCCER',
    schedule_unit: 'week',
    regular_season_length: 38,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
    matchup_cadence: 'weekly',
    head_to_head_or_points_behavior: 'head_to_head',
    lock_window_behavior: 'first_game_of_slate',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_or_multi_game_handling: 'all_games_count',
    playoff_transition_point: 36,
    schedule_generation_strategy: 'round_robin',
  },
}

/**
 * Resolve default schedule config for a sport. Optionally pass formatType (e.g. IDP); NFL IDP uses same as NFL.
 */
export function resolveDefaultScheduleConfig(
  sportType: SportType,
  _formatType?: string | null
): DefaultScheduleConfig {
  return CONFIGS[sportType] ?? CONFIGS.NFL
}
