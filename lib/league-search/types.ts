/**
 * League Search Engine (PROMPT 224) — input/output types.
 * Search fields: league name, commissioner, sport, league type.
 */

import type { LeagueSport } from "@prisma/client"

export interface LeagueSearchInput {
  /** Free-text: matches league name (case-insensitive contains). */
  leagueName?: string | null
  /** Matches commissioner by display name or sleeper username (case-insensitive contains). */
  commissioner?: string | null
  /** Exact sport filter (normalized to LeagueSport). */
  sport?: string | null
  /** League type: e.g. "dynasty", "redraft", or leagueVariant value (case-insensitive contains). */
  leagueType?: string | null
  limit?: number
  offset?: number
}

export interface LeagueSearchHit {
  id: string
  name: string | null
  sport: LeagueSport
  leagueVariant: string | null
  isDynasty: boolean
  season: number | null
  leagueSize: number | null
  commissionerId: string
  commissionerName: string | null
  platform: string
  platformLeagueId: string
}

export interface LeagueSearchResult {
  hits: LeagueSearchHit[]
  total: number
  limit: number
  offset: number
}
