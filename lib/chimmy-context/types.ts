/**
 * Phase 2A — Universal Chimmy Context Engine
 * ------------------------------------------
 * Shared interfaces for every context provider feeding Chimmy.
 *
 * Design contract:
 *  - Every provider MUST return `ProviderResult<T>` and MUST NOT throw.
 *  - Bundle fields are nullable; a single failed provider must not break the AI flow.
 *  - Bundle contents are server-only and MAY contain non-PII profile data.
 *    Never serialize raw emails, payment-method tokens, or Stripe customer IDs.
 *  - DB-first: providers read from Postgres/Supabase. No external API fetches.
 */

import type { AIAccessStatus } from "@/lib/ai-access/AIAccessResolver"
import type {
  LeagueDifficultyRating,
  RankingSnapshot,
} from "@/lib/ranking/types"

/** Generic envelope returned by every provider. */
export type ProviderResult<T> = {
  ok: boolean
  data: T | null
  /** Short, human-readable error (never raw stack). */
  error?: string
  /** ISO timestamp when this slice was produced (post-cache). */
  fetchedAt: string
  /** True when satisfied from in-process cache. */
  cached?: boolean
  /** Approximate ms to fetch (post-cache reads ~0). */
  durationMs?: number
}

/** Inputs every provider receives. Providers ignore fields they don't need. */
export type ChimmyContextRequest = {
  /** Authenticated viewer; MUST come from server session, never request body. */
  userId: string
  /** Optional: email for AIAccessResolver trial start lookup. */
  userEmail?: string | null
  /** Optional active league context. Guarded by `assertLeagueMember` upstream. */
  leagueId?: string | null
  /** Optional active matchup week. */
  week?: number | null
  /** Optional active season. */
  season?: number | null
  /** Optional sport hint (NFL, NBA, etc.). */
  sport?: string | null
  /** When true, bypass per-request cache reads (writes still occur). */
  forceRefresh?: boolean
  /** Internal: per-request memoization map shared across providers. */
  perRequestMemo?: Map<string, unknown>
}

/** Base provider interface. */
export interface ChimmyContextProvider<T> {
  /** Unique stable id used for cache keys + debug logs. */
  readonly name: string
  /** Default per-provider TTL in ms; engine may override. */
  readonly defaultTtlMs: number
  /** Fetch a slice; MUST resolve, never reject. */
  load(request: ChimmyContextRequest): Promise<ProviderResult<T>>
}

// ─── Slice shapes ─────────────────────────────────────────────────────────────

export type UserContextSlice = {
  userId: string
  displayName: string
  username: string | null
  timezone: string | null
  preferredLanguage: string | null
  createdAt: string | null
}

export type SubscriptionContextSlice = {
  hasAccess: boolean
  reason: AIAccessStatus["reason"]
  hasSubscription: boolean
  planLabel: string | null
  inTrial: boolean
  trialDaysRemaining: number
  trialEndsAt: string | null
  tokenBalance: number
  message: string
}

export type LeagueSummary = {
  id: string
  name: string | null
  platform: string
  sport: string | null
  season: number | null
  format: string | null
  scoring: string | null
  numTeams: number | null
  isCommissioner: boolean
  role: "commissioner" | "member" | "imported"
}

export type LeagueContextSlice = {
  activeLeague: LeagueSummary | null
  allLeagues: LeagueSummary[]
  sleeperUsername: string | null
}

export type MatchupContextSlice = {
  leagueId: string
  week: number | null
  yourTeamId: string | null
  opponentTeamId: string | null
  yourProjectedPoints: number | null
  opponentProjectedPoints: number | null
  status: "scheduled" | "in_progress" | "final" | "unknown"
}

export type RosterPlayerLite = {
  playerId: string
  name: string
  position: string | null
  team: string | null
  slot: string | null
}

export type RosterContextSlice = {
  leagueId: string
  teamId: string | null
  starters: RosterPlayerLite[]
  bench: RosterPlayerLite[]
}

export type StandingsRow = {
  teamId: string
  teamName: string | null
  rank: number | null
  wins: number | null
  losses: number | null
  ties: number | null
  pointsFor: number | null
  pointsAgainst: number | null
}

export type StandingsContextSlice = {
  leagueId: string
  rows: StandingsRow[]
}

export type RankingContextSlice = {
  snapshot: RankingSnapshot | null
}

export type LeagueDifficultyContextSlice = {
  rating: LeagueDifficultyRating | null
}

export type ImportedHistorySlice = {
  source: "sleeper" | "espn" | "yahoo" | "fantrax" | "mfl" | "fleaflicker" | "unknown" | null
  totalLeagues: number
  totalSeasons: number
  careerRecord: string | null
  winPercentage: number | null
  championships: number
  archetype: string | null
  recentLeagues: Array<{
    name: string
    season: number
    record: string | null
    champion: boolean
  }>
}

/**
 * Reserved hook for future vector-store memory retrieval.
 * Phase 2A: always empty array. Phase 3+: top-K retrieved summaries.
 */
export type MemoryRef = {
  type: "matchup" | "trade" | "draft" | "season_summary" | "user_note"
  id: string
  summary: string
}

/** Final aggregated bundle handed to consumers (chat route, debug endpoints). */
export type ChimmyContextBundle = {
  user: UserContextSlice | null
  aiAccess: SubscriptionContextSlice | null
  activeLeague: LeagueSummary | null
  leagues: LeagueSummary[]
  matchup: MatchupContextSlice | null
  roster: RosterContextSlice | null
  standings: StandingsContextSlice | null
  rankings: RankingContextSlice | null
  leagueDifficulty: LeagueDifficultyContextSlice | null
  importedHistory: ImportedHistorySlice | null
  /** Future memory retrieval hook (vector store). Phase 2A: []. */
  memoryRefs: MemoryRef[]
  /** Provenance: which providers ran, succeeded, failed, were cached. */
  meta: {
    builtAt: string
    durationMs: number
    providers: Array<{
      name: string
      ok: boolean
      cached: boolean
      durationMs: number
      error?: string
    }>
  }
}

/** Free-form recommendation context — reserved for Phase 2B. */
export type RecommendationsContextSlice = {
  hints: string[]
}
