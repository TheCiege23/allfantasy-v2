import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import {
  fetchNFLRoster,
  fetchNFLSchedule,
  fetchNFLTeams,
  fetchNFLTeamsFull,
  getCurrentNFLSeason,
  searchNFLPlayer,
} from '@/lib/rolling-insights'
import type { ApiFetchParams, ApiProvider } from '@/lib/workers/api-config'

function toSeason(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return getCurrentNFLSeason()
}

function toSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function namesEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase()
}

export const rollingInsightsProvider: ApiProvider = {
  name: 'rolling_insights',
  supports: ({ sport, dataType }: ApiFetchParams) =>
    sport === 'NFL' &&
    [
      'teams',
      'players',
      'games',
      'schedule',
      'injuries',
      'player_headshots',
      'team_logos',
    ].includes(dataType),
  async fetch({ dataType, query = {} }: ApiFetchParams) {
    const season = toSeason(query.season)
    const search = toSearch(query.search ?? query.playerName)
    const teamCode = normalizeTeamAbbrev(String(query.teamCode ?? query.team ?? ''))
    const teamName = typeof query.teamName === 'string' ? query.teamName.trim() : ''

    switch (dataType) {
      case 'teams': {
        const teams = await fetchNFLTeams()
        return teams.map((team) => ({
          id: team.id,
          name: team.team,
          shortName: team.abbrv,
          city: team.team.replace(` ${team.mascot}`, ''),
          logo: team.img ?? null,
          source: 'rolling_insights',
        }))
      }
      case 'players': {
        const players = search
          ? await searchNFLPlayer(search)
          : await fetchNFLRoster({ season })
        return players.map((player) => ({
          id: player.id,
          name: player.player,
          position: player.position,
          team: normalizeTeamAbbrev(player.team?.abbrv) ?? null,
          teamId: player.team?.id ?? null,
          number: player.number ?? null,
          height: player.height ?? null,
          weight: player.weight ?? null,
          college: player.college ?? null,
          dob: player.dob ?? null,
          status: player.status ?? null,
          imageUrl: player.img ?? null,
          source: 'rolling_insights',
        }))
      }
      case 'games':
      case 'schedule': {
        const games = await fetchNFLSchedule({ season })
        return games.map((game) => ({
          id: game.gameId,
          homeTeam: normalizeTeamAbbrev(game.homeTeam) ?? game.homeTeam,
          awayTeam: normalizeTeamAbbrev(game.awayTeam) ?? game.awayTeam,
          date: game.date,
          status: game.status,
          season: game.season,
          venue: game.venue?.arena ?? null,
          source: 'rolling_insights',
        }))
      }
      case 'injuries': {
        const teams = await fetchNFLTeamsFull({
          season,
          teamName: teamName || teamCode || undefined,
        })
        return teams.flatMap((team) =>
          (team.injuries ?? [])
            .filter((injury) => Boolean(injury.player))
            .map((injury, index) => ({
              externalId: injury.playerId ?? `${team.abbrv}:${injury.player}:${injury.date ?? index}`,
              playerId: injury.playerId ?? null,
              playerName: injury.player ?? 'Unknown Player',
              team: normalizeTeamAbbrev(team.abbrv) ?? team.abbrv,
              status: injury.injury ?? 'injured',
              bodyPart: injury.injury ?? null,
              notes: injury.returns ?? null,
              reportDate: injury.date ?? null,
              source: 'rolling_insights',
            }))
        )
      }
      case 'player_headshots': {
        if (!search) return null
        const players = await searchNFLPlayer(search)
        const matched = players.find((player) => {
          const sameName = namesEqual(player.player, search)
          const sameTeam = !teamCode || normalizeTeamAbbrev(player.team?.abbrv) === teamCode
          return sameName && sameTeam
        }) ?? players[0]
        if (!matched?.img) return null
        return {
          playerId: matched.id,
          playerName: matched.player,
          teamCode: normalizeTeamAbbrev(matched.team?.abbrv) ?? null,
          headshotUrl: matched.img,
          headshotUrlSm: matched.img,
          headshotUrlLg: matched.img,
          headshotSource: 'rolling_insights',
        }
      }
      case 'team_logos': {
        const teams = await fetchNFLTeams()
        const matched = teams.find((team) => {
          const normalizedShort = normalizeTeamAbbrev(team.abbrv)
          return (
            (!!teamCode && normalizedShort === teamCode) ||
            (!!teamName && namesEqual(team.team, teamName))
          )
        }) ?? teams.find((team) => normalizeTeamAbbrev(team.abbrv) === teamCode)
        if (!matched?.img) return null
        return {
          teamCode: normalizeTeamAbbrev(matched.abbrv) ?? matched.abbrv,
          teamName: matched.team,
          logoUrl: matched.img,
          logoUrlSm: matched.img,
          logoUrlLg: matched.img,
          logoSource: 'rolling_insights',
        }
      }
      default:
        return null
    }
  },
}
