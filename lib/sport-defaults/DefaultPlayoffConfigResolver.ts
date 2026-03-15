/**
 * Resolves default playoff configuration per sport.
 * Used by LeagueDefaultSettingsService and league creation initialization.
 *
 * Per-sport expectations:
 * - NFL: 6 teams, 4 weeks, 2 byes, single elimination, consolation for draft pick, weekly rounds.
 * - NBA: 6 teams, 3 weeks, 2 byes, consolation for pick.
 * - MLB: 6 teams, 4 weeks, no consolation (typical for baseball).
 * - NHL: 6 teams, 4 weeks, consolation for pick.
 * - NCAAF / NCAAB: 6 teams, 3 weeks, college season alignment; consolation for pick.
 * - SOCCER: 6 teams, 3 weeks; support no-playoff or playoff-enabled presets.
 */
import type { SportType, DefaultPlayoffConfig } from './types'

const CONFIGS: Record<SportType, DefaultPlayoffConfig> = {
  NFL: {
    sport_type: 'NFL',
    playoff_team_count: 6,
    playoff_weeks: 4,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
    playoff_start_week: 15,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
  NBA: {
    sport_type: 'NBA',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
    playoff_start_week: 22,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
  MLB: {
    sport_type: 'MLB',
    playoff_team_count: 6,
    playoff_weeks: 4,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'none',
    playoff_start_week: 24,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: false,
    third_place_game_enabled: false,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
  NHL: {
    sport_type: 'NHL',
    playoff_team_count: 6,
    playoff_weeks: 4,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
    playoff_start_week: 22,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
  NCAAF: {
    sport_type: 'NCAAF',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
    playoff_start_week: 13,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
  NCAAB: {
    sport_type: 'NCAAB',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
    playoff_start_week: 16,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
  SOCCER: {
    sport_type: 'SOCCER',
    playoff_team_count: 6,
    playoff_weeks: 3,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    consolation_plays_for: 'pick',
    playoff_start_week: 36,
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    reseed_behavior: 'fixed_bracket',
  },
}

/**
 * Resolve default playoff config for a sport. Optionally pass formatType (e.g. IDP); NFL IDP uses same as NFL.
 */
export function resolveDefaultPlayoffConfig(
  sportType: SportType,
  _formatType?: string | null
): DefaultPlayoffConfig {
  return CONFIGS[sportType] ?? CONFIGS.NFL
}
