import type { Dispatch, SetStateAction } from 'react'

export type LeagueCreateStepState = {
  sport: string
  formatId: string
  draftType: string
  modifiers: string[]
  scoringMode: 'points' | 'category' | 'roto'
  scoringFormat: string
  leagueName: string
  teamCount: number
  rosterSize: number
  playoffTeamCount: number
  regularSeasonLength: number
  maxKeepers: number
  salaryCap: number
  tradeReviewMode: 'none' | 'commissioner' | 'league_vote' | 'instant'
  constitutionNotes: string
  visibility: 'private' | 'unlisted' | 'public'
  allowInviteLink: boolean
  inviteEmails: string
  survivorTribeCount: number
  survivorSeasonTheme: string
  survivorChallengesSystemRun: boolean
  survivorPlayerCount: number
  survivorCommissionerPlays: boolean
  survivorTribeFormation: string
  survivorTribeNaming: string
  survivorMergeTrigger: 'week' | 'players_remaining'
  survivorMergeWeek: number
  survivorMergeAtCount: number
  survivorJuryStart: string
  survivorIdolsEnabled: boolean
  survivorIdolsTradable: boolean
  survivorIdolsExpireAtMerge: boolean
  survivorIdolCount: number
  survivorExileEnabled: boolean
  survivorTokenEnabled: boolean
  survivorBossResetEnabled: boolean
  survivorSelfVoteAllowed: boolean
  survivorRocksEnabled: boolean
  survivorTieRule: string
  survivorRevealMode: string
  survivorChallengeMode: string
  zombieWhispererSelection: 'random' | 'veteran_priority'
  guillotineEliminationsPerPeriod: number
  guillotineProtectedWeek1: boolean
  guillotineEndgame: string
  guillotineTiebreaker: string
  guillotineWaiverMode: string
  guillotineFaabBudget: number
  guillotineSamePeriodPickups: boolean
  guillotineTradesEnabled: boolean
  [key: string]: unknown
}

export type LeagueCreateStepProps = {
  state: LeagueCreateStepState
  setState: Dispatch<SetStateAction<LeagueCreateStepState>>
}
