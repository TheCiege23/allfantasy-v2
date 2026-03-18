/**
 * [NEW] lib/tournament-mode/types.ts
 * Tournament Mode — type definitions for tournament creation, conferences, rounds, and hub.
 */

export type TournamentDraftType = 'snake' | 'linear' | 'auction'

export const TOURNAMENT_PARTICIPANT_POOL_SIZES = [60, 120, 180, 240] as const
export type TournamentParticipantPoolSize = (typeof TOURNAMENT_PARTICIPANT_POOL_SIZES)[number]

export type ConferenceMode = 'black_vs_gold' | 'random_themed' | 'commissioner_custom'

export type LeagueNamingMode = 'commissioner_custom' | 'app_generated' | 'ai_themed'

export const TOURNAMENT_LEAGUE_SIZES = [10, 11, 12] as const
export type TournamentLeagueSize = (typeof TOURNAMENT_LEAGUE_SIZES)[number]

export type TournamentPhase = 'qualification' | 'elimination' | 'elite_eight' | 'championship'

export type TournamentStatus = 'setup' | 'qualification' | 'elimination' | 'finals' | 'completed'

export interface TournamentSettings {
  draftType: TournamentDraftType
  participantPoolSize: number
  conferenceMode: ConferenceMode
  leagueNamingMode: LeagueNamingMode
  initialLeagueSize: number | 'auto'
  qualificationWeeks: number
  qualificationTiebreakers: string[]  // e.g. ['wins', 'points_for']
  bubbleWeekEnabled: boolean
  roundRedraftSchedule: number[]       // week numbers when redraft occurs
  finalsRedraftEnabled: boolean
  faabBudgetDefault: number
  faabResetByRound: boolean
  benchSpotsQualification: number
  benchSpotsElimination: number
  universalPageVisibility: 'public' | 'unlisted' | 'private'
  forumAnnouncementsEnabled: boolean
  bannerTheme?: string
}

export interface TournamentHubSettings {
  visibility: 'public' | 'unlisted' | 'private'
  forumAnnouncements: boolean
  bannerTheme?: string
}

export interface TournamentConferenceTheme {
  primaryColor: string
  secondaryColor: string
  iconName?: string
  label: string
}

/** Black vs Gold naming themes (feeder round). */
export const BLACK_VS_GOLD_LEAGUE_NAMES = [
  'BEAST', 'GOAT', 'GRIZZ', 'KINGS', 'REBELS', 'SMOKE', 'STEALTH', 'SWAMP', 'THUNDER', 'WARRIOR',
] as const

/** Later rounds (directional). */
export const LATER_ROUND_LEAGUE_NAMES = ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const

export interface CreateTournamentInput {
  name: string
  sport: string
  creatorId: string
  season?: number
  variant?: string
  settings: Partial<TournamentSettings>
  hubSettings?: Partial<TournamentHubSettings>
  conferenceNames?: [string, string]  // [Black, Gold] or custom
  leagueNames?: string[]             // commissioner custom names (one per league)
}

export interface TournamentWithRelations {
  id: string
  name: string
  sport: string
  season: number
  variant: string
  creatorId: string
  settings: Record<string, unknown>
  hubSettings: Record<string, unknown>
  status: string
  conferences: Array<{
    id: string
    name: string
    theme: string
    themePayload: Record<string, unknown> | null
    orderIndex: number
    leagues: Array<{
      id: string
      leagueId: string
      league: { id: string; name: string | null; leagueSize: number | null }
      roundIndex: number
      phase: string
      orderInConference: number
    }>
  }>
  rounds: Array<{
    id: string
    roundIndex: number
    phase: string
    name: string | null
    startWeek: number | null
    endWeek: number | null
    status: string
  }>
  _leagueCount?: number
}

export interface InviteDistributionItem {
  leagueId: string
  leagueName: string
  conferenceName: string
  inviteCode: string | null
  joinUrl: string | null
}
