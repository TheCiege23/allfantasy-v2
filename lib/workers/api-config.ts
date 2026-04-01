import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

export type ApiChainSport = SupportedSport

export type ApiDataType =
  | 'teams'
  | 'players'
  | 'games'
  | 'schedule'
  | 'injuries'
  | 'news'
  | 'rankings'
  | 'projections'
  | 'player_headshots'
  | 'team_logos'

export type ApiProviderName =
  | 'rolling_insights'
  | 'clearsports'
  | 'api_sports'
  | 'thesportsdb'
  | 'cfbd'

export interface ApiFetchParams {
  sport: ApiChainSport
  dataType: ApiDataType
  query?: Record<string, unknown>
}

export interface ApiProvider {
  name: ApiProviderName
  supports: (params: ApiFetchParams) => boolean
  fetch: (params: ApiFetchParams) => Promise<unknown | null>
}

export interface ApiResult<T = unknown> {
  data: T | null
  source: ApiProviderName | 'cache'
  latency: number
  cached?: boolean
  attemptedSources?: ApiProviderName[]
}

function envFlag(name: string, fallback: boolean = false): boolean {
  const raw = process.env[name]
  if (raw == null || raw.trim() === '') return fallback
  return raw.trim().toLowerCase() === 'true'
}

const rollingInsightsSportFlags = {
  NFL: envFlag('RI_NFL_ENABLED', true),
  NBA: envFlag('RI_NBA_ENABLED', false),
  MLB: envFlag('RI_MLB_ENABLED', false),
  NHL: envFlag('RI_NHL_ENABLED', false),
  NCAAF: envFlag('RI_NCAAF_ENABLED', false),
  NCAAB: envFlag('RI_NCAAB_ENABLED', false),
  SOCCER: envFlag('RI_SOCCER_ENABLED', false),
} as const satisfies Record<SupportedSport, boolean>

// Alias `Soccer` for config readability while keeping `SOCCER` as the canonical sport key.
export const ROLLING_INSIGHTS_SPORTS = {
  ...rollingInsightsSportFlags,
  Soccer: rollingInsightsSportFlags.SOCCER,
}

export const API_CHAIN_TTLS: Record<ApiDataType, number> = {
  teams: 7 * 24 * 60 * 60 * 1000,
  players: 24 * 60 * 60 * 1000,
  games: 10 * 60 * 1000,
  schedule: 12 * 60 * 60 * 1000,
  injuries: 2 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
  rankings: 6 * 60 * 60 * 1000,
  projections: 6 * 60 * 60 * 1000,
  player_headshots: 30 * 24 * 60 * 60 * 1000,
  team_logos: 90 * 24 * 60 * 60 * 1000,
}

export function normalizeApiSport(sport: string | SupportedSport | undefined): SupportedSport {
  return normalizeToSupportedSport(sport)
}

export function isRollingInsightsEnabledForSport(sport: string | SupportedSport): boolean {
  const normalized = normalizeApiSport(sport)
  return rollingInsightsSportFlags[normalized]
}

export function isImageDataType(dataType: ApiDataType): boolean {
  return dataType === 'player_headshots' || dataType === 'team_logos'
}
