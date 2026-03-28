/**
 * PROMPT 153 — ClearSports API response types (raw from API / parsed).
 */

import type { SupportedSport } from '@/lib/sport-scope'

export type ClearSportsSport = SupportedSport

export interface ClearSportsTeam {
  id: string
  name: string
  shortName?: string | null
  city?: string | null
  mascot?: string | null
  logo?: string | null
}

export interface ClearSportsPlayer {
  id: string
  name: string
  position?: string | null
  teamId?: string | null
  teamAbbrev?: string | null
  number?: number | null
  height?: string | null
  weight?: number | null
  college?: string | null
  dob?: string | null
  status?: string | null
  imageUrl?: string | null
}

export interface ClearSportsGame {
  id: string
  homeTeamId: string
  homeTeamAbbrev?: string | null
  awayTeamId: string
  awayTeamAbbrev?: string | null
  date?: string | null
  status?: string | null
  season?: string | null
  venue?: string | null
}
