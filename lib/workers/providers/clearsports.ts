import {
  fetchClearSportsGames,
  fetchClearSportsNews,
  fetchClearSportsProjections,
  fetchClearSportsRankings,
  fetchClearSportsTeams,
  type ClearSportsSport,
} from '@/lib/clear-sports'
import { clearSportsFetch } from '@/lib/clear-sports/client'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import type { ApiFetchParams, ApiProvider } from '@/lib/workers/api-config'

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

function toSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function namesEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase()
}

async function fetchAllPlayers(
  sport: ClearSportsSport,
  search?: string
): Promise<Array<Record<string, unknown>>> {
  const league = leagueCodeForSport(sport)
  const json = await clearSportsFetch<{ players?: unknown[] } | unknown[]>(
    `leagues/${league}/players`,
    search ? { q: search } : undefined
  )
  return rowsFrom<Record<string, unknown>>(json, 'players').filter((row) => !!row && typeof row === 'object')
}

export const clearSportsProvider: ApiProvider = {
  name: 'clearsports',
  supports: ({ sport, dataType }: ApiFetchParams) =>
    [
      'teams',
      'players',
      'games',
      'schedule',
      'news',
      'rankings',
      'projections',
      'player_headshots',
      'team_logos',
    ].includes(dataType) && Boolean(sport),
  async fetch({ sport, dataType, query = {} }: ApiFetchParams) {
    const clearSport = sport as ClearSportsSport
    const season = typeof query.season === 'string' ? query.season : undefined
    const search = toSearch(query.search ?? query.playerName)
    const teamCode = normalizeTeamAbbrev(String(query.teamCode ?? query.team ?? ''))
    const teamName = typeof query.teamName === 'string' ? query.teamName.trim() : ''

    switch (dataType) {
      case 'teams': {
        const teams = await fetchClearSportsTeams(clearSport)
        return teams.map((team) => ({
          id: team.id,
          name: team.name,
          shortName: normalizeTeamAbbrev(team.shortName) ?? team.shortName,
          city: team.city ?? null,
          mascot: team.mascot ?? null,
          logo: team.logo ?? null,
          source: 'clearsports',
        }))
      }
      case 'players': {
        const players = await fetchAllPlayers(clearSport, search || undefined)
        return players.map((player) => ({
          id: String(player.id ?? player.playerId ?? player.slug ?? ''),
          name: String(player.name ?? player.fullName ?? player.displayName ?? 'Unknown'),
          position: String(player.position ?? player.pos ?? '').trim() || null,
          team: normalizeTeamAbbrev(String(player.teamAbbrev ?? player.team ?? '')) ?? null,
          teamId: player.teamId ? String(player.teamId) : null,
          number: typeof player.number === 'number' ? player.number : Number(player.jerseyNumber ?? NaN) || null,
          height: String(player.height ?? '').trim() || null,
          weight: Number(player.weight ?? NaN) || null,
          college: String(player.college ?? '').trim() || null,
          dob: String(player.dob ?? player.birthDate ?? '').trim() || null,
          status: String(player.status ?? '').trim() || null,
          imageUrl: String(player.imageUrl ?? player.headshot ?? '').trim() || null,
          source: 'clearsports',
        })).filter((player) => player.id && player.name)
      }
      case 'games':
      case 'schedule': {
        const games = await fetchClearSportsGames(clearSport, season)
        return games.map((game) => ({
          id: game.id,
          homeTeam: game.homeTeamAbbrev ?? null,
          awayTeam: game.awayTeamAbbrev ?? null,
          homeTeamId: game.homeTeamId || null,
          awayTeamId: game.awayTeamId || null,
          date: game.date,
          status: game.status,
          season: game.season,
          venue: game.venue ?? null,
          source: 'clearsports',
        }))
      }
      case 'news':
        return fetchClearSportsNews(clearSport, Number(query.limit ?? 40) || 40)
      case 'rankings':
        return fetchClearSportsRankings(clearSport, season)
      case 'projections':
        return fetchClearSportsProjections(clearSport, season)
      case 'player_headshots': {
        if (!search) return null
        const players = await fetchAllPlayers(clearSport, search)
        const matched = players.find((player) => {
          const name = String(player.name ?? player.fullName ?? player.displayName ?? '')
          const sameName = namesEqual(name, search)
          const sameTeam =
            !teamCode ||
            normalizeTeamAbbrev(String(player.teamAbbrev ?? player.team ?? '')) === teamCode
          return sameName && sameTeam
        }) ?? players[0]
        const imageUrl = String(matched?.imageUrl ?? matched?.headshot ?? '').trim()
        if (!imageUrl) return null
        return {
          playerId: String(matched?.id ?? matched?.playerId ?? ''),
          playerName: String(matched?.name ?? matched?.fullName ?? matched?.displayName ?? search),
          teamCode: normalizeTeamAbbrev(String(matched?.teamAbbrev ?? matched?.team ?? '')) ?? null,
          headshotUrl: imageUrl,
          headshotUrlSm: imageUrl,
          headshotUrlLg: imageUrl,
          headshotSource: 'clearsports',
        }
      }
      case 'team_logos': {
        const teams = await fetchClearSportsTeams(clearSport)
        const matched = teams.find((team) => {
          const shortName = normalizeTeamAbbrev(team.shortName)
          return (
            (!!teamCode && shortName === teamCode) ||
            (!!teamName && namesEqual(team.name, teamName))
          )
        }) ?? teams.find((team) => normalizeTeamAbbrev(team.shortName) === teamCode)
        if (!matched?.logo) return null
        return {
          teamCode: normalizeTeamAbbrev(matched.shortName) ?? matched.shortName ?? teamCode,
          teamName: matched.name,
          logoUrl: matched.logo,
          logoUrlSm: matched.logo,
          logoUrlLg: matched.logo,
          logoSource: 'clearsports',
        }
      }
      default:
        return null
    }
  },
}
