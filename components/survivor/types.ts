/**
 * Frontend types for Survivor league summary (PROMPT 347).
 */

export type SurvivorView =
  | 'tribe-board'
  | 'challenge'
  | 'council'
  | 'idols'
  | 'exile'
  | 'merge-jury'
  | 'ai'

export interface SurvivorSummaryConfig {
  mode: string
  tribeCount: number
  tribeSize: number
  mergeTrigger: string
  mergeWeek: number
  mergePlayerCount: number | null
  juryStartAfterMerge: boolean
  exileReturnEnabled: boolean
  exileReturnTokens: number
  voteDeadlineDayOfWeek: number
  voteDeadlineTimeUtc: string
  selfVoteDisallowed: boolean
}

export interface SurvivorSummaryTribe {
  id: string
  name: string
  slotIndex: number
  members: { rosterId: string; isLeader: boolean }[]
}

export interface SurvivorSummaryCouncil {
  id: string
  week: number
  phase: string
  attendingTribeId: string | null
  voteDeadlineAt: string
  closedAt: string | null
  eliminatedRosterId: string | null
}

export interface SurvivorSummaryChallenge {
  id: string
  week: number
  challengeType: string
  lockAt: string | null
  resultJson: unknown
  submissionCount: number
}

export interface SurvivorSummary {
  config: SurvivorSummaryConfig
  currentWeek: number
  tribes: SurvivorSummaryTribe[]
  council: SurvivorSummaryCouncil | null
  challenges: SurvivorSummaryChallenge[]
  jury: { rosterId: string; votedOutWeek: number }[]
  exileLeagueId: string | null
  exileTokens: { rosterId: string; tokens: number; lastAwardedWeek: number | null }[]
  votedOutHistory: { rosterId?: string; week?: number }[]
  merged: boolean
  myRosterId?: string
  myIdols: { id: string; playerId: string; powerType: string }[]
  rosterDisplayNames?: Record<string, string>
}
