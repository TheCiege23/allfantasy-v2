import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import type { ApiFetchParams, ApiProvider } from '@/lib/workers/api-config'

const THESPORTSDB_LEAGUE_IDS = {
  NFL: '4391',
  NHL: '4380',
  NBA: '4387',
  MLB: '4424',
  NCAAB: process.env.THESPORTSDB_NCAAM_LEAGUE_ID || '4607',
  NCAAF: process.env.THESPORTSDB_NCAAF_LEAGUE_ID || '',
  SOCCER: process.env.THESPORTSDB_SOCCER_LEAGUE_ID || '',
} as const

function apiKey(): string {
  return process.env.THESPORTSDB_API_KEY?.trim() || '123'
}

function leagueIdForSport(sport: string): string {
  return THESPORTSDB_LEAGUE_IDS[sport as keyof typeof THESPORTSDB_LEAGUE_IDS] || ''
}

function toSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function namesEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase()
}

async function fetchTheSportsDb(path: string, params?: Record<string, string>): Promise<Record<string, unknown> | null> {
  const url = new URL(`https://www.thesportsdb.com/api/v1/json/${apiKey()}/${path}`)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return null
  return (await response.json()) as Record<string, unknown>
}

function asRows<T = Record<string, unknown>>(data: Record<string, unknown> | null, key: string): T[] {
  if (!data) return []
  const rows = data[key]
  return Array.isArray(rows) ? (rows as T[]) : []
}

function resolvePlayerImage(row: Record<string, unknown>): string | null {
  const options = [
    row.strCutout,
    row.strRender,
    row.strThumb,
    row.strFanart1,
  ]
  for (const candidate of options) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return null
}

function resolveTeamLogo(row: Record<string, unknown>): string | null {
  const options = [
    row.strTeamBadge,
    row.strTeamLogo,
    row.strBadge,
    row.strLogo,
  ]
  for (const candidate of options) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return null
}

function resolveTeamCode(row: Record<string, unknown>): string | null {
  return normalizeTeamAbbrev(String(row.strTeamShort ?? row.strTeamAlternate ?? '')) ?? null
}

export const theSportsDbProvider: ApiProvider = {
  name: 'thesportsdb',
  supports: ({ dataType }: ApiFetchParams) =>
    [
      'teams',
      'players',
      'games',
      'schedule',
      'player_headshots',
      'team_logos',
    ].includes(dataType),
  async fetch({ sport, dataType, query = {} }: ApiFetchParams) {
    const leagueId = leagueIdForSport(sport)
    const search = toSearch(query.search ?? query.playerName)
    const teamName = toSearch(query.teamName)
    const teamCode = normalizeTeamAbbrev(String(query.teamCode ?? query.team ?? ''))

    switch (dataType) {
      case 'teams': {
        if (!leagueId) return null
        const data = await fetchTheSportsDb('lookup_all_teams.php', { id: leagueId })
        const rows = asRows<Record<string, unknown>>(data, 'teams')
        return rows.map((team) => ({
          id: String(team.idTeam ?? ''),
          name: String(team.strTeam ?? ''),
          shortName: resolveTeamCode(team),
          city: String(team.strLocation ?? '').trim() || null,
          logo: resolveTeamLogo(team),
          source: 'thesportsdb',
        })).filter((team) => team.id && team.name)
      }
      case 'players': {
        if (!search) return null
        const data = await fetchTheSportsDb('searchplayers.php', { p: search })
        const rows = asRows<Record<string, unknown>>(data, 'player')
        return rows
          .filter((player) => namesEqual(String(player.strSport ?? sport), sport) || sport === 'SOCCER')
          .map((player) => ({
            id: String(player.idPlayer ?? ''),
            name: String(player.strPlayer ?? ''),
            position: String(player.strPosition ?? '').trim() || null,
            team: normalizeTeamAbbrev(String(player.strTeamShort ?? player.strTeam ?? '')) ?? null,
            teamId: player.idTeam ? String(player.idTeam) : null,
            height: String(player.strHeight ?? '').trim() || null,
            weight: String(player.strWeight ?? '').trim() || null,
            college: String(player.strCollege ?? '').trim() || null,
            imageUrl: resolvePlayerImage(player),
            source: 'thesportsdb',
          }))
          .filter((player) => player.id && player.name)
      }
      case 'games':
      case 'schedule': {
        if (!leagueId) return null
        const data = await fetchTheSportsDb('eventsnextleague.php', { id: leagueId })
        const rows = asRows<Record<string, unknown>>(data, 'events')
        return rows.map((event) => ({
          id: String(event.idEvent ?? ''),
          homeTeam: normalizeTeamAbbrev(String(event.strHomeTeam ?? '')) ?? String(event.strHomeTeam ?? ''),
          awayTeam: normalizeTeamAbbrev(String(event.strAwayTeam ?? '')) ?? String(event.strAwayTeam ?? ''),
          date: String(event.dateEvent ?? event.strTimestamp ?? ''),
          status: String(event.strStatus ?? 'scheduled'),
          season: String(event.strSeason ?? ''),
          venue: String(event.strVenue ?? '').trim() || null,
          source: 'thesportsdb',
        })).filter((event) => event.id)
      }
      case 'player_headshots': {
        if (!search) return null
        const data = await fetchTheSportsDb('searchplayers.php', { p: search })
        const rows = asRows<Record<string, unknown>>(data, 'player')
        const matched = rows.find((player) => {
          const sameName = namesEqual(String(player.strPlayer ?? ''), search)
          const sameTeam =
            !teamCode ||
            normalizeTeamAbbrev(String(player.strTeamShort ?? player.strTeam ?? '')) === teamCode
          return sameName && sameTeam
        }) ?? rows[0]
        const imageUrl = matched ? resolvePlayerImage(matched) : null
        if (!imageUrl) return null
        return {
          playerId: String(matched?.idPlayer ?? ''),
          playerName: String(matched?.strPlayer ?? search),
          teamCode: normalizeTeamAbbrev(String(matched?.strTeamShort ?? matched?.strTeam ?? '')) ?? null,
          headshotUrl: imageUrl,
          headshotUrlSm: imageUrl,
          headshotUrlLg: imageUrl,
          headshotSource: 'thesportsdb',
        }
      }
      case 'team_logos': {
        const rows =
          teamName
            ? asRows<Record<string, unknown>>(
                await fetchTheSportsDb('searchteams.php', { t: teamName }),
                'teams'
              )
            : asRows<Record<string, unknown>>(
                leagueId ? await fetchTheSportsDb('lookup_all_teams.php', { id: leagueId }) : null,
                'teams'
              )
        const matched = rows.find((team) => {
          const shortName = resolveTeamCode(team)
          return (
            (!!teamCode && shortName === teamCode) ||
            (!!teamName && namesEqual(String(team.strTeam ?? ''), teamName))
          )
        }) ?? rows[0]
        const logoUrl = matched ? resolveTeamLogo(matched) : null
        if (!logoUrl) return null
        return {
          teamCode: resolveTeamCode(matched ?? {}) ?? teamCode,
          teamName: String(matched?.strTeam ?? teamName ?? ''),
          logoUrl,
          logoUrlSm: logoUrl,
          logoUrlLg: logoUrl,
          logoSource: 'thesportsdb',
        }
      }
      default:
        return null
    }
  },
}
