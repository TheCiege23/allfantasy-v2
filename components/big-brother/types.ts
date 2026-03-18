/**
 * [NEW] Big Brother UI types. PROMPT 4.
 */

export type BigBrotherUserStatus =
  | 'SAFE'
  | 'HOH'
  | 'NOMINATED'
  | 'VETO_PLAYER'
  | 'VETO_WINNER'
  | 'ELIMINATED'
  | 'JURY'

export interface BigBrotherSummary {
  totalRosterCount?: number
  remainingCount?: number
  config: { sport: string; finaleFormat: string; juryStartMode: string }
  cycle: {
    id: string
    week: number
    phase: string
    hohRosterId: string | null
    nominee1RosterId: string | null
    nominee2RosterId: string | null
    vetoWinnerRosterId: string | null
    vetoParticipantRosterIds: string[] | null
    vetoUsed: boolean
    vetoSavedRosterId: string | null
    replacementNomineeRosterId: string | null
    evictedRosterId: string | null
    voteDeadlineAt: string | null
    voteOpenedAt: string | null
    closedAt: string | null
  } | null
  finalNomineeRosterIds: string[]
  eligibility: {
    canCompeteHOH: string[]
    canBeNominated: string[]
    canVote: string[]
    juryRosterIds: string[]
    eliminatedRosterIds: string[]
  } | null
  jury: { rosterId: string; evictedWeek: number }[]
  ballot: { canVote: boolean; voteDeadlineAt: string | null; closed: boolean } | null
  myRosterId: string | null
  myStatus: BigBrotherUserStatus | null
  rosterDisplayNames: Record<string, string>
}

export type BigBrotherView = 'house' | 'ceremony' | 'voting' | 'jury' | 'commissioner'
