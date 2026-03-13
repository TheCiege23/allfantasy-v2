/**
 * Mock draft config and state types.
 * Used by setup flow, engine, and recap.
 */

export type MockDraftSport = 'NFL' | 'NBA' | 'MLB'

export type MockLeagueType = 'redraft' | 'dynasty'

export type MockDraftType = 'snake' | 'linear' | 'auction'

export type MockScoringFormat = 'ppr' | 'half-ppr' | 'standard' | 'sf' | 'tep' | 'default'

export interface MockDraftConfig {
  sport: MockDraftSport
  leagueType: MockLeagueType
  draftType: MockDraftType
  numTeams: number
  scoringFormat: MockScoringFormat
  /** Timer seconds per pick (0 = no timer) */
  timerSeconds: number
  /** AI assistant on/off */
  aiEnabled: boolean
  /** Number of rounds */
  rounds: number
  /** Optional league id when mock is tied to a league */
  leagueId?: string | null
}

export const DEFAULT_MOCK_CONFIG: MockDraftConfig = {
  sport: 'NFL',
  leagueType: 'redraft',
  draftType: 'snake',
  numTeams: 12,
  scoringFormat: 'default',
  timerSeconds: 60,
  aiEnabled: true,
  rounds: 15,
  leagueId: null,
}

export interface MockDraftPick {
  round: number
  pick: number
  overall: number
  playerName: string
  position: string
  team: string
  manager: string
  managerAvatar?: string
  confidence?: number
  isUser: boolean
  value?: number
  notes?: string
  isBotPick?: boolean
}

export interface MockDraftMetadata {
  sport?: string
  leagueType?: string
  draftType?: string
  numTeams?: number
  scoringFormat?: string
  timerSeconds?: number
  aiEnabled?: boolean
  source?: string
}
