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
  | 'survivor_setup'
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
  // Survivor-specific fields
  survivorPlayerCount: number
  survivorTribeCount: number
  survivorTribeFormation: 'random' | 'manual' | 'draft_pattern'
  survivorTribeNaming: 'custom' | 'auto' | 'ai'
  survivorMergeTrigger: 'week' | 'player_count'
  survivorMergeWeek: number
  survivorMergeAtCount: number
  survivorJuryStart: 'after_merge' | 'first_post_merge_vote' | 'at_player_count'
  survivorExileEnabled: boolean
  survivorIdolsEnabled: boolean
  survivorIdolCount: number
  survivorIdolsTradable: boolean
  survivorIdolsExpireAtMerge: boolean
  survivorChallengeMode: 'automatic' | 'semi_automatic' | 'manual'
  survivorSelfVoteAllowed: boolean
  survivorRocksEnabled: boolean
  survivorTieRule: 'rocks' | 'fire_making' | 'score' | 'commissioner'
  survivorRevealMode: 'dramatic' | 'full_public' | 'anonymized' | 'delayed'
  survivorTokenEnabled: boolean
  survivorBossResetEnabled: boolean
  survivorCommissionerPlays: boolean
}

export type LeagueCreateStepProps = {
  state: LeagueCreateFormState
  setState: Dispatch<SetStateAction<LeagueCreateFormState>>
}
