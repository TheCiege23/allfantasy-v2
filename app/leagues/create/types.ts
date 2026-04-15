import type { LeagueSport } from '@prisma/client'
import type { Dispatch, SetStateAction } from 'react'
import type {
  LeagueDraftTypeId,
  LeagueFormatId,
  LeagueFormatModifierId,
} from '@/lib/league/format-engine'

export type LeagueCreateStepId =
  | 'sport'
  | 'format'
  | 'modifiers'
  | 'draft'
  | 'roster'
  | 'scoring'
  | 'rules'
  | 'invite'

export type LeagueCreateFormState = {
  sport: LeagueSport
  formatId: LeagueFormatId
  modifiers: LeagueFormatModifierId[]
  leagueName: string
  teamCount: number
  draftType: LeagueDraftTypeId
  draftRounds: number
  timerSeconds: number
  auctionBudget: number
  rosterSize: number
  scoringMode: 'points' | 'category' | 'roto'
  scoringFormat: string
  maxKeepers: number
  salaryCap: number
  playoffTeamCount: number
  regularSeasonLength: number
  tradeReviewMode: 'none' | 'commissioner' | 'league_vote' | 'instant'
  constitutionNotes: string
  visibility: 'private' | 'unlisted' | 'public'
  allowInviteLink: boolean
  inviteEmails: string
  /** Survivor: 2–4 tribes (sent as `survivor_suggested_tribe_count`). */
  survivorTribeCount: number
  /** Survivor: optional headline (e.g. Heroes vs Villains). */
  survivorSeasonTheme: string
  /** Survivor: system-generated weekly challenges (default on). */
  survivorChallengesSystemRun: boolean
  // Survivor wizard-only fields (see SurvivorSetupStep)
  survivorPlayerCount: number
  survivorCommissionerPlays: boolean
  survivorTribeFormation: 'random' | 'manual' | 'draft_pattern'
  survivorTribeNaming: 'auto' | 'ai' | 'custom'
  survivorMergeTrigger: 'player_count' | 'week'
  survivorMergeWeek: number
  survivorMergeAtCount: number
  survivorJuryStart: 'after_merge' | 'first_post_merge_vote' | 'at_player_count'
  survivorIdolsEnabled: boolean
  survivorIdolsTradable: boolean
  survivorIdolsExpireAtMerge: boolean
  survivorIdolCount: number
  survivorExileEnabled: boolean
  survivorTokenEnabled: boolean
  survivorBossResetEnabled: boolean
  survivorSelfVoteAllowed: boolean
  survivorRocksEnabled: boolean
  survivorTieRule: 'rocks' | 'fire_making' | 'score' | 'commissioner'
  survivorRevealMode: 'dramatic' | 'full_public' | 'anonymized' | 'delayed'
  survivorChallengeMode: 'automatic' | 'semi_automatic' | 'manual'
  // Guillotine wizard-only fields (see GuillotineSetupStep)
  guillotineEliminationsPerPeriod: number
  guillotineProtectedWeek1: boolean
  guillotineEndgame: 'last_team_standing' | 'final_four' | 'final_three' | 'final_two'
  guillotineTiebreaker:
    | 'lowest_bench_points'
    | 'lowest_cumulative'
    | 'lowest_projected'
    | 'commissioner'
  guillotineWaiverMode: 'faab' | 'rolling' | 'reverse'
  guillotineFaabBudget: number
  guillotineSamePeriodPickups: boolean
  guillotineTradesEnabled: boolean
  /** Zombie: whisperer pick order. */
  zombieWhispererSelection: 'random' | 'veteran_priority'
}

export type LeagueCreateStepProps = {
  state: LeagueCreateFormState
  setState: Dispatch<SetStateAction<LeagueCreateFormState>>
}
