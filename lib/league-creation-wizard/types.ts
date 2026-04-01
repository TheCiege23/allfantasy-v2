/**
 * League Creation Wizard — state and step types.
 * Supports all sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) and league/draft types.
 */

import type { LeagueSport } from '@prisma/client'

export type WizardStepId =
  | 'sport'
  | 'league_type'
  | 'draft_type'
  | 'team_setup'
  | 'scoring'
  | 'draft_settings'
  | 'waiver_settings'
  | 'playoff_settings'
  | 'schedule_settings'
  | 'ai_settings'
  | 'automation'
  | 'privacy'
  | 'review'

export type LeagueTypeId =
  | 'redraft'
  | 'dynasty'
  | 'keeper'
  | 'best_ball'
  | 'guillotine'
  | 'survivor'
  | 'tournament'
  | 'devy'
  | 'c2c'
  | 'zombie'
  | 'salary_cap'

export type DraftTypeId =
  | 'snake'
  | 'linear'
  | 'auction'
  | 'slow_draft'
  | 'mock_draft'
  | 'devy_snake'
  | 'devy_auction'
  | 'c2c_snake'
  | 'c2c_auction'

export interface WizardDraftSettings {
  rounds: number
  timerSeconds: number | null
  thirdRoundReversal: boolean
  /** Auction only */
  auctionBudgetPerTeam: number | null
  /** Keeper only */
  keeperMaxKeepers: number | null
  /** Devy only */
  devyRounds: number[]
  devySlotCount?: number
  devyIrSlots?: number
  devyTaxiSlots?: number
  devyCollegeSports?: string[]
  /** C2C only */
  c2cCollegeRounds: number[]
  c2cCollegeSports?: string[]
  /** C2C: merged | separate */
  c2cStartupMode?: 'merged' | 'separate'
  /** C2C: unified | separate | hybrid */
  c2cStandingsModel?: 'unified' | 'separate' | 'hybrid'
  c2cBestBallPro?: boolean
  c2cBestBallCollege?: boolean
  c2cCollegeRosterSize?: number
  c2cRookieDraftRounds?: number
  c2cCollegeDraftRounds?: number
  c2cScoringSystem?: 'ppr' | 'standard' | 'points'
  c2cMixProPlayers?: boolean
}

export interface WizardAISettings {
  aiAdpEnabled: boolean
  orphanTeamAiManagerEnabled: boolean
  draftHelperEnabled: boolean
}

export interface WizardWaiverSettings {
  waiverType: 'faab' | 'rolling' | 'reverse_standings' | 'fcfs' | 'standard'
  processingDays: number[]
  processingTimeUtc: string | null
  faabEnabled: boolean
  faabBudget: number | null
  faabResetRules: string | null
  claimPriorityBehavior: string | null
  continuousWaiversBehavior: boolean
  freeAgentUnlockBehavior: string | null
  gameLockBehavior: string | null
  dropLockBehavior: string | null
  sameDayAddDropRules: string | null
  maxClaimsPerPeriod: number | null
}

export interface WizardPlayoffSettings {
  playoffTeamCount: number
  playoffWeeks: number
  playoffStartWeek: number | null
  seedingRules: string
  tiebreakerRules: string[]
  byeRules: string | null
  firstRoundByes: number
  matchupLength: number
  totalRounds: number | null
  consolationBracketEnabled: boolean
  thirdPlaceGameEnabled: boolean
  toiletBowlEnabled: boolean
  championshipLength: number
  consolationPlaysFor: 'pick' | 'none' | 'cash'
  reseedBehavior: string
}

export interface WizardScheduleSettings {
  scheduleUnit: 'week' | 'round' | 'series' | 'slate' | 'scoring_period'
  regularSeasonLength: number
  matchupFrequency: 'weekly' | 'daily' | 'round' | 'slate'
  matchupCadence: 'weekly' | 'daily' | 'round' | 'slate'
  headToHeadOrPointsBehavior: string
  lockTimeBehavior: 'game_time' | 'first_game' | 'slate_lock' | 'manual'
  lockWindowBehavior: string
  scoringPeriodBehavior: string
  rescheduleHandling: string
  doubleheaderOrMultiGameHandling: string
  playoffTransitionPoint: number | null
  scheduleGenerationStrategy: string
}

export interface WizardAutomationSettings {
  draftNotificationsEnabled: boolean
  autopickFromQueueEnabled: boolean
  slowDraftRemindersEnabled: boolean
}

export interface WizardPrivacySettings {
  visibility: 'private' | 'unlisted' | 'public'
  allowInviteLink: boolean
}

