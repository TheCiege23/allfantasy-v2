/**
 * Rolling Insights player maps for server routes.
 * Tries REST DataFeeds (`rest.datafeeds.rolling-insights.com`) with RSC_token,
 * then falls back to existing GraphQL `fetchNFLRoster` for NFL when configured.
 */

import { unstable_cache } from 'next/cache'

export type RiPlayerValue = {
  name: string
  headshot_url: string | null
  position: string
  team: string
}

export type RiPlayerMap = Record<string, RiPlayerValue>

const REST_BASE =
  process.env.ROLLING_INSIGHTS_REST_BASE?.trim().replace(/\/+$/, '') ||
  'https://rest.datafeeds.rolling-insights.com'

function getRiToken(): string {
  return (
    process.env.ROLLING_INSIGHTS_RSC_TOKEN?.trim() ||
    process.env.ROLLING_INSIGHTS_API_KEY?.trim() ||
    ''
  )
}

function normalizeSportParam(sport: string): string {
  const u = sport.toUpperCase()
  const map: Record<string, string> = {
    NFL: 'NFL',
    NBA: 'NBA',
    MLB: 'MLB',
    NHL: 'NHL',
    NCAAFB: 'NCAAFB',
    NCAABB: 'NCAABB',
    PGA: 'PGA',
  }
  return map[u] || u
}

function parseRiRestPayload(data: unknown): RiPlayerMap {
  const out: RiPlayerMap = {}
  if (!data || typeof data !== 'object') return out

  const rows: unknown[] = Array.isArray(data)
    ? data
    : 'players' in (data as object) && Array.isArray((data as { players: unknown }).players)
      ? (data as { players: unknown[] }).players
      : Object.values(data as Record<string, unknown>)

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const p = raw as Record<string, unknown>
    const id = String(p.id ?? p.player_id ?? p.PlayerID ?? p.ri_id ?? '').trim()
    if (!id) continue
    const fullName =
      typeof p.full_name === 'string'
        ? p.full_name
        : typeof p.player === 'string'
          ? p.player
          : typeof p.name === 'string'
            ? p.name
            : [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
    const headshot =
      (typeof p.headshot_url === 'string' && p.headshot_url) ||
      (typeof p.HeadshotUrl === 'string' && p.HeadshotUrl) ||
      (typeof p.image === 'string' && p.image) ||
      (typeof p.img === 'string' && p.img) ||
      (typeof p.photo === 'string' && p.photo) ||
      null
    const position = typeof p.position === 'string' ? p.position : String(p.pos ?? '')
    const team =
      typeof p.team === 'string'
        ? p.team
        : p.team && typeof p.team === 'object' && !Array.isArray(p.team)
          ? String((p.team as { abbrv?: string; abbreviation?: string }).abbrv ?? '')
          : ''

    out[id] = {
      name: fullName || id,
      headshot_url: headshot,
      position,
      team: team || 'FA',
    }
  }

  return out
}

async function fetchFromRest(sport: string): Promise<RiPlayerMap> {
  const token = getRiToken()
  if (!token) return {}

  const sp = normalizeSportParam(sport)
  const url = `${REST_BASE}/api/v1/players/${encodeURIComponent(sp)}?RSC_token=${encodeURIComponent(token)}`

  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return {}
    const data: unknown = await res.json()
    return parseRiRestPayload(data)
  } catch {
    return {}
  }
}

async function fetchNflFromGraphql(): Promise<RiPlayerMap> {
  try {
    const { fetchNFLRoster } = await import('@/lib/rolling-insights')
    const roster = await fetchNFLRoster({ limit: 12000 })
    const out: RiPlayerMap = {}
    for (const p of roster) {
      const teamAbbr = p.team?.abbrv ?? ''
      out[p.id] = {
        name: p.player,
        headshot_url: p.img ?? null,
        position: p.position ?? '',
        team: teamAbbr || 'FA',
      }
    }
    return out
  } catch {
    return {}
  }
}

/** Uncached fetch — used by POST sync and cache miss. */
export async function fetchRiPlayersUncached(sport: string): Promise<RiPlayerMap> {
  const rest = await fetchFromRest(sport)
  if (Object.keys(rest).length > 0) return rest

  const u = sport.toUpperCase()
  if (u === 'NFL') {
    const gql = await fetchNflFromGraphql()
    if (Object.keys(gql).length > 0) return gql
  }

  return {}
}

export const getCachedRiPlayerMap = unstable_cache(
  async (sport: string) => fetchRiPlayersUncached(sport),
  ['ri-players-map'],
  { revalidate: 86400, tags: ['ri-players'] },
)
