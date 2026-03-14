/**
 * Resolves default schedule and lock behavior per sport.
 * Used by LeagueDefaultSettingsService and league creation initialization.
 */
import type { SportType, DefaultScheduleConfig } from './types'
import { SPORT_TYPES } from './types'

const CONFIGS: Record<SportType, DefaultScheduleConfig> = {
  NFL: {
    sport_type: 'NFL',
    schedule_unit: 'week',
    regular_season_length: 18,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
  },
  NBA: {
    sport_type: 'NBA',
    schedule_unit: 'week',
    regular_season_length: 24,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
  },
  MLB: {
    sport_type: 'MLB',
    schedule_unit: 'week',
    regular_season_length: 26,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'slate_lock',
    injury_slot_behavior: 'ir_only',
  },
  NHL: {
    sport_type: 'NHL',
    schedule_unit: 'week',
    regular_season_length: 25,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
  },
  NCAAF: {
    sport_type: 'NCAAF',
    schedule_unit: 'week',
    regular_season_length: 15,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
  },
  NCAAB: {
    sport_type: 'NCAAB',
    schedule_unit: 'week',
    regular_season_length: 18,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
  },
  SOCCER: {
    sport_type: 'SOCCER',
    schedule_unit: 'week',
    regular_season_length: 38,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    lock_time_behavior: 'first_game',
    injury_slot_behavior: 'ir_or_out',
  },
}

export function resolveDefaultScheduleConfig(sportType: SportType): DefaultScheduleConfig {
  return CONFIGS[sportType] ?? CONFIGS.NFL
}
