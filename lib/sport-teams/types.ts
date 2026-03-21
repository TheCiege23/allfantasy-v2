/**
 * Team metadata and player pool mapping by sport — types.
 */

export type SportType =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'NCAAF'
  | 'NCAAB'
  | 'SOCCER'

/** Team metadata for display and logo resolution. */
export interface TeamMetadata {
  team_id: string
  sport_type: SportType
  team_name: string
  city: string
  abbreviation: string
  conference?: string | null
  division?: string | null
  primary_logo_url: string | null
  alternate_logo_url?: string | null
  primary_color?: string | null
}

/** Player record for pool/roster (sport-scoped). */
export interface PoolPlayerRecord {
  player_id: string
  sport_type: SportType
  league_variant?: string | null
  team_id: string | null
  team_abbreviation: string | null
  team?: string | null
  full_name: string
  position: string
  status: string | null
  injury_status: string | null
  external_source_id: string | null
  age?: number | null
  experience?: number | null
  secondary_positions?: string[]
  metadata?: Record<string, unknown>
}

/** Universal player model for multi-sport ingestion and display (alias + optional fields). */
export type UniversalPlayerRecord = PoolPlayerRecord
