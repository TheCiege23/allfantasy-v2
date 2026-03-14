/**
 * Central registry of per-sport defaults: league, roster, scoring, draft, waiver.
 * Single source of truth for backend and shared config; league creation loads from here.
 */
import type {
  SportType,
  LeagueDefaults,
  RosterDefaults,
  ScoringDefaults,
  DraftDefaults,
  WaiverDefaults,
  TeamMetadataDefaults,
} from './types'
import { SPORT_TYPES } from './types'
import { getRosterOverlayForVariant } from './LeagueVariantRegistry'

const LEAGUE_DEFAULTS: Record<SportType, LeagueDefaults> = {
  NFL: {
    sport_type: 'NFL',
    default_league_name_pattern: 'My NFL League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 18,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
  NBA: {
    sport_type: 'NBA',
    default_league_name_pattern: 'My NBA League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 24,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
  MLB: {
    sport_type: 'MLB',
    default_league_name_pattern: 'My MLB League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 26,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
  NHL: {
    sport_type: 'NHL',
    default_league_name_pattern: 'My NHL League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 25,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
  NCAAF: {
    sport_type: 'NCAAF',
    default_league_name_pattern: 'My NCAA Football League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 15,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
  NCAAB: {
    sport_type: 'NCAAB',
    default_league_name_pattern: 'My NCAA Basketball League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 18,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
  SOCCER: {
    sport_type: 'SOCCER',
    default_league_name_pattern: 'My Soccer League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 38,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  },
}

const ROSTER_DEFAULTS: Record<SportType, RosterDefaults> = {
  NFL: {
    sport_type: 'NFL',
    starter_slots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1 },
    bench_slots: 7,
    IR_slots: 2,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'FLEX', allowedPositions: ['RB', 'WR', 'TE'] }],
  },
  NBA: {
    sport_type: 'NBA',
    starter_slots: { PG: 1, SG: 1, SF: 1, PF: 1, C: 1, G: 1, F: 1, UTIL: 1 },
    bench_slots: 4,
    IR_slots: 1,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'G', allowedPositions: ['PG', 'SG'] }, { slotName: 'F', allowedPositions: ['SF', 'PF'] }, { slotName: 'UTIL', allowedPositions: ['PG', 'SG', 'SF', 'PF', 'C'] }],
  },
  MLB: {
    sport_type: 'MLB',
    starter_slots: { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 1, P: 2 },
    bench_slots: 6,
    IR_slots: 1,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'UTIL', allowedPositions: ['C', '1B', '2B', '3B', 'SS', 'OF'] }],
  },
  NHL: {
    sport_type: 'NHL',
    starter_slots: { C: 2, LW: 2, RW: 2, D: 2, G: 1, UTIL: 1 },
    bench_slots: 6,
    IR_slots: 1,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'UTIL', allowedPositions: ['C', 'LW', 'RW', 'D'] }],
  },
  NCAAF: {
    sport_type: 'NCAAF',
    starter_slots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 1, K: 1, DST: 1 },
    bench_slots: 7,
    IR_slots: 2,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'FLEX', allowedPositions: ['RB', 'WR', 'TE'] }, { slotName: 'SUPERFLEX', allowedPositions: ['QB', 'RB', 'WR', 'TE'] }],
  },
  NCAAB: {
    sport_type: 'NCAAB',
    starter_slots: { G: 2, F: 2, C: 1, UTIL: 1 },
    bench_slots: 4,
    IR_slots: 1,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'UTIL', allowedPositions: ['G', 'F', 'C'] }],
  },
  SOCCER: {
    sport_type: 'SOCCER',
    starter_slots: { GKP: 1, DEF: 4, MID: 4, FWD: 2, UTIL: 1 },
    bench_slots: 4,
    IR_slots: 1,
    taxi_slots: 0,
    devy_slots: 0,
    flex_definitions: [{ slotName: 'UTIL', allowedPositions: ['GKP', 'DEF', 'MID', 'FWD'] }],
  },
}

const SCORING_DEFAULTS: Record<SportType, ScoringDefaults> = {
  NFL: { sport_type: 'NFL', scoring_template_id: 'default-NFL-PPR', scoring_format: 'PPR', category_type: 'points' },
  NBA: { sport_type: 'NBA', scoring_template_id: 'default-NBA-points', scoring_format: 'points', category_type: 'points' },
  MLB: { sport_type: 'MLB', scoring_template_id: 'default-MLB-standard', scoring_format: 'standard', category_type: 'points' },
  NHL: { sport_type: 'NHL', scoring_template_id: 'default-NHL-standard', scoring_format: 'standard', category_type: 'points' },
  NCAAF: { sport_type: 'NCAAF', scoring_template_id: 'default-NCAAF-PPR', scoring_format: 'PPR', category_type: 'points' },
  NCAAB: { sport_type: 'NCAAB', scoring_template_id: 'default-NCAAB-points', scoring_format: 'points', category_type: 'points' },
  SOCCER: { sport_type: 'SOCCER', scoring_template_id: 'default-SOCCER-standard', scoring_format: 'standard', category_type: 'points' },
}

