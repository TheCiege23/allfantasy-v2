import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

/** Rolling Insights REST + cache chain — canonical lowercase keys (7 sports). */
export const SUPPORTED_SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'nascar', 'pga', 'mls'] as const

export type ApiChainSport = (typeof SUPPORTED_SPORTS)[number]

export type ApiProviderName =
  | 'rolling_insights'
  | 'clearsports'
  | 'api_sports'
  | 'thesportsdb'
  | 'cfbd'

/** Cache TTLs in seconds — drives all cache expiry (DB-first). */
export const API_CHAIN_TTLS = {
  scores: 60,
  live_game: 30,
  injuries: 900,
  news: 300,
  trending: 600,
  players: 86400,
  teams: 86400,
  schedule: 3600,
  standings: 1800,
  projections: 3600,
  rankings: 3600,
  player_headshots: 604800,
  team_logos: 604800,
  roster: 3600,
  rolling_insights: 1800,
  adp: 21600,
  /** Alias for live / game lists (same as scores). */
  games: 60,
  /** Stats / misc. */
  stats: 3600,
  depth_charts: 3600,
  team_stats: 3600,
} as const

export type ApiDataType = keyof typeof API_CHAIN_TTLS

export interface ApiFetchParams {
  sport: ApiChainSport | SupportedSport | string
  dataType: ApiDataType
  query?: Record<string, unknown>
  /** Alias for query (e.g. from route JSON). Merged into query. */
  options?: Record<string, unknown>
  forceRefresh?: boolean
}

export interface ApiProvider {
  name: ApiProviderName
  supports: (params: ApiFetchParams) => boolean
  fetch: (params: ApiFetchParams) => Promise<unknown | null>
}

/** Legacy ApiChain result shape (used by workers). */
export interface ApiResult<T = unknown> {
  data: T | null
  source: ApiProviderName | 'cache'
  latency: number
  cached?: boolean
  attemptedSources?: ApiProviderName[]
  error?: string
}

/** Result from fetchWithChain (DB-first). */
export interface ChainFetchResult<T = unknown> {
  data: T | null
  error?: string
  fromCache: boolean
  cacheAge?: number
  source?: ApiProviderName | 'cache'
  latency?: number
}

export function isSupportedApiChainSport(value: string): value is ApiChainSport {
  return (SUPPORTED_SPORTS as readonly string[]).includes(value.toLowerCase())
}

export function toApiChainSport(input: string | SupportedSport | undefined): ApiChainSport | null {
  if (!input) return null
  const raw = String(input).trim()
  const lower = raw.toLowerCase()

  if (isSupportedApiChainSport(lower)) return lower as ApiChainSport

  const map: Record<string, ApiChainSport> = {
    nfl: 'nfl',
    nba: 'nba',
    mlb: 'mlb',
    nhl: 'nhl',
    nascar: 'nascar',
    pga: 'pga',
    mls: 'mls',
    soccer: 'mls',
    soccer_euro: 'mls',
    euro: 'mls',
    ncaab: 'nba',
    ncaaf: 'nfl',
  }
  if (map[lower]) return map[lower]

  try {
    const normalized = normalizeToSupportedSport(raw)
    return legacySupportedSportToApiChain(normalized)
  } catch {
    return null
  }
}

/** Map product SupportedSport → API chain sport. */
export function legacySupportedSportToApiChain(sport: SupportedSport): ApiChainSport {
  const m: Record<SupportedSport, ApiChainSport> = {
    NFL: 'nfl',
    NBA: 'nba',
    MLB: 'mlb',
    NHL: 'nhl',
    NCAAB: 'nba',
    NCAAF: 'nfl',
    SOCCER: 'mls',
  }
  return m[sport]
}

/** Store in DB normalized tables using uppercase sport labels. */
export function apiChainSportToDbSport(sport: ApiChainSport): string {
  const m: Record<ApiChainSport, string> = {
    nfl: 'NFL',
    nba: 'NBA',
    mlb: 'MLB',
    nhl: 'NHL',
    nascar: 'NASCAR',
    pga: 'PGA',
    mls: 'MLS',
  }
  return m[sport]
}

/**
 * Rolling Insights is enabled for every supported chain sport (all 7).
 * Resolves aliases (e.g. SOCCER → mls) then checks membership in SUPPORTED_SPORTS.
 */
export function isRollingInsightsEnabledForSport(sport: string | SupportedSport | ApiChainSport): boolean {
  const chain =
    typeof sport === 'string' ? toApiChainSport(sport) : legacySupportedSportToApiChain(sport as SupportedSport)
  if (chain == null) return false
  return (SUPPORTED_SPORTS as readonly string[]).includes(chain)
}

export function isImageDataType(dataType: ApiDataType): boolean {
  return dataType === 'player_headshots' || dataType === 'team_logos'
}

export function normalizeApiSport(sport: string | SupportedSport | undefined): SupportedSport {
  return normalizeToSupportedSport(sport)
}

/**
 * Legacy flags for lib/provider-config.ts and lib/rolling-insights.ts (all enabled).
 */
export const ROLLING_INSIGHTS_SPORTS = {
  NFL: true,
  NBA: true,
  MLB: true,
  NHL: true,
  NCAAF: true,
  NCAAB: true,
  SOCCER: true,
  Soccer: true,
} as const

export function ttlSecondsForDataType(dataType: ApiDataType): number {
  return API_CHAIN_TTLS[dataType] ?? 900
}
