import {
  type ApiChainSport,
  type ApiFetchParams,
  type ChainFetchResult,
  toApiChainSport,
} from '@/lib/workers/api-config'
import { getRollingInsightsConfigFromEnv } from '@/lib/provider-config'

const SPORT_PATH: Record<ApiChainSport, string> = {
  nfl: 'nfl',
  mlb: 'mlb',
  nhl: 'nhl',
  nba: 'nba',
  ncaab: 'ncaab',
  ncaaf: 'ncaaf',
  soccer_euro: 'soccer/euro',
}

const REST_SPORT_CODE: Record<ApiChainSport, string> = {
  nfl: 'NFL',
  mlb: 'MLB',
  nhl: 'NHL',
  nba: 'NBA',
  ncaab: 'NCAABB',
  ncaaf: 'NCAAFB',
  soccer_euro: 'SOCCER',
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
}

function pathSegmentForDataType(dataType: string): string {
  if (DATA_TYPE_PATH[dataType]) return DATA_TYPE_PATH[dataType]
  if (dataType === 'games' || dataType === 'live_game') return 'scores'
  if (dataType === 'player_headshots') return 'players'
  if (dataType === 'team_logos') return 'teams'
  if (dataType === 'rolling_insights') return 'feed'
  if (dataType === 'trending') return 'trending'
  return dataType
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

interface RollingInsightsAccessToken {
  value: string
  expiresAtMs: number
}

let cachedAccessToken: RollingInsightsAccessToken | null = null

async function getClientCredentialsAccessToken(baseUrl: string): Promise<string> {
  const directRscToken = process.env.ROLLING_INSIGHTS_RSC_TOKEN?.trim()
  if (directRscToken) {
    return directRscToken
  }

  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.value
  }

  const clientId = process.env.ROLLING_INSIGHTS_CLIENT_ID?.trim()
  const clientSecret = process.env.ROLLING_INSIGHTS_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error('Rolling Insights client credentials not configured')
  }

  const tokenRes = await fetch(`${baseUrl}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })

  if (!tokenRes.ok) {
    throw new Error(`Auth failed (${tokenRes.status})`)
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string
    token?: string
    rsc_token?: string
    RSC_token?: string
    expires_in?: number
  }
  const token = tokenJson.access_token ?? tokenJson.token ?? tokenJson.rsc_token ?? tokenJson.RSC_token
  if (!token) {
    throw new Error('Auth response missing access token')
  }

  const expiresInSec = Number(tokenJson.expires_in ?? 3600)
  cachedAccessToken = {
    value: token,
    expiresAtMs: Date.now() + Math.max(expiresInSec, 300) * 1000,
  }
  return token
}

/**
 * Primary Rolling Insights REST fetch for all 7 sports.
 * Always returns { data, fromCache: false, error? }.
 */
export async function rollingInsightsProvider(params: ApiFetchParams): Promise<ChainFetchResult> {
  const config = getRollingInsightsConfigFromEnv()
  if (!config) {
    console.error('[rolling-insights] credentials not configured')
    return { data: null, error: 'credentials not configured', fromCache: false }
  }

  const chainSport = toApiChainSport(params.sport as string)
  if (!chainSport) {
    return { data: null, error: 'Unsupported sport', fromCache: false }
  }

  const base = config.baseUrl
  const dataSeg = pathSegmentForDataType(String(params.dataType))
  const sportSeg = SPORT_PATH[chainSport]
  const url =
    config.authMode === 'client_credentials'
      ? new URL(
          `${process.env.ROLLING_INSIGHTS_REST_BASE_URL?.trim().replace(/\/+$/, '') ?? 'https://rest.datafeeds.rolling-insights.com/api/v1'}/${dataSeg}/${REST_SPORT_CODE[chainSport]}`
        )
      : new URL(`${base}/${sportSeg}/${dataSeg}`)
  const merged = { ...(params.query ?? {}), ...(params.options ?? {}) }
  Object.entries(merged).forEach(([k, v]) => {
    if (v == null) return
    url.searchParams.set(k, String(v))
  })

  const started = Date.now()
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (config.authMode === 'api_key') {
      headers['x-api-key'] = process.env.ROLLING_INSIGHTS_API_KEY ?? ''
    } else {
      const accessToken = await getClientCredentialsAccessToken(base)
      // Some RI REST surfaces require query token, others accept bearer auth.
      url.searchParams.set('RSC_token', accessToken)
      headers.Authorization = `Bearer ${accessToken}`
    }

    const res = await fetch(url.toString(), {
      headers,
      cache: 'no-store',
    })
    if (!res.ok) {
      const err = `HTTP ${res.status}`
      console.warn(`[rolling-insights] ${err} ${chainSport}/${params.dataType}`)
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