export interface LeagueCreationWizardState {
  step: WizardStepId
  sport: LeagueSport | string
  leagueType: LeagueTypeId
  draftType: DraftTypeId
  name: string
  teamCount: number
  rosterSize: number | null
  scoringPreset: string | null
  leagueVariant: string | null
  draftSettings: WizardDraftSettings
  waiverSettings: WizardWaiverSettings
  playoffSettings: WizardPlayoffSettings
  scheduleSettings: WizardScheduleSettings
  tradeReviewMode: 'none' | 'commissioner' | 'league_vote' | 'instant'
  aiSettings: WizardAISettings
  automationSettings: WizardAutomationSettings
  privacySettings: WizardPrivacySettings
  /**
   * Optional full settings snapshot from a saved template.
   * These keys are merged into League.settings on create before wizard-level overrides.
   */
  templateSettingsOverrides?: Record<string, unknown>
}

export const WIZARD_STEP_ORDER: WizardStepId[] = [
  'sport',
  'league_type',
  'draft_type',
  'team_setup',
  'scoring',
  'draft_settings',
  'ai_settings',
  'automation',
  'privacy',
  'review',
]

export const DEFAULT_DRAFT_SETTINGS: WizardDraftSettings = {
  rounds: 15,
  timerSeconds: 90,
  thirdRoundReversal: false,
  auctionBudgetPerTeam: 200,
  keeperMaxKeepers: 3,
  devyRounds: [],
  devySlotCount: 12,
  devyIrSlots: 2,
  devyTaxiSlots: 6,
  devyCollegeSports: ['NCAAF'],
  c2cCollegeRounds: [],
  c2cCollegeSports: ['NCAAF'],
  c2cStartupMode: 'merged',
  c2cStandingsModel: 'unified',
  c2cBestBallPro: true,
  c2cBestBallCollege: false,
  c2cCollegeRosterSize: 20,
  c2cRookieDraftRounds: 4,
  c2cCollegeDraftRounds: 6,
  c2cScoringSystem: 'ppr',
  c2cMixProPlayers: true,
}

export const DEFAULT_AI_SETTINGS: WizardAISettings = {
  aiAdpEnabled: false,
  orphanTeamAiManagerEnabled: false,
  draftHelperEnabled: true,
}

export const DEFAULT_WAIVER_SETTINGS: WizardWaiverSettings = {
  waiverType: 'faab',
  processingDays: [2],
  processingTimeUtc: '10:00',
  faabEnabled: true,
  faabBudget: 100,
  faabResetRules: 'never',
  claimPriorityBehavior: 'faab_highest',
  continuousWaiversBehavior: false,
  freeAgentUnlockBehavior: 'after_waiver_run',
  gameLockBehavior: 'game_time',
  dropLockBehavior: 'lock_with_game',
  sameDayAddDropRules: 'allow_if_not_played',
  maxClaimsPerPeriod: 10,
}

export const DEFAULT_PLAYOFF_SETTINGS: WizardPlayoffSettings = {
  playoffTeamCount: 6,
  playoffWeeks: 3,
  playoffStartWeek: 15,
  seedingRules: 'standard_standings',
  tiebreakerRules: ['points_for', 'head_to_head', 'points_against'],
  byeRules: 'top_two_seeds_bye',
  firstRoundByes: 2,
  matchupLength: 1,
  totalRounds: 3,
  consolationBracketEnabled: true,
  thirdPlaceGameEnabled: true,
  toiletBowlEnabled: false,
  championshipLength: 1,
  consolationPlaysFor: 'pick',
  reseedBehavior: 'fixed_bracket',
}

export const DEFAULT_SCHEDULE_SETTINGS: WizardScheduleSettings = {
  scheduleUnit: 'week',
  regularSeasonLength: 18,
  matchupFrequency: 'weekly',
  matchupCadence: 'weekly',
  headToHeadOrPointsBehavior: 'head_to_head',
  lockTimeBehavior: 'first_game',
  lockWindowBehavior: 'first_game_of_week',
  scoringPeriodBehavior: 'full_period',
  rescheduleHandling: 'use_final_time',
  doubleheaderOrMultiGameHandling: 'all_games_count',
  playoffTransitionPoint: 15,
  scheduleGenerationStrategy: 'round_robin',
}

export const DEFAULT_AUTOMATION_SETTINGS: WizardAutomationSettings = {
  draftNotificationsEnabled: true,
  autopickFromQueueEnabled: true,
  slowDraftRemindersEnabled: true,
}

export const DEFAULT_PRIVACY_SETTINGS: WizardPrivacySettings = {
  visibility: 'private',
  allowInviteLink: true,
}
