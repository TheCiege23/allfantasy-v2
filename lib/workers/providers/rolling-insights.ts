import {
  type ApiChainSport,
  type ApiFetchParams,
  type ChainFetchResult,
  toApiChainSport,
} from '@/lib/workers/api-config'
import { getRollingInsightsConfigFromEnv } from '@/lib/provider-config'

const DEFAULT_RI_GRAPHQL_URL = 'https://datafeeds.rolling-insights.com/graphql'
const DEFAULT_RI_REST_BASES = [
  'https://rest.datafeeds.rolling-insights.com/api/v1',
  'http://rest.datafeeds.rolling-insights.com/api/v1',
] as const
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
const RI_REQUEST_TIMEOUT_MS = 20_000

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function splitEnvList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => normalizeBaseUrl(v))
    .filter(Boolean)
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

function buildRestBaseCandidates(configBase: string): string[] {
  const explicit = splitEnvList(process.env.ROLLING_INSIGHTS_REST_BASE_URL)
  const normalizedConfig = normalizeBaseUrl(configBase)
  const derivedFromConfig = [normalizedConfig, `${normalizedConfig}/api/v1`]

  return dedupe([...explicit, ...derivedFromConfig, ...DEFAULT_RI_REST_BASES])
}

function buildRestPathCandidates(dataSeg: string, chainSport: ApiChainSport): string[] {
  const sportCode = REST_SPORT_CODE[chainSport]
  const sportLower = SPORT_PATH[chainSport]

  return dedupe([`${dataSeg}/${sportCode}`, `${sportCode}/${dataSeg}`, `${dataSeg}/${sportLower}`])
}

interface RiGraphqlPlayer {
  id?: string | number
  player?: string
  position?: string
  status?: string
  team?: { abbrv?: string | null } | null
  regularSeason?: Array<{
    DK_fantasy_points?: number | null
    DK_fantasy_points_per_game?: number | null
    games_played?: number | null
  }> | null
}

async function fetchNflPlayersFromGraphql(accessToken: string, configBase: string): Promise<unknown[] | null> {
  const explicitGraphqlUrl = process.env.ROLLING_INSIGHTS_GRAPHQL_URL?.trim()
  const urls = dedupe(
    [explicitGraphqlUrl, `${normalizeBaseUrl(configBase)}/graphql`, DEFAULT_RI_GRAPHQL_URL].filter(
      Boolean
    ) as string[]
  )

  const query = `
    {
      nflRoster {
        id
        player
        position
        status
        team { abbrv }
        regularSeason {
          DK_fantasy_points
          DK_fantasy_points_per_game
          games_played
        }
      }
    }
  `

  for (const gqlUrl of urls) {
    try {
      const res = await fetch(gqlUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query }),
        cache: 'no-store',
        signal: AbortSignal.timeout(RI_REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) continue
      const json = (await res.json()) as {
        data?: { nflRoster?: RiGraphqlPlayer[] }
        errors?: Array<{ message?: string }>
      }
      if (json.errors?.length) continue

      const players = json.data?.nflRoster ?? []
      return players.map((p) => {
        const season = Array.isArray(p.regularSeason) ? p.regularSeason[0] : null
        return {
          id: p.id,
          full_name: p.player,
          position: p.position,
          team_abbr: p.team?.abbrv ?? null,
          status: p.status,
          season_stats: {
            fantasy_points: season?.DK_fantasy_points ?? null,
            fantasy_points_per_game: season?.DK_fantasy_points_per_game ?? null,
            games_played: season?.games_played ?? null,
          },
        }
      })
    } catch {
      // try next GraphQL host
    }
  }

  return null
}

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
    signal: AbortSignal.timeout(RI_REQUEST_TIMEOUT_MS),
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
  const merged = { ...(params.query ?? {}), ...(params.options ?? {}) }

  const started = Date.now()
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (config.authMode === 'api_key') {
      const sportSeg = SPORT_PATH[chainSport]
      const url = new URL(`${base}/${sportSeg}/${dataSeg}`)
      Object.entries(merged).forEach(([k, v]) => {
        if (v == null) return
        url.searchParams.set(k, String(v))
      })

      headers['x-api-key'] = process.env.ROLLING_INSIGHTS_API_KEY ?? ''
      const res = await fetch(url.toString(), {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(RI_REQUEST_TIMEOUT_MS),
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
    }

    const accessToken = await getClientCredentialsAccessToken(base)
    headers.Authorization = `Bearer ${accessToken}`

    const restBases = buildRestBaseCandidates(base)
    const restPaths = buildRestPathCandidates(dataSeg, chainSport)
    let lastHttpError: string | null = null

    for (const restBase of restBases) {
      for (const restPath of restPaths) {
        const url = new URL(`${restBase}/${restPath}`)
        Object.entries(merged).forEach(([k, v]) => {
          if (v == null) return
          url.searchParams.set(k, String(v))
        })
        url.searchParams.set('RSC_token', accessToken)

        try {
          const res = await fetch(url.toString(), {
            headers,
            cache: 'no-store',
            signal: AbortSignal.timeout(RI_REQUEST_TIMEOUT_MS),
          })
          if (!res.ok) {
            lastHttpError = `HTTP ${res.status}`
            continue
          }

          const json = await res.json()
          const data = extractPayload(json)
          return {
            data: data as ChainFetchResult['data'],
            fromCache: false,
            source: 'rolling_insights',
            latency: Date.now() - started,
          }
        } catch {
          // Continue probing other REST host/path candidates.
        }
      }
    }

    if (chainSport === 'nfl' && dataSeg === 'players') {
      const gqlPlayers = await fetchNflPlayersFromGraphql(accessToken, base)
      if (Array.isArray(gqlPlayers) && gqlPlayers.length > 0) {
        return {
          data: gqlPlayers as ChainFetchResult['data'],
          fromCache: false,
          source: 'rolling_insights',
          latency: Date.now() - started,
        }
      }
    }

    const err = lastHttpError ?? 'No successful Rolling Insights REST/GraphQL response'
    console.warn(`[rolling-insights] ${err} ${chainSport}/${params.dataType}`)
    return { data: null, error: err, fromCache: false }
  } catch (e) {
    console.warn(`[rolling-insights] fetch failed ${chainSport}/${params.dataType}:`, e)
    return { data: null, error: e instanceof Error ? e.message : 'Request failed', fromCache: false }
  }
}

/** @deprecated Use rollingInsightsProvider — kept for incremental migration. */
export async function rollingInsightsProviderFetch(params: ApiFetchParams): Promise<ChainFetchResult> {
  return rollingInsightsProvider(params)
}
