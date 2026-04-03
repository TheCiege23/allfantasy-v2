/**
 * Rolling Insights DataFeeds
 * GraphQL → NFL, MLB (`players` query + `nflTeams` / `mlbTeams`)
 * REST   → NBA, NHL, SOCCER, PGA, NCAABB, NCAAFB (`/api/v1/player-info/{sport}`)
 */

import { unstable_cache } from 'next/cache'

// ── Legacy map shape (caching, enrichment) ──────────────────────────────────
export type RiPlayerValue = {
  name: string
  headshot_url: string | null
  position: string
  team: string
  espn_id?: string | null
}

export type RiPlayerMap = Record<string, RiPlayerValue>

const RI_REST_BASE = 'http://rest.datafeeds.rolling-insights.com'
const RI_GRAPHQL_URL = 'https://datafeeds.rolling-insights.com/graphql'
const RI_AUTH_URL = 'https://datafeeds.rolling-insights.com/auth/token'

// ─── Auth (cached per client id) ───────────────────────────────────────────

const tokenCache: Record<string, { token: string; expiresAt: number }> = {}

async function getRIBearerToken(clientId: string, clientSecret: string): Promise<string> {
  const cacheKey = clientId
  const cached = tokenCache[cacheKey]
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token

  const res = await fetch(RI_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`RI auth failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  const access = json.access_token
  if (!access) throw new Error('RI auth: missing access_token')
  const expiresIn = json.expires_in ?? 3600
  tokenCache[cacheKey] = { token: access, expiresAt: Date.now() + expiresIn * 1000 }
  return access
}

// ─── Shared player shape ───────────────────────────────────────────────────

export interface RIPlayer {
  ri_id: string
  full_name: string
  position: string
  team: string
  team_id: string | null
  sport: string
  /** Empty when no usable RI image — PlayerImage falls through to ESPN CDN */
  headshot_url: string
  espn_id: string | null
  status: string | null
  jersey_number: string | null
  height: string | null
  weight: number | null
  college: string | null
  bats: string | null // MLB only: "R" | "L" | "S"
  throws: string | null // MLB only: "R" | "L"
  all_star: boolean | null // MLB only
}

export type RITeam = {
  ri_id: string
  name: string
  abbr: string
  mascot: string
  logo_url: string
  sport: string
}

// ─── REST: player-info ─────────────────────────────────────────────────────

function mapRESTPlayer(raw: Record<string, unknown>, sport: string): RIPlayer {
  return {
    ri_id: String(raw.player_id ?? ''),
    full_name: String(raw.player ?? ''),
    position: String(raw.position ?? raw.position_category ?? ''),
    team: String(raw.team ?? ''),
    team_id: raw.team_id != null ? String(raw.team_id) : null,
    sport,
    headshot_url: '',
    espn_id: null,
    status: raw.status != null ? String(raw.status) : null,
    jersey_number: raw.number != null ? String(raw.number) : null,
    height: raw.height != null ? String(raw.height) : null,
    weight: typeof raw.weight === 'number' ? raw.weight : null,
    college: (raw.college as string) ?? null,
    bats: (raw.bats as string) ?? null,
    throws: (raw.throws as string) ?? null,
    all_star: raw.all_star != null ? Boolean(raw.all_star) : null,
  }
}

export async function fetchRIPlayersREST(sport: string): Promise<RIPlayer[]> {
  /** REST `RSC_token` is the DataFeeds RSC credential (set 2 secret), not the OAuth client id. */
  const rscToken = process.env.ROLLING_INSIGHTS_CLIENT_SECRET2?.trim()
  if (!rscToken) throw new Error('ROLLING_INSIGHTS_CLIENT_SECRET2 is not set (RSC token for REST)')
  const authToken: string = rscToken

  async function load(key: string): Promise<Record<string, unknown>[]> {
    const leagueParam = key === 'SOCCER' ? '&league=EPL' : ''
    const url = `${RI_REST_BASE}/api/v1/player-info/${key}?RSC_token=${encodeURIComponent(authToken)}${leagueParam}`
    console.log(`[RI REST] fetching player-info for ${key}${leagueParam ? ' (league=EPL)' : ''}`)

    const res = await fetch(url, {
      signal: AbortSignal.timeout(55_000),
      headers: { Accept: 'application/json' },
    })

    if (res.status === 304) {
      console.log(`[RI REST] ${key} — 304 Not Modified, no new data`)
      return []
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`[RI REST] ${key} HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    const json = (await res.json()) as { data?: Record<string, unknown[]> }
    // SOCCER responses are keyed as "EPL" in the data envelope, not "SOCCER"
    const dataKey = key === 'SOCCER' ? 'EPL' : key
    const raw = json?.data?.[dataKey] ?? []
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
  }

  const rows = await load(sport)
  const dataKey = sport === 'SOCCER' ? 'EPL' : sport

  console.log(`[RI REST] ${dataKey} — ${rows.length} players`)
  if (rows.length > 0) {
    console.log(`[RI REST] first player object ${dataKey}`, rows[0])
  }

  return rows.map((p) => mapRESTPlayer(p, dataKey))
}

