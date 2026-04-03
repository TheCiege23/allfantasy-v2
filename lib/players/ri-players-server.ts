/**
 * Rolling Insights DataFeeds — GraphQL + OAuth client_credentials only.
 * REST endpoints under rest.datafeeds.rolling-insights.com are not used.
 */

import { unstable_cache } from 'next/cache'

// ── Legacy map shape (consumers: Player enrichment, /api/players/sync) ─────
export type RiPlayerValue = {
  name: string
  headshot_url: string | null
  position: string
  team: string
  /** ESPN player id when present in RI payloads */
  espn_id?: string | null
}

export type RiPlayerMap = Record<string, RiPlayerValue>

// ── Token cache — one per credential set ───────────────────────────────────
const tokenCache: Record<string, { token: string; expiresAt: number }> = {}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const cacheKey = clientId
  const cached = tokenCache[cacheKey]
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token

  const res = await fetch('https://datafeeds.rolling-insights.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`RI auth failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  const token = data.access_token
  if (!token) throw new Error('RI auth: missing access_token')
  const expiresIn = data.expires_in ?? 3600
  tokenCache[cacheKey] = { token, expiresAt: Date.now() + expiresIn * 1000 }
  return token
}

async function riQuery(query: string, clientId: string, clientSecret: string): Promise<unknown> {
  const token = await getAccessToken(clientId, clientSecret)
  const res = await fetch('https://datafeeds.rolling-insights.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`RI GraphQL failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { data?: unknown; errors?: unknown }
  if (json.errors) console.warn('RI GraphQL errors:', json.errors)
  return json.data
}

function getCredentials(sport: string): { clientId: string; clientSecret: string } {
  const set2Sports = ['NBA', 'MLB', 'NHL', 'SOCCER', 'NCAABB', 'NCAAFB']
  if (set2Sports.includes(sport.toUpperCase())) {
    return {
      clientId: process.env.ROLLING_INSIGHTS_CLIENT_ID2 ?? '',
      clientSecret: process.env.ROLLING_INSIGHTS_CLIENT_SECRET2 ?? '',
    }
  }
  return {
    clientId: process.env.ROLLING_INSIGHTS_CLIENT_ID ?? '',
    clientSecret: process.env.ROLLING_INSIGHTS_CLIENT_SECRET ?? '',
  }
}

const SPORT_QUERY_MAP: Record<string, { roster: string; teams: string }> = {
  NFL: { roster: 'nflRoster', teams: 'nflTeams' },
  NBA: { roster: 'nbaRoster', teams: 'nbaTeams' },
  MLB: { roster: 'mlbRoster', teams: 'mlbTeams' },
  NHL: { roster: 'nhlRoster', teams: 'nhlTeams' },
  SOCCER: { roster: 'soccerRoster', teams: 'soccerTeams' },
  NCAABB: { roster: 'ncaabbRoster', teams: 'ncaabbTeams' },
  NCAAFB: { roster: 'ncaafbRoster', teams: 'ncaafbTeams' },
}

function getCurrentSeason(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

export type RIPlayer = {
  ri_id: string
  name: string
  position: string
  team_abbr: string
  team_name: string
  team_img: string
  headshot_url: string
  sport: string
}

export type RITeam = {
  ri_id: string
  name: string
  abbr: string
  mascot: string
  logo_url: string
  sport: string
}

export async function fetchRIPlayers(sport: string): Promise<RIPlayer[]> {
  const s = sport.toUpperCase()
  const queryMap = SPORT_QUERY_MAP[s]
  if (!queryMap) throw new Error(`Unsupported RI sport: ${sport}`)

  const { clientId, clientSecret } = getCredentials(s)
  if (!clientId || !clientSecret) {
    console.warn(`RI: no credentials for ${s}`)
    return []
  }

  const season = getCurrentSeason()
  const query = `{
    ${queryMap.roster}(season: "${season}") {
      id
      player
      position
      img
      status
      team {
        id
        team
        abbrv
        mascot
        img
      }
    }
  }`

  try {
    const data = (await riQuery(query, clientId, clientSecret)) as Record<string, unknown>
    const rows = (data?.[queryMap.roster] as unknown[]) ?? []

    return rows
      .map((r: unknown) => {
        const p = r as Record<string, unknown>
        const team = (p.team ?? {}) as Record<string, unknown>
        return {
          ri_id: String(p.id ?? ''),
          name: String(p.player ?? ''),
          position: String(p.position ?? ''),
          team_abbr: String(team.abbrv ?? ''),
          team_name: String(team.team ?? ''),
          team_img: String(team.img ?? ''),
          headshot_url: String(p.img ?? ''),
          sport: s,
        }
      })
      .filter((p) => p.ri_id && p.name)
  } catch (err) {
    console.error(`RI fetchRIPlayers(${s}) failed:`, err)
    return []
  }
}

export async function fetchRITeams(sport: string): Promise<RITeam[]> {
  const s = sport.toUpperCase()
  const queryMap = SPORT_QUERY_MAP[s]
  if (!queryMap) return []

  const { clientId, clientSecret } = getCredentials(s)
  if (!clientId || !clientSecret) return []

  const query = `{
    ${queryMap.teams} {
      id
      team
      abbrv
      mascot
      img
    }
  }`

  try {
    const data = (await riQuery(query, clientId, clientSecret)) as Record<string, unknown>
    const rows = (data?.[queryMap.teams] as unknown[]) ?? []

    return rows
      .map((r: unknown) => {
        const t = r as Record<string, unknown>
        return {
          ri_id: String(t.id ?? ''),
          name: String(t.team ?? ''),
          abbr: String(t.abbrv ?? ''),
          mascot: String(t.mascot ?? ''),
          logo_url: String(t.img ?? ''),
          sport: s,
        }
      })
      .filter((t) => t.ri_id)
  } catch (err) {
    console.error(`RI fetchRITeams(${s}) failed:`, err)
    return []
  }
}

export async function buildRIPlayerMap(sport: string): Promise<Record<string, RIPlayer>> {
  const players = await fetchRIPlayers(sport)
  return Object.fromEntries(players.map((p) => [p.ri_id, p]))
}

function riPlayersToLegacyMap(players: RIPlayer[]): RiPlayerMap {
  const out: RiPlayerMap = {}
  for (const p of players) {
    out[p.ri_id] = {
      name: p.name,
      headshot_url: p.headshot_url || null,
      position: p.position,
      team: p.team_abbr || 'FA',
    }
  }
  return out
}

/** Uncached legacy map — used by sync route + cache bust. */
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
      ['ri-players-graphql', key],
      { revalidate: 86400, tags: [tag] }
    )
    riPlayersCacheBySport.set(key, fn)
  }
  return fn
}

/** Cached RI players (24h) — per-sport revalidateTag(`ri-players-${sport}`). */
export async function getCachedRIPlayersList(sport: string): Promise<RIPlayer[]> {
  return getCachedRIPlayersFn(sport)()
}

export const getCachedRiPlayerMap = async (sport: string): Promise<RiPlayerMap> => {
  const players = await getCachedRIPlayersList(sport)
  return riPlayersToLegacyMap(players)
}
