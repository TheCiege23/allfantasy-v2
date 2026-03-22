/**
 * League Drama Engine — types for events, timeline, and drama types.
 */

import type { SupportedSport } from '@/lib/sport-scope'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

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

export const DRAMA_SPORTS: readonly SupportedSport[] = [...SUPPORTED_SPORTS]
export type DramaSport = SupportedSport

export interface DramaDetectionSignal {
  intensityFactor?: number
  rivalryScore?: number
  upsetMagnitude?: number
  playoffSwing?: number
  recencyWeight?: number
  managerBehaviorHeat?: number
  leagueGraphHeat?: number
}

export const DRAMA_TYPE_LABELS: Record<DramaType, string> = {
  REVENGE_GAME: 'Revenge Game',
  MAJOR_UPSET: 'Major Upset',
  RIVALRY_CLASH: 'Rivalry Clash',
  WIN_STREAK: 'Win Streak',
  LOSING_STREAK: 'Losing Streak',
  PLAYOFF_BUBBLE: 'Playoff Bubble',
  TITLE_DEFENSE: 'Title Defense',
  TRADE_FALLOUT: 'Trade Fallout',
  REBUILD_PROGRESS: 'Rebuild Progress',
  DYNASTY_SHIFT: 'Dynasty Shift',
}
