/**
 * PROMPT 153 — ClearSports data integration.
 * Client (rate limit, retry, timeout), types, normalization. Keys server-side only.
 */

import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { clearSportsFetch } from './client'
import type { ClearSportsSport, ClearSportsTeam, ClearSportsPlayer, ClearSportsGame } from './types'

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

function leagueCodeForSport(sport: ClearSportsSport): string {
  switch (sport) {
    case 'NFL':
      return 'nfl'
    case 'NBA':
      return 'nba'
    case 'MLB':
      return 'mlb'
    default:
      return (sport as string).toLowerCase()
  }
}

export async function fetchClearSportsTeams(sport: ClearSportsSport): Promise<ClearSportsTeam[]> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ teams?: unknown[] } | unknown[]>(`leagues/${league}/teams`)
  if (!json) return []

  const rows: unknown[] = Array.isArray((json as { teams?: unknown[] }).teams)
    ? (json as { teams: unknown[] }).teams
    : Array.isArray(json)
      ? (json as unknown[])
      : []
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
  if (!json) return []

  const rows: unknown[] = Array.isArray((json as { players?: unknown[] }).players)
    ? (json as { players: unknown[] }).players
    : Array.isArray(json)
      ? (json as unknown[])
      : []
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
  if (!json) return []

  const rows: unknown[] = Array.isArray((json as { games?: unknown[] }).games)
    ? (json as { games: unknown[] }).games
    : Array.isArray(json)
      ? (json as unknown[])
      : []
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
