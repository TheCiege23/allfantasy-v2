import type {
  FleaflickerImportPayload,
  FleaflickerSport,
  FleaflickerStandingsResponse,
  FleaflickerRostersResponse,
} from '@/lib/league-import/fleaflicker/types'

const API_BASE = 'https://www.fleaflicker.com/api'

export class FleaflickerImportLeagueNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FleaflickerImportLeagueNotFoundError'
  }
}

const SPORT_SET = new Set<string>(['NFL', 'MLB', 'NBA', 'NHL'])

/**
 * `sourceId` forms:
 * - `206154` — defaults to NFL, current calendar year as season
 * - `NFL:206154` — explicit sport + league id
 * - `NFL:206154:2024` — explicit season year
 */
export function parseFleaflickerSourceId(sourceId: string): {
  sport: FleaflickerSport
  leagueId: number
  season: number
} {
  const raw = sourceId.trim()
  const parts = raw.split(':').map((p) => p.trim()).filter(Boolean)
  let sport: FleaflickerSport = 'NFL'
  let leagueIdNum: number
  let season = new Date().getFullYear()

  if (parts.length >= 2 && SPORT_SET.has(parts[0]!.toUpperCase())) {
    sport = parts[0]!.toUpperCase() as FleaflickerSport
    leagueIdNum = Number(parts[1])
    if (parts[2]) season = Math.max(2000, Math.min(2100, Number(parts[2]) || season))
  } else {
    leagueIdNum = Number(raw.replace(/[^\d]/g, '') || raw)
  }

  if (!Number.isFinite(leagueIdNum) || leagueIdNum <= 0) {
    throw new FleaflickerImportLeagueNotFoundError('Invalid Fleaflicker league id.')
  }

  return { sport, leagueId: leagueIdNum, season }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (res.status === 404) {
    throw new FleaflickerImportLeagueNotFoundError('Fleaflicker league not found (404).')
  }
  if (!res.ok) {
    throw new FleaflickerImportLeagueNotFoundError(`Fleaflicker API error (${res.status}).`)
  }
  return res.json() as Promise<T>
}

/**
 * Public JSON API — no user OAuth required.
 */
export async function fetchFleaflickerLeagueForImport(sourceId: string): Promise<FleaflickerImportPayload> {
  const { sport, leagueId, season } = parseFleaflickerSourceId(sourceId)

  const standingsUrl = `${API_BASE}/FetchLeagueStandings?sport=${encodeURIComponent(sport)}&league_id=${leagueId}&season=${season}`
  const rostersUrl = `${API_BASE}/FetchLeagueRosters?sport=${encodeURIComponent(sport)}&league_id=${leagueId}&season=${season}`

  const [standings, rosters] = await Promise.all([
    fetchJson<FleaflickerStandingsResponse>(standingsUrl),
    fetchJson<FleaflickerRostersResponse>(rostersUrl).catch(() => ({ rosters: [] })),
  ])

  if (!standings?.league?.id) {
    throw new FleaflickerImportLeagueNotFoundError('Fleaflicker response missing league object.')
  }

  return {
    sport,
    season: standings.season ?? season,
    standings,
    rosters,
  }
}
