/**
 * Aggregates all default league settings for a sport (playoff, schedule, waiver, trade, tiebreakers).
 * Single entry for "what settings should a new league of this sport start with?"
 * Commissioner can override after initialization; this is the sport-specific starting point.
 */
import type { SportType, DefaultLeagueSettings } from './types'
import { getLeagueDefaults, getWaiverDefaults } from './SportDefaultsRegistry'
import { resolveDefaultPlayoffConfig } from './DefaultPlayoffConfigResolver'
import { resolveDefaultScheduleConfig } from './DefaultScheduleConfigResolver'
import { toSportType } from './sport-type-utils'

const DEFAULT_TIEBREAKERS: Record<SportType, string[]> = {
  NFL: ['points_for', 'head_to_head', 'points_against'],
  NBA: ['points_for', 'head_to_head', 'points_against'],
  MLB: ['points_for', 'head_to_head', 'points_against'],
  NHL: ['points_for', 'head_to_head', 'points_against'],
  NCAAF: ['points_for', 'head_to_head', 'points_against'],
  NCAAB: ['points_for', 'head_to_head', 'points_against'],
  SOCCER: ['points_for', 'head_to_head', 'points_against'],
}

const DEFAULT_TRADE_REVIEW: Record<SportType, 'none' | 'commissioner' | 'league_vote' | 'instant'> = {
  NFL: 'commissioner',
  NBA: 'commissioner',
  MLB: 'commissioner',
  NHL: 'commissioner',
  NCAAF: 'commissioner',
  NCAAB: 'commissioner',
  SOCCER: 'commissioner',
}

/**
 * Get full default league settings for a sport. Use for League.settings JSON and API.
 */
export function getDefaultLeagueSettings(sportType: SportType | string): DefaultLeagueSettings {
  const sport = typeof sportType === 'string' ? toSportType(sportType) : sportType
  const league = getLeagueDefaults(sport)
  const waiver = getWaiverDefaults(sport)
  const playoff = resolveDefaultPlayoffConfig(sport)
  const schedule = resolveDefaultScheduleConfig(sport)

  return {
    sport_type: sport,
    default_team_count: league.default_team_count,
    regular_season_length: schedule.regular_season_length,
    playoff_team_count: playoff.playoff_team_count,
    playoff_structure: {
      playoff_team_count: playoff.playoff_team_count,
      playoff_weeks: playoff.playoff_weeks,
      first_round_byes: playoff.first_round_byes,
      bracket_type: playoff.bracket_type,
      consolation_plays_for: playoff.consolation_plays_for,
    },
    matchup_frequency: schedule.matchup_frequency,
    season_labeling: schedule.season_labeling,
    scoring_mode: 'points',
    roster_mode: 'redraft',
    waiver_mode: waiver.waiver_type,
    trade_review_mode: DEFAULT_TRADE_REVIEW[sport],
    standings_tiebreakers: DEFAULT_TIEBREAKERS[sport] ?? DEFAULT_TIEBREAKERS.NFL,
    schedule_unit: schedule.schedule_unit,
    injury_slot_behavior: schedule.injury_slot_behavior,
    lock_time_behavior: schedule.lock_time_behavior,
  }
}

/**
 * Build the League.settings JSON object for a newly created league (sport-specific starting point).
 * Commissioner overrides can merge on top of this.
 */
export function buildInitialLeagueSettings(sportType: SportType | string): Record<string, unknown> {
  const def = getDefaultLeagueSettings(sportType)
  return {
    sport_type: def.sport_type,
    default_team_count: def.default_team_count,
    regular_season_length: def.regular_season_length,
    playoff_team_count: def.playoff_team_count,
    playoff_structure: def.playoff_structure,
    matchup_frequency: def.matchup_frequency,
    season_labeling: def.season_labeling,
    scoring_mode: def.scoring_mode,
    roster_mode: def.roster_mode,
    waiver_mode: def.waiver_mode,
    trade_review_mode: def.trade_review_mode,
    standings_tiebreakers: def.standings_tiebreakers,
    schedule_unit: def.schedule_unit,
    injury_slot_behavior: def.injury_slot_behavior,
    lock_time_behavior: def.lock_time_behavior,
  }
}
