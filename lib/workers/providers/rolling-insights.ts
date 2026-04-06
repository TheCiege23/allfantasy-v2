import {
  type ApiChainSport,
  type ApiDataType,
  type ApiFetchParams,
  type ChainFetchResult,
  toApiChainSport,
} from '@/lib/workers/api-config'

const SPORT_PATH: Record<ApiChainSport, string> = {
  nfl: 'nfl',
  nba: 'nba',
  mlb: 'mlb',
  nhl: 'nhl',
  nascar: 'nascar',
  pga: 'pga',
  mls: process.env.ROLLING_INSIGHTS_SOCCER_PATH?.trim() || 'mls',
}

const DATA_TYPE_PATH: Record<string, string> = {
  players: 'players',
  teams: 'teams',
  injuries: 'injuries',
  news: 'news',
  scores: 'scores',
  schedule: 'schedule',
  standings: 'standings',
  projections: 'projections',
  rankings: 'rankings',
  adp: 'adp',
  roster: 'rosters',
  games: 'scores',
  live_game: 'scores',
  player_headshots: 'players',
  team_logos: 'teams',
  trending: 'trending',
  rolling_insights: 'feed',
}

function pathForDataType(dataType: ApiDataType): string {
  return DATA_TYPE_PATH[dataType] ?? dataType
}

function extractPayload(json: unknown): unknown {
  if (json == null) return null
  if (Array.isArray(json)) return json
  if (typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (Array.isArray(o.data)) return o.data
    if (Array.isArray(o.results)) return o.results
    if (Array.isArray(o.items)) return o.items
  }
  return json
}

/**
 * Primary Rolling Insights REST fetch for all 7 sports.
 * Always returns { data, fromCache: false, error? }.
 */
export async function rollingInsightsProvider(params: ApiFetchParams): Promise<ChainFetchResult> {
  const apiKey = process.env.ROLLING_INSIGHTS_API_KEY?.trim()
  if (!apiKey) {
    console.error('[rolling-insights] ROLLING_INSIGHTS_API_KEY not set')
    return { data: null, error: 'API key not configured', fromCache: false }
  }

  const chainSport = toApiChainSport(params.sport as string)
  if (!chainSport) {
    return { data: null, error: 'Unsupported sport', fromCache: false }
  }

  const base =
    process.env.ROLLING_INSIGHTS_BASE_URL?.trim().replace(/\/+$/, '') ??
    process.env.ROLLING_INSIGHTS_REST_BASE?.trim().replace(/\/+$/, '') ??
    'https://api.rollinginsights.com/v1'

  const pathSeg = pathForDataType(params.dataType)
  const url = new URL(`${base}/${SPORT_PATH[chainSport]}/${pathSeg}`)
  const merged = { ...(params.query ?? {}), ...(params.options ?? {}) }
  Object.entries(merged).forEach(([k, v]) => {
    if (v == null) return
    url.searchParams.set(k, String(v))
  })

  const started = Date.now()
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      const err = `HTTP ${res.status}`
      console.warn(`[rolling-insights] ${err} ${url.toString()}`)
      return { data: null, error: err, fromCache: false }
    }
    const json = await res.json()
    const data = extractPayload(json)
    return {
      data: data as ChainFetchResult['data'],
      fromCache: false,
      source: 'rolling_insights',
      latency: Date.now() - started,
    }
  } catch (e) {
    console.warn(`[rolling-insights] fetch failed ${chainSport}/${params.dataType}:`, e)
    return { data: null, error: e instanceof Error ? e.message : 'Request failed', fromCache: false }
  }
}

/** @deprecated Use rollingInsightsProvider — kept for incremental migration. */
export async function rollingInsightsProviderFetch(params: ApiFetchParams): Promise<ChainFetchResult> {
  return rollingInsightsProvider(params)
}
