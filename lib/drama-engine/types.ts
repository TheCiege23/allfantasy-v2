/**
 * League Drama Engine — types for events, timeline, and drama types.
 */

export const DRAMA_TYPES = [
  'REVENGE_GAME',
  'MAJOR_UPSET',
  'RIVALRY_CLASH',
  'WIN_STREAK',
  'LOSING_STREAK',
  'PLAYOFF_BUBBLE',
  'TITLE_DEFENSE',
  'TRADE_FALLOUT',
  'REBUILD_PROGRESS',
  'DYNASTY_SHIFT',
] as const
export type DramaType = (typeof DRAMA_TYPES)[number]

export interface DramaEventPayload {
  leagueId: string
  sport: string
  season?: number | null
  dramaType: DramaType
  headline: string
  summary?: string | null
  relatedManagerIds?: string[]
  relatedTeamIds?: string[]
  relatedMatchupId?: string | null
  dramaScore: number
}

export const DRAMA_SPORTS = ['NFL', 'NHL', 'NBA', 'MLB', 'NCAAB', 'NCAAF', 'SOCCER'] as const
export type DramaSport = (typeof DRAMA_SPORTS)[number]
