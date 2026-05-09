/**
 * World Cup live score provider abstraction (orthogonal to WorldCupDataProvider teams/fixtures).
 *
 * Capability matrix entries are maintained alongside docs/world-cup-live-score-providers.md.
 */

import type { WorldCupMatchStatus } from "../types"

/** Canonical IDs used in registry + env WORLD_CUP_LIVE_PROVIDER_CHAIN */
export type WorldCupLiveProviderId =
  | "api_sports"
  | "thesportsdb"
  | "reality_sports"
  | "clear_sports"
  | "manual"

/** Unified shape consumed by UI sync — all adapters normalize toward this. */
export type NormalizedWorldCupLiveMatch = {
  /** Internal bracket row id when pre-resolved (optional) */
  matchId?: string | null
  providerMatchId: string
  homeTeamName: string
  awayTeamName: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  status: WorldCupMatchStatus
  minute: number | null
  period: string | null
  startsAt: string | null
  /** Provider-side winner team id (opaque string, usually numeric id as string) */
  winnerTeamId: string | null
  winnerTeamName: string | null
  penaltyHomeScore: number | null
  penaltyAwayScore: number | null
  /** Raw short code from provider (FT, PEN, 2H, HT, …) */
  apiStatusShort: string | null
  /** Injury time minute (+N), when provider supplies it */
  injuryTime?: number | null
  homeTeamLogo?: string | null
  awayTeamLogo?: string | null
  raw?: unknown
}

export type WorldCupLiveProviderCapability = {
  id: WorldCupLiveProviderId
  /** Short note — see markdown doc for citations */
  fifaWorldCupFixtureSupport: "strong" | "partial" | "unknown" | "none"
  worldCup2026Readiness: "strong" | "partial" | "unknown" | "none"
  teamIdsAndMapping: "strong" | "partial" | "unknown"
  flagsLogos: boolean
  kickoffDateTime: boolean
  liveScore: boolean
  liveMinute: boolean
  statusGranularity: "full" | "partial"
  finalWinner: boolean
  penaltyShootout: boolean
  /** Typical request budget — verify with vendor */
  rateLimitHint: string
  pricingHint: string
  reliabilityHint: string
  requiredEnvVars: string[]
}

/**
 * Research-backed defaults (Jan 2026). Validate against vendor docs before production SLAs.
 */
export const WORLD_CUP_LIVE_PROVIDER_CAPABILITY_MATRIX: WorldCupLiveProviderCapability[] = [
  {
    id: "api_sports",
    fifaWorldCupFixtureSupport: "strong",
    worldCup2026Readiness: "strong",
    teamIdsAndMapping: "strong",
    flagsLogos: true,
    kickoffDateTime: true,
    liveScore: true,
    liveMinute: true,
    statusGranularity: "full",
    finalWinner: true,
    penaltyShootout: true,
    rateLimitHint: "Free tier ~100 requests/day (plan-dependent); paid tiers scale into 75k+/day.",
    pricingHint: "Free + Pro/Ultra/Mega (api-football.com / api-sports.io)",
    reliabilityHint: "Industry default for soccer; league id must match FIFA WC competition.",
    requiredEnvVars: ["API_SPORTS_KEY or API_FOOTBALL_KEY", "Optional: API_FOOTBALL_WORLD_CUP_LEAGUE_ID"],
  },
  {
    id: "thesportsdb",
    fifaWorldCupFixtureSupport: "partial",
    worldCup2026Readiness: "partial",
    teamIdsAndMapping: "partial",
    flagsLogos: true,
    kickoffDateTime: true,
    liveScore: true,
    liveMinute: true,
    statusGranularity: "partial",
    finalWinner: true,
    penaltyShootout: false,
    rateLimitHint: "~30 requests/min free tier (per IP); paid tiers higher.",
    pricingHint: "Free tier + paid developer tiers (thesportsdb.com)",
    reliabilityHint: "Good for badges/events; live latency/features tier-gated — confirm WC league id.",
    requiredEnvVars: ["THESPORTSDB_API_KEY", "Optional: THESPORTSDB_WORLD_CUP_LEAGUE_ID"],
  },
  {
    id: "reality_sports",
    fifaWorldCupFixtureSupport: "unknown",
    worldCup2026Readiness: "unknown",
    teamIdsAndMapping: "unknown",
    flagsLogos: false,
    kickoffDateTime: false,
    liveScore: false,
    liveMinute: false,
    statusGranularity: "partial",
    finalWinner: false,
    penaltyShootout: false,
    rateLimitHint: "Configure via REALITY_SPORTS_* — no public canonical doc in-repo.",
    pricingHint: "Enterprise / customfeed — confirm contract.",
    reliabilityHint: "Placeholder adapter: wire when endpoint + auth are confirmed.",
    requiredEnvVars: ["REALITY_SPORTS_API_KEY (optional)", "REALITY_SPORTS_BASE_URL (optional)"],
  },
  {
    id: "clear_sports",
    fifaWorldCupFixtureSupport: "unknown",
    worldCup2026Readiness: "unknown",
    teamIdsAndMapping: "unknown",
    flagsLogos: false,
    kickoffDateTime: false,
    liveScore: false,
    liveMinute: false,
    statusGranularity: "partial",
    finalWinner: false,
    penaltyShootout: false,
    rateLimitHint: "Per clearsportsapi.com account tier.",
    pricingHint: "Freemium / subscription (verify docs)",
    reliabilityHint: "Placeholder until WC soccer endpoints are verified against account.",
    requiredEnvVars: ["CLEARSPORTS_API_KEY (optional)", "CLEARSPORTS_BASE_URL (optional)"],
  },
  {
    id: "manual",
    fifaWorldCupFixtureSupport: "strong",
    worldCup2026Readiness: "strong",
    teamIdsAndMapping: "strong",
    flagsLogos: true,
    kickoffDateTime: true,
    liveScore: true,
    liveMinute: true,
    statusGranularity: "full",
    finalWinner: true,
    penaltyShootout: true,
    rateLimitHint: "N/A (local JSON)",
    pricingHint: "N/A",
    reliabilityHint: "Final fallback for demos / DR — operator-maintained JSON.",
    requiredEnvVars: ["Optional: WORLD_CUP_MANUAL_LIVE_JSON path or inline WORLD_CUP_MANUAL_LIVE_JSON_BODY"],
  },
]

/** Recommended primary + fallback order (manual always available last). */
export const WORLD_CUP_LIVE_PROVIDER_DEFAULT_CHAIN: WorldCupLiveProviderId[] = [
  "api_sports",
  "thesportsdb",
  "reality_sports",
  "clear_sports",
  "manual",
]

export interface WorldCupLiveScoreAdapter {
  readonly id: WorldCupLiveProviderId
  /** Human-readable for logs */
  readonly label: string
  isConfigured(): boolean
  /** Returns normalized live snapshots for the tournament season year */
  fetchLiveMatches(seasonYear: number): Promise<NormalizedWorldCupLiveMatch[]>
}
