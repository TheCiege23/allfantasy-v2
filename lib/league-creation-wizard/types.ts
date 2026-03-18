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

export type DraftTypeId = 'snake' | 'linear' | 'auction' | 'slow_draft' | 'mock_draft'

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
  /** C2C only */
  c2cCollegeRounds: number[]
  /** C2C: merged | separate */
  c2cStartupMode?: 'merged' | 'separate'
  /** C2C: unified | separate | hybrid */
  c2cStandingsModel?: 'unified' | 'separate' | 'hybrid'
  c2cBestBallPro?: boolean
  c2cBestBallCollege?: boolean
  c2cCollegeRosterSize?: number
  c2cRookieDraftRounds?: number
  c2cCollegeDraftRounds?: number
}

export interface WizardAISettings {
  aiAdpEnabled: boolean
  orphanTeamAiManagerEnabled: boolean
  draftHelperEnabled: boolean
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
  aiSettings: WizardAISettings
  automationSettings: WizardAutomationSettings
  privacySettings: WizardPrivacySettings
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
  c2cCollegeRounds: [],
  c2cStartupMode: 'merged',
  c2cStandingsModel: 'unified',
  c2cBestBallPro: true,
  c2cBestBallCollege: false,
  c2cCollegeRosterSize: 20,
  c2cRookieDraftRounds: 4,
  c2cCollegeDraftRounds: 6,
}

export const DEFAULT_AI_SETTINGS: WizardAISettings = {
  aiAdpEnabled: false,
  orphanTeamAiManagerEnabled: false,
  draftHelperEnabled: true,
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
