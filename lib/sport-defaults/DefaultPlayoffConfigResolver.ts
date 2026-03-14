/**
 * Resolves default playoff configuration per sport.
 * Used by LeagueDefaultSettingsService and league creation initialization.
 */
import type { SportType, DefaultPlayoffConfig } from './types'
import { SPORT_TYPES } from './types'

const CONFIGS: Record<SportType, DefaultPlayoffConfig> = {
  NFL: {
    sport_type: 'NFL',
    playoff_team_count: 6,
    playoff_weeks: 4,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
  },
  NBA: {
    sport_type: 'NBA',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
  },
  MLB: {
    sport_type: 'MLB',
    playoff_team_count: 6,
    playoff_weeks: 4,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'none',
  },
  NHL: {
    sport_type: 'NHL',
    playoff_team_count: 6,
    playoff_weeks: 4,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
  },
  NCAAF: {
    sport_type: 'NCAAF',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
  },
  NCAAB: {
    sport_type: 'NCAAB',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
  },
  SOCCER: {
    sport_type: 'SOCCER',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
  },
}

export function resolveDefaultPlayoffConfig(sportType: SportType): DefaultPlayoffConfig {
  return CONFIGS[sportType] ?? CONFIGS.NFL
}
