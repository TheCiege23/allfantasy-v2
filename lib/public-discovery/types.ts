/**
 * Public League Discovery Engine (PROMPT 144) — types.
 * Safe public data only; supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

export type DiscoverySource = "bracket" | "creator"

export type DiscoverySort = "popularity" | "newest" | "filling_fast"

export type DiscoveryFormat = "all" | "bracket" | "creator"

export type EntryFeeFilter = "all" | "free" | "paid"

export type DraftTypeFilter = "all" | "snake" | "linear" | "auction"
export type DraftStatusFilter = "all" | "pre_draft" | "in_progress" | "completed"
export type VisibilityFilter = "public" | "all"

export interface DiscoveryCard {
  source: DiscoverySource
  id: string
  name: string
  description: string | null
  sport: string
  memberCount: number
  maxMembers: number
  joinUrl: string
  detailUrl: string
  ownerName: string | null
  ownerAvatar: string | null
  creatorSlug: string | null
  creatorName: string | null
  tournamentName: string | null
  season: number | null
  scoringMode: string | null
  isPaid: boolean
  isPrivate: boolean
  createdAt: string
  fillPct: number
  /** League type for display (bracket | creator). */
  leagueType: DiscoverySource
  /** Draft type when available (snake | linear | auction). */
  draftType: string | null
  /** Team/slot count (same as maxMembers). */
  teamCount: number
  /** Draft or join deadline when available (ISO). */
  draftDate: string | null
  /** Commissioner display name (same as ownerName). */
  commissionerName: string | null
  /** AI-enabled features for display (e.g. ["ADP", "Trade"]). */
  aiFeatures: string[]
  /** Creator leagues only: FANTASY | BRACKET. */
  creatorLeagueType?: string | null
  /** Creator leagues only: whether creator has verified badge. */
  isCreatorVerified?: boolean
}

export interface DiscoverLeaguesInput {
  query?: string | null
  sport?: string | null
  format?: DiscoveryFormat
  sort?: DiscoverySort
  entryFee?: EntryFeeFilter
  page?: number
  limit?: number
  teamCountMin?: number | null
  teamCountMax?: number | null
  visibility?: VisibilityFilter
  draftType?: DraftTypeFilter
  draftStatus?: DraftStatusFilter
  aiEnabled?: boolean | null
}

export interface DiscoverLeaguesResult {
  leagues: DiscoveryCard[]
  total: number
  page: number
  limit: number
  totalPages: number
}
