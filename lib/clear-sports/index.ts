/**
 * PROMPT 153 — ClearSports data integration.
 * Client (rate limit, retry, timeout), types, normalization. Keys server-side only.
 */

import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { clearSportsFetch } from './client'
import type { ClearSportsSport, ClearSportsTeam, ClearSportsPlayer, ClearSportsGame } from './types'
export { runClearSportsHealthCheck, type ClearSportsHealthCheckResult } from './client'

export type { ClearSportsSport, ClearSportsTeam, ClearSportsPlayer, ClearSportsGame } from './types'
export {
  normalizeClearSportsTeams,
  normalizeClearSportsPlayers,
  normalizeClearSportsGames,
  type NormalizedTeam,
  type NormalizedPlayer,
  type NormalizedGame,
  type SupportedClearSportsSport,
} from './normalize'
export {
  getClearSportsToolStates,
  type ClearSportsToolState,
  type ClearSportsToolStateMap,
  type ClearSportsConsumerTool,
} from './tool-support'

function leagueCodeForSport(sport: ClearSportsSport): string {
  switch (sport) {
    case 'NFL':
      return 'nfl'
    case 'NHL':
      return 'nhl'
    case 'NBA':
      return 'nba'
    case 'MLB':
      return 'mlb'
    case 'NCAAB':
      return 'ncaab'
    case 'NCAAF':
      return 'ncaaf'
    case 'SOCCER':
      return 'soccer'
    default:
      return (sport as string).toLowerCase()
  }
}

function rowsFrom<T = unknown>(json: unknown, key: string): T[] {
  if (!json) return []
  if (Array.isArray((json as Record<string, unknown>)[key])) {
    return (json as Record<string, unknown>)[key] as T[]
  }
  return Array.isArray(json) ? (json as T[]) : []
}

export async function fetchClearSportsTeams(sport: ClearSportsSport): Promise<ClearSportsTeam[]> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ teams?: unknown[] } | unknown[]>(`leagues/${league}/teams`)
  const rows = rowsFrom(json, 'teams')
  return rows.map((t: any): ClearSportsTeam => ({
    id: String(t.id ?? t.teamId ?? t.slug ?? ''),
    name: String(t.name ?? t.fullName ?? t.displayName ?? 'Unknown'),
    shortName: t.abbrev ?? t.shortName ?? null,
    city: t.city ?? null,
    mascot: t.mascot ?? null,
    logo: t.logoUrl ?? t.logo ?? null,
  })).filter((t) => t.id && t.name)
}

export async function fetchClearSportsPlayers(
  sport: ClearSportsSport,
  search: string,
): Promise<ClearSportsPlayer[]> {
  if (!search.trim()) return []
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ players?: unknown[] } | unknown[]>(
    `leagues/${league}/players`,
    { q: search.trim() },
  )
  const rows = rowsFrom(json, 'players')
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
  })).filter((p) => p.id && p.name)
}

export async function fetchClearSportsGames(
  sport: ClearSportsSport,
  season?: string,
): Promise<ClearSportsGame[]> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ games?: unknown[] } | unknown[]>(
    `leagues/${league}/games`,
    season ? { season } : undefined,
  )
  const rows = rowsFrom(json, 'games')
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
  })).filter((g) => g.id && g.homeTeamId && g.awayTeamId)
}

/** Optional rankings feed for ranking tools (if endpoint is available from provider). */
export async function fetchClearSportsRankings(
  sport: ClearSportsSport,
  season?: string,
): Promise<Array<Record<string, unknown>>> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ rankings?: unknown[] } | unknown[]>(
    `leagues/${league}/rankings`,
    season ? { season } : undefined,
  )
  return rowsFrom<Record<string, unknown>>(json, 'rankings').filter((r) => !!r && typeof r === 'object')
}

/** Optional projection feed for projection-aware tools (if endpoint is available from provider). */
export async function fetchClearSportsProjections(
  sport: ClearSportsSport,
  season?: string,
): Promise<Array<Record<string, unknown>>> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ projections?: unknown[] } | unknown[]>(
    `leagues/${league}/projections`,
    season ? { season } : undefined,
  )
  return rowsFrom<Record<string, unknown>>(json, 'projections').filter((r) => !!r && typeof r === 'object')
}

/** Optional trend feed for engagement/trend tooling (if endpoint is available from provider). */
export async function fetchClearSportsTrends(
  sport: ClearSportsSport,
): Promise<Array<Record<string, unknown>>> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ trends?: unknown[] } | unknown[]>(`leagues/${league}/trends`)
  return rowsFrom<Record<string, unknown>>(json, 'trends').filter((r) => !!r && typeof r === 'object')
}

/** Optional news feed for alerting/content tools (if endpoint is available from provider). */
export async function fetchClearSportsNews(
  sport: ClearSportsSport,
  limit: number = 20,
): Promise<Array<Record<string, unknown>>> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ news?: unknown[] } | unknown[]>(
    `leagues/${league}/news`,
    { limit: Math.max(1, Math.min(100, limit)) },
  )
  return rowsFrom<Record<string, unknown>>(json, 'news').filter((r) => !!r && typeof r === 'object')
}
