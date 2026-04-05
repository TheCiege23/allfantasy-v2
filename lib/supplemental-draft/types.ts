/**
 * Supplemental draft — orphaned / dissolved team asset pool and live draft state.
 */

export type SupplementalScenario = 'orphan_teams' | 'league_downsizing'

export type SupplementalAssetType = 'player' | 'draft_pick' | 'faab'

export type SupplementalAsset = {
  id: string
  assetType: SupplementalAssetType
  sourceRosterId: string

  playerId?: string
  playerName?: string
  playerPosition?: string
  playerTeam?: string

  pickId?: string
  pickRound?: number
  pickYear?: number
  originalOwnerRosterId?: string
  tradedToRosterId?: string
  pickLabel?: string
  isTradedPick?: boolean

  faabAmount?: number

  claimedByRosterId?: string | null
  claimedAt?: string | null
  isAvailable: boolean
}

export type SupplementalDraftConfig = {
  leagueId: string
  scenario: SupplementalScenario
  sourceRosterIds: string[]
  participantRosterIds: string[]
  orderMode: 'randomized' | 'commissioner_set'
  manualOrder?: string[]
  pickTimeSeconds: number
  autoPickOnTimeout: boolean
}

export type SupplementalDraftState = {
  id: string
  leagueId: string
  scenario: SupplementalScenario
  status: 'pending' | 'configuring' | 'in_progress' | 'completed' | 'cancelled'
  participantRosterIds: string[]
  passedRosterIds: string[]
  draftOrder: string[]
  currentPickIndex: number
  totalRounds: number
  picksPerRound: number
  assetPool: SupplementalAsset[]
  sourceRosterIds: string[]
  picks: {
    pickNumber: number
    round: number
    pickInRound: number
    rosterId: string
    assetType?: string
    assetId?: string
    assetDisplayName?: string
    isPassed: boolean
    pickedAt?: string
  }[]
  currentRosterId: string | null
  currentPickNumber: number
  isComplete: boolean
  startedAt: string | null
  completedAt: string | null
  pickTimeSeconds: number
  autoPickOnTimeout: boolean
}
