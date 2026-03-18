/**
 * Mock draft engine types.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

export type MockDraftStatus = 'pre_draft' | 'in_progress' | 'paused' | 'completed'

export type MockSlotType = 'human' | 'cpu'

export interface MockSlotConfigEntry {
  slot: number
  type: MockSlotType
  userId?: string | null
  displayName?: string | null
}

export interface MockDraftSettings {
  sport: string
  leagueType: string
  draftType: string
  numTeams: number
  rounds: number
  timerSeconds: number
  aiEnabled: boolean
  scoringFormat?: string
  leagueId?: string | null
  rosterSize?: number
  /** rookies | vets | all */
  poolType?: string
}

export interface MockDraftSessionSnapshot {
  id: string
  status: MockDraftStatus
  inviteToken: string | null
  inviteLink: string | null
  canManage?: boolean
  shareId: string | null
  settings: MockDraftSettings
  slotConfig: MockSlotConfigEntry[]
  results: unknown[]
  rounds: number
  createdAt: string
  updatedAt: string
}
