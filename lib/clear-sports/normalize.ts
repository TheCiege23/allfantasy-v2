/**
 * PROMPT 153 — Sport-aware normalization of ClearSports API responses to internal models.
 * Used by sports-router. Supports NFL, NBA, MLB (ClearSports-supported); other sports fall back elsewhere.
 */

import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import type { ClearSportsTeam, ClearSportsPlayer, ClearSportsGame } from './types'

export type SupportedClearSportsSport = 'NFL' | 'NBA' | 'MLB'

/** Internal normalized team (matches sports-router NormalizedTeam). */
export interface NormalizedTeam {
  id: string
  name: string
  shortName: string
  mascot?: string
  city?: string
  logo?: string | null
  source: string
}

/** Internal normalized player (matches sports-router NormalizedPlayer). */
export interface NormalizedPlayer {
  id: string
  name: string
  position: string | null
  team: string | null
  teamId: string | null
  number: number | null
  height: string | null
  weight: number | null
  college: string | null
  dob: string | null
  status: string | null
  img: string | null
  fantasyPoints: number | null
  seasonStats: unknown[]
  source: string
}

/** Internal normalized game (matches sports-router NormalizedGame). */
export interface NormalizedGame {
  id: string
  homeTeam: string
  awayTeam: string
  date: string | null
  status: string | null
  season: string | null
  venue: string | null
  source: string
}

const SOURCE_LABEL = 'clear_sports'

/** Sport-aware position normalization (e.g. future: map API position codes per sport). */
function normalizePosition(position: string | null | undefined, _sport: SupportedClearSportsSport): string | null {
  if (position == null || typeof position !== 'string') return null
  return position.trim() || null
}

export function normalizeClearSportsTeams(teams: ClearSportsTeam[], _sport: SupportedClearSportsSport): NormalizedTeam[] {
  return teams.map((t): NormalizedTeam => ({
    id: t.id,
    name: t.name,
    shortName: normalizeTeamAbbrev(t.shortName || t.name) || t.name,
    mascot: t.mascot || undefined,
    city: t.city || undefined,
    logo: t.logo || null,
    source: SOURCE_LABEL,
  }))
}

export function normalizeClearSportsPlayers(
  players: ClearSportsPlayer[],
  sport: SupportedClearSportsSport,
): NormalizedPlayer[] {
  return players.map((p): NormalizedPlayer => ({
    id: p.id,
    name: p.name,
    position: normalizePosition(p.position, sport),
    team: p.teamAbbrev ? normalizeTeamAbbrev(p.teamAbbrev) || p.teamAbbrev : null,
    teamId: p.teamId ?? null,
    number: p.number ?? null,
    height: p.height ?? null,
    weight: p.weight ?? null,
    college: p.college ?? null,
    dob: p.dob ?? null,
    status: p.status ?? null,
    img: p.imageUrl ?? null,
    fantasyPoints: null,
    seasonStats: [],
    source: SOURCE_LABEL,
  }))
}

export function normalizeClearSportsGames(
  games: ClearSportsGame[],
  _sport: SupportedClearSportsSport,
  season?: string,
): NormalizedGame[] {
  return games.map((g): NormalizedGame => ({
    id: g.id,
    homeTeam: g.homeTeamAbbrev
      ? normalizeTeamAbbrev(g.homeTeamAbbrev) || g.homeTeamAbbrev
      : g.homeTeamId,
    awayTeam: g.awayTeamAbbrev
      ? normalizeTeamAbbrev(g.awayTeamAbbrev) || g.awayTeamAbbrev
      : g.awayTeamId,
    date: g.date ?? null,
    status: g.status ?? null,
    season: g.season ?? season ?? null,
    venue: g.venue ?? null,
    source: SOURCE_LABEL,
  }))
}