const DRAFT_DEFAULTS: Record<SportType, DraftDefaults> = {
  NFL: { sport_type: 'NFL', draft_type: 'snake', rounds_default: 15, timer_seconds_default: 90, pick_order_rules: 'snake' },
  NBA: { sport_type: 'NBA', draft_type: 'snake', rounds_default: 13, timer_seconds_default: 90, pick_order_rules: 'snake' },
  MLB: { sport_type: 'MLB', draft_type: 'snake', rounds_default: 26, timer_seconds_default: 90, pick_order_rules: 'snake' },
  NHL: { sport_type: 'NHL', draft_type: 'snake', rounds_default: 18, timer_seconds_default: 90, pick_order_rules: 'snake' },
  NCAAF: { sport_type: 'NCAAF', draft_type: 'snake', rounds_default: 15, timer_seconds_default: 90, pick_order_rules: 'snake' },
  NCAAB: { sport_type: 'NCAAB', draft_type: 'snake', rounds_default: 10, timer_seconds_default: 90, pick_order_rules: 'snake' },
  SOCCER: { sport_type: 'SOCCER', draft_type: 'snake', rounds_default: 15, timer_seconds_default: 90, pick_order_rules: 'snake' },
}

const WAIVER_DEFAULTS: Record<SportType, WaiverDefaults> = {
  NFL: { sport_type: 'NFL', waiver_type: 'faab', processing_days: [3], FAAB_budget_default: 100 },
  NBA: { sport_type: 'NBA', waiver_type: 'faab', processing_days: [1, 4], FAAB_budget_default: 100 },
  MLB: { sport_type: 'MLB', waiver_type: 'faab', processing_days: [1], FAAB_budget_default: 100 },
  NHL: { sport_type: 'NHL', waiver_type: 'faab', processing_days: [1, 4], FAAB_budget_default: 100 },
  NCAAF: { sport_type: 'NCAAF', waiver_type: 'faab', processing_days: [3], FAAB_budget_default: 100 },
  NCAAB: { sport_type: 'NCAAB', waiver_type: 'faab', processing_days: [1, 4], FAAB_budget_default: 100 },
  SOCCER: { sport_type: 'SOCCER', waiver_type: 'faab', processing_days: [1, 4], FAAB_budget_default: 100 },
}

/** Team metadata: empty by default; can be populated from external source or DB. */
const TEAM_METADATA_DEFAULTS: Record<SportType, TeamMetadataDefaults> = {
  NFL: { sport_type: 'NFL', teams: [] },
  NBA: { sport_type: 'NBA', teams: [] },
  MLB: { sport_type: 'MLB', teams: [] },
  NHL: { sport_type: 'NHL', teams: [] },
  NCAAF: { sport_type: 'NCAAF', teams: [] },
  NCAAB: { sport_type: 'NCAAB', teams: [] },
  SOCCER: { sport_type: 'SOCCER', teams: [] },
}

export function getLeagueDefaults(sportType: SportType): LeagueDefaults {
  return LEAGUE_DEFAULTS[sportType] ?? LEAGUE_DEFAULTS.NFL
}

/**
 * Get roster defaults for a sport. When formatType is 'IDP' for NFL, returns base NFL + IDP slots and flex definitions.
 */
export function getRosterDefaults(sportType: SportType, formatType?: string): RosterDefaults {
  const base = ROSTER_DEFAULTS[sportType] ?? ROSTER_DEFAULTS.NFL
  if (sportType === 'NFL' && (formatType === 'IDP' || formatType === 'idp')) {
    const overlay = getRosterOverlayForVariant(sportType, 'IDP')
    const starter_slots = { ...base.starter_slots, ...(overlay ?? {}) }
    starter_slots['DL'] = 1
    starter_slots['DB'] = 1
    starter_slots['IDP_FLEX'] = 1
    const flex_definitions = [
      ...base.flex_definitions,
      { slotName: 'DL', allowedPositions: ['DE', 'DT'] },
      { slotName: 'DB', allowedPositions: ['CB', 'S'] },
      { slotName: 'IDP_FLEX', allowedPositions: ['DE', 'DT', 'LB', 'CB', 'S'] },
    ]
    return { ...base, starter_slots, flex_definitions }
  }
  return base
}

export function getScoringDefaults(sportType: SportType): ScoringDefaults {
  return SCORING_DEFAULTS[sportType] ?? SCORING_DEFAULTS.NFL
}

export function getDraftDefaults(sportType: SportType): DraftDefaults {
  return DRAFT_DEFAULTS[sportType] ?? DRAFT_DEFAULTS.NFL
}

export function getWaiverDefaults(sportType: SportType): WaiverDefaults {
  return WAIVER_DEFAULTS[sportType] ?? WAIVER_DEFAULTS.NFL
}

export function getTeamMetadataDefaults(sportType: SportType): TeamMetadataDefaults {
  return TEAM_METADATA_DEFAULTS[sportType] ?? TEAM_METADATA_DEFAULTS.NFL
}