// ─── GraphQL: NFL players only (MLB players use REST player-info) ───────────

const NFL_PLAYERS_QUERY = `
  query Players($sport: String!) {
    players(sport: $sport) {
      id
      firstName
      lastName
      position
      team
      teamId
      img
      espnId
      status
      jerseyNumber
    }
  }
`

function mapGraphQLPlayer(raw: Record<string, unknown>): RIPlayer {
  const fn = String(raw.firstName ?? '').trim()
  const ln = String(raw.lastName ?? '').trim()
  const fullName = [fn, ln].filter(Boolean).join(' ')

  const imgStr = String(raw.img ?? '')
  const isUUID = /^[0-9a-f-]{36}\./i.test(imgStr)
  const headshot_url = imgStr && !isUUID ? imgStr : ''

  return {
    ri_id: String(raw.id ?? ''),
    full_name: fullName,
    position: String(raw.position ?? ''),
    team: String(raw.team ?? ''),
    team_id: raw.teamId != null ? String(raw.teamId) : null,
    sport: 'NFL',
    headshot_url,
    espn_id: raw.espnId != null ? String(raw.espnId) : null,
    status: raw.status != null ? String(raw.status) : null,
    jersey_number: raw.jerseyNumber != null ? String(raw.jerseyNumber) : null,
    height: null,
    weight: null,
    college: null,
    bats: null,
    throws: null,
    all_star: null,
  }
}

/** NFL roster via GraphQL — MLB uses `fetchRIPlayersREST('MLB')`. */
export async function fetchRIPlayersGraphQL(): Promise<RIPlayer[]> {
  const clientId = process.env.ROLLING_INSIGHTS_CLIENT_ID
  const clientSecret = process.env.ROLLING_INSIGHTS_CLIENT_SECRET

  if (!clientId?.trim() || !clientSecret?.trim()) {
    throw new Error('Missing RI GraphQL credentials for NFL')
  }

  const token = await getRIBearerToken(clientId.trim(), clientSecret.trim())

  const res = await fetch(RI_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: NFL_PLAYERS_QUERY, variables: { sport: 'NFL' } }),
    signal: AbortSignal.timeout(55_000),
  })

  if (!res.ok) throw new Error(`[RI GraphQL] NFL HTTP ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`)

  const json = (await res.json()) as { data?: { players?: unknown[] }; errors?: unknown }
  if (json.errors) throw new Error(`[RI GraphQL] NFL errors: ${JSON.stringify(json.errors)}`)

  const raw = (json?.data?.players ?? []) as Record<string, unknown>[]
  console.log(`[RI GraphQL] NFL — ${raw.length} players`)

  return raw.map((p) => mapGraphQLPlayer(p)).filter((p) => p.ri_id && p.full_name)
}

// ─── GraphQL teams (NFL / MLB only — roster-style queries) ───────────────────

function graphqlTeamImgToUrl(img: unknown): string {
  const s = String(img ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return ''
}

async function fetchGraphQLTeamsNflMlb(sport: 'NFL' | 'MLB'): Promise<RITeam[]> {
  const query =
    sport === 'NFL'
      ? `{ nflTeams { id team abbrv mascot img } }`
      : `{ mlbTeams { id team abbrv mascot img } }`

  const isMLB = sport === 'MLB'
  const clientId = isMLB ? process.env.ROLLING_INSIGHTS_CLIENT_ID2 : process.env.ROLLING_INSIGHTS_CLIENT_ID
  const clientSecret = isMLB
    ? process.env.ROLLING_INSIGHTS_CLIENT_SECRET2
    : process.env.ROLLING_INSIGHTS_CLIENT_SECRET

  if (!clientId?.trim() || !clientSecret?.trim()) return []

  const token = await getRIBearerToken(clientId.trim(), clientSecret.trim())
  const res = await fetch(RI_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(55_000),
  })
  if (!res.ok) return []

  const json = (await res.json()) as { data?: Record<string, unknown[]>; errors?: unknown }
  if (json.errors) {
    console.warn('RI GraphQL teams errors:', json.errors)
    return []
  }

  const key = sport === 'NFL' ? 'nflTeams' : 'mlbTeams'
  const rows = (json.data?.[key] as unknown[]) ?? []

  return rows
    .map((r: unknown) => {
      const t = r as Record<string, unknown>
      return {
        ri_id: String(t.id ?? ''),
        name: String(t.team ?? ''),
        abbr: String(t.abbrv ?? ''),
        mascot: String(t.mascot ?? ''),
        logo_url: graphqlTeamImgToUrl(t.img),
        sport,
      }
    })
    .filter((t) => t.ri_id)
}

