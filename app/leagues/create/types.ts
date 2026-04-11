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
  /** Zombie: whisperer pick order. */
  zombieWhispererSelection: 'random' | 'veteran_priority'
}

export type LeagueCreateStepProps = {
  state: LeagueCreateFormState
  setState: Dispatch<SetStateAction<LeagueCreateFormState>>
}
