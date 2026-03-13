import { normalizeTeamAbbrev } from './team-abbrev'

export type ClearSportsSport = 'NFL' | 'NBA' | 'MLB'

const CLEAR_DEFAULT_TIMEOUT_MS = 15000

interface ClearSportsApiConfig {
  baseUrl: string
  apiKey: string
}

function getConfig(): ClearSportsApiConfig | null {
  const baseUrl = (process.env.CLEAR_SPORTS_API_BASE || '').trim().replace(/\/+$/, '')
  const apiKey = (process.env.CLEAR_SPORTS_API_KEY || '').trim()
  if (!baseUrl || !apiKey) return null
  return { baseUrl, apiKey }
}

async function clearSportsFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  timeoutMs: number = CLEAR_DEFAULT_TIMEOUT_MS,
): Promise<T | null> {
  const cfg = getConfig()
  if (!cfg) return null

  const url = new URL(`${cfg.baseUrl}/${path.replace(/^\/+/, '')}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      console.warn('[ClearSports] Request failed:', res.status, res.statusText)
      return null
    }
    const json = await res.json().catch(() => null)
    return json as T
  } catch (err) {
    clearTimeout(timeout)
    console.warn('[ClearSports] Request error:', err)
    return null
  }
}

export interface ClearSportsTeam {
  id: string
  name: string
  shortName?: string | null
  city?: string | null
  mascot?: string | null
  logo?: string | null
}

export interface ClearSportsPlayer {
  id: string
  name: string
  position?: string | null
  teamId?: string | null
  teamAbbrev?: string | null
  number?: number | null
  height?: string | null
  weight?: number | null
  college?: string | null
  dob?: string | null
  status?: string | null
  imageUrl?: string | null
}

export interface ClearSportsGame {
  id: string
  homeTeamId: string
  homeTeamAbbrev?: string | null
  awayTeamId: string
  awayTeamAbbrev?: string | null
  date?: string | null
  status?: string | null
  season?: string | null
  venue?: string | null
}

function leagueCodeForSport(sport: ClearSportsSport): string {
  switch (sport) {
    case 'NFL':
      return 'nfl'
    case 'NBA':
      return 'nba'
    case 'MLB':
      return 'mlb'
    default:
      return sport.toLowerCase()
  }
}

export async function fetchClearSportsTeams(
  sport: ClearSportsSport,
): Promise<ClearSportsTeam[]> {
  const league = leagueCodeForSport(sport)
  // NOTE: Endpoint path is a best-guess and may need adjustment per deployment.
  const json = await clearSportsFetch<any>(`leagues/${league}/teams`).catch(() => null)
  if (!json) return []

  const rows: any[] = Array.isArray(json?.teams) ? json.teams : Array.isArray(json) ? json : []
  return rows.map((t: any): ClearSportsTeam => ({
    id: String(t.id ?? t.teamId ?? t.slug ?? ''),
    name: String(t.name ?? t.fullName ?? t.displayName ?? 'Unknown'),
    shortName: t.abbrev ?? t.shortName ?? null,
    city: t.city ?? null,
    mascot: t.mascot ?? null,
    logo: t.logoUrl ?? t.logo ?? null,
  })).filter(t => t.id && t.name)
}

export async function fetchClearSportsPlayers(
  sport: ClearSportsSport,
  search: string,
): Promise<ClearSportsPlayer[]> {
  if (!search.trim()) return []
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<any>(
    `leagues/${league}/players`,
    { q: search.trim() },
  ).catch(() => null)
  if (!json) return []

  const rows: any[] = Array.isArray(json?.players) ? json.players : Array.isArray(json) ? json : []
  return rows.map((p: any): ClearSportsPlayer => ({
    id: String(p.id ?? p.playerId ?? p.slug ?? ''),
    name: String(p.name ?? p.fullName ?? p.displayName ?? 'Unknown'),
    position: p.position ?? p.pos ?? null,
    teamId: p.teamId ? String(p.teamId) : null,
    teamAbbrev: normalizeTeamAbbrev(p.teamAbbrev || p.team || null),
    number: typeof p.number === 'number' ? p.number : (p.jerseyNumber ?? null),
    height: p.height ?? null,
    weight: typeof p.weight === 'number' ? p.weight : null,
    college: p.college ?? null,
    dob: p.dob ?? p.birthDate ?? null,
    status: p.status ?? null,
    imageUrl: p.imageUrl ?? p.headshot ?? null,
  })).filter(p => p.id && p.name)
}

export async function fetchClearSportsGames(
  sport: ClearSportsSport,
  season?: string,
): Promise<ClearSportsGame[]> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<any>(
    `leagues/${league}/games`,
    season ? { season } : undefined,
  ).catch(() => null)
  if (!json) return []

  const rows: any[] = Array.isArray(json?.games) ? json.games : Array.isArray(json) ? json : []
  return rows.map((g: any): ClearSportsGame => ({
    id: String(g.id ?? g.gameId ?? ''),
    homeTeamId: String(g.homeTeamId ?? g.home?.id ?? ''),
    homeTeamAbbrev: normalizeTeamAbbrev(g.homeTeamAbbrev || g.home?.abbrv || g.home?.code || null),
    awayTeamId: String(g.awayTeamId ?? g.away?.id ?? ''),
    awayTeamAbbrev: normalizeTeamAbbrev(g.awayTeamAbbrev || g.away?.abbrv || g.away?.code || null),
    date: g.date ?? g.startTime ?? null,
    status: g.status ?? null,
    season: g.season ? String(g.season) : season ?? null,
    venue: g.venue?.name ?? g.venue ?? null,
  })).filter(g => g.id && g.homeTeamId && g.awayTeamId)
}