// ─── REST teams ──────────────────────────────────────────────────────────────

function extractRestArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x))
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    for (const key of ['teams', 'Teams', 'data', 'players']) {
      const v = d[key]
      if (Array.isArray(v)) {
        return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x))
      }
    }
  }
  return []
}

async function fetchRESTTeams(sport: string): Promise<RITeam[]> {
  const token = process.env.ROLLING_INSIGHTS_CLIENT_SECRET2?.trim()
  if (!token) return []

  const leagueParam = sport === 'SOCCER' ? '&league=EPL' : ''
  const url = `${RI_REST_BASE}/api/v1/teams/${sport}?RSC_token=${encodeURIComponent(token)}${leagueParam}`
  const res = await fetch(url, { signal: AbortSignal.timeout(55_000), headers: { Accept: 'application/json' } })
  if (res.status === 304) return []
  if (!res.ok) return []

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return []
  }
  const rows = extractRestArray(data)

  return rows
    .map((t) => {
      const id = String(t.id ?? t.team_id ?? '')
      if (!id) return null
      return {
        ri_id: id,
        name: String(t.team ?? t.name ?? ''),
        abbr: String(t.abbrv ?? t.abbr ?? t.code ?? ''),
        mascot: String(t.mascot ?? ''),
        logo_url: typeof t.img === 'string' && /^https?:\/\//i.test(t.img) ? t.img : '',
        sport,
      } as RITeam
    })
    .filter((t): t is RITeam => t !== null)
}

// ─── Public API ─────────────────────────────────────────────────────────────

const REST_SPORTS = new Set(['NBA', 'NHL', 'MLB', 'SOCCER', 'PGA', 'NCAABB', 'NCAAFB'])

export async function fetchRIPlayers(sport: string): Promise<RIPlayer[]> {
  const s = sport.toUpperCase()
  if (s === 'NFL') return fetchRIPlayersGraphQL()
  if (REST_SPORTS.has(s)) return fetchRIPlayersREST(s)
  throw new Error(`Unknown RI sport: ${sport}`)
}

export async function fetchRITeams(sport: string): Promise<RITeam[]> {
  const s = sport.toUpperCase()
  if (s === 'NFL' || s === 'MLB') return fetchGraphQLTeamsNflMlb(s as 'NFL' | 'MLB')
  if (REST_SPORTS.has(s)) return fetchRESTTeams(s)
  return []
}

export async function buildRIPlayerMap(sport: string): Promise<Record<string, RIPlayer>> {
  const players = await fetchRIPlayers(sport)
  return Object.fromEntries(players.map((p) => [p.ri_id, p]))
}

function riPlayersToLegacyMap(players: RIPlayer[]): RiPlayerMap {
  const out: RiPlayerMap = {}
  for (const p of players) {
    out[p.ri_id] = {
      name: p.full_name,
      headshot_url: p.headshot_url || null,
      position: p.position,
      team: p.team || 'FA',
      espn_id: p.espn_id ?? null,
    }
  }
  return out
}

export async function fetchRiPlayersUncached(sport: string): Promise<RiPlayerMap> {
  const players = await fetchRIPlayers(sport)
  return riPlayersToLegacyMap(players)
}

type CachedFn = () => Promise<RIPlayer[]>

const riPlayersCacheBySport = new Map<string, CachedFn>()

function getCachedRIPlayersFn(sport: string): CachedFn {
  const key = sport.toUpperCase()
  let fn = riPlayersCacheBySport.get(key)
  if (!fn) {
    const tag = `ri-players-${key.toLowerCase()}`
    fn = unstable_cache(
      async () => fetchRIPlayers(key),
      ['ri-players-v3', key],
      { revalidate: 86400, tags: [tag] }
    )
    riPlayersCacheBySport.set(key, fn)
  }
  return fn
}

export async function getCachedRIPlayersList(sport: string): Promise<RIPlayer[]> {
  return getCachedRIPlayersFn(sport)()
}

export const getCachedRiPlayerMap = async (sport: string): Promise<RiPlayerMap> => {
  const players = await getCachedRIPlayersList(sport)
  return riPlayersToLegacyMap(players)
}
