import type {
  FantraxImportDraftPick,
  FantraxImportPayload,
  FantraxImportTeam,
} from '@/lib/league-import/adapters/fantrax/types'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

type Json = Record<string, unknown>

export class FantraxApiImportError extends Error {}

function record(value: unknown): Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}
}

function entries(value: unknown): Array<[string, Json]> {
  return Object.entries(record(value)).map(([key, item]) => [key, record(item)])
}

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function list(value: unknown): Json[] {
  return Array.isArray(value) ? value.map(record) : []
}

function apiData(value: unknown): Json {
  const outer = record(value)
  return Object.keys(record(outer.data)).length > 0 ? record(outer.data) : outer
}

/** Fantrax URLs and 16-character IDs use the REST API. Legacy UUIDs stay on the CSV path. */
export function parseFantraxApiSource(sourceInput: string): { leagueId: string; sport: string | null } | null {
  const trimmed = sourceInput.trim()
  const prefixed = trimmed.match(/^(NFL|NBA|NHL|MLB|NCAAF|NCAAB|EPL|SOCCER|PGA|NASCAR):([a-z0-9]{16})$/i)
  if (prefixed) return { leagueId: prefixed[2], sport: prefixed[1].toUpperCase() }
  if (/^[a-z0-9]{16}$/i.test(trimmed)) return { leagueId: trimmed, sport: null }

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL
    try {
      url = new URL(trimmed)
    } catch {
      throw new FantraxApiImportError('Enter a valid Fantrax league URL or league ID.')
    }
    if (url.hostname !== 'fantrax.com' && url.hostname !== 'www.fantrax.com') {
      throw new FantraxApiImportError('Only fantrax.com league URLs are supported.')
    }
    const leagueId = url.searchParams.get('leagueId') ||
      url.pathname.match(/\/fantasy\/league\/([a-z0-9]{16})(?:\/|$)/i)?.[1] || ''
    if (!/^[a-z0-9]{16}$/i.test(leagueId)) {
      throw new FantraxApiImportError('The Fantrax URL does not contain a valid league ID.')
    }
    return { leagueId, sport: url.searchParams.get('sport')?.toUpperCase() || null }
  }
  return null
}

async function getFantrax(endpoint: string, leagueId: string, extra?: Record<string, string>): Promise<Json> {
  const url = new URL('https://www.fantrax.com/fxea/general/' + endpoint)
  url.searchParams.set('leagueId', leagueId)
  for (const [key, value] of Object.entries(extra ?? {})) url.searchParams.set(key, value)
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
  } catch {
    throw new FantraxApiImportError('Fantrax could not be reached. Try again shortly.')
  }
  if (!response.ok) {
    throw new FantraxApiImportError(
      response.status === 401 || response.status === 403
        ? 'Fantrax denied access to this league. Check its visibility or use a commissioner-provided export.'
        : response.status === 404
          ? 'Fantrax league not found. Check the league ID.'
          : 'Fantrax returned HTTP ' + response.status + ' for ' + endpoint + '.'
    )
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new FantraxApiImportError('Fantrax returned an unreadable response for ' + endpoint + '.')
  }
  const outer = record(body)
  if (outer.status === 'error' || outer.success === false) {
    throw new FantraxApiImportError('Fantrax rejected ' + endpoint + ' for this league.')
  }
  return apiData(body)
}

function sportForImport(raw: string): { fantrax: string; app: string } {
  const fantrax = raw.toUpperCase()
  if (!fantrax) {
    throw new FantraxApiImportError(
      'Fantrax did not identify the sport. Prefix the ID, for example NFL:leagueId or NCAAF:leagueId.'
    )
  }
  if (fantrax === 'PGA' || fantrax === 'NASCAR') {
    throw new FantraxApiImportError(fantrax + ' leagues are not supported in AllFantasy yet.')
  }
  const app = fantrax === 'EPL' ? 'SOCCER' : fantrax
  if (!isSupportedSport(app)) {
    throw new FantraxApiImportError('Unsupported Fantrax sport: ' + fantrax + '.')
  }
  return { fantrax: fantrax === 'SOCCER' ? 'EPL' : fantrax, app: normalizeToSupportedSport(app) }
}

function readStandings(raw: Json): Map<string, Json> {
  const result = new Map<string, Json>()
  for (const item of list(raw.items ?? raw.standings ?? raw.teams)) {
    const id = string(item.teamId ?? item.id)
    if (id) result.set(id, item)
  }
  return result
}

function scoringRules(scoringSystem: Json): Array<{ statKey: string; points: number }> {
  const rules: Array<{ statKey: string; points: number }> = []
  for (const group of list(scoringSystem.scoringCategorySettings)) {
    for (const config of list(group.configs)) {
      const category = record(config.scoringCategory)
      const position = record(config.position)
      const stat = string(category.code ?? category.id)
      const value = number(config.points)
      if (stat && value != null) {
        const positionCode = string(position.code ?? position.id)
        rules.push({ statKey: positionCode ? stat + ':' + positionCode : stat, points: value })
      }
    }
  }
  return rules
}

export async function fetchFantraxApiLeagueForImport(
  sourceInput: string,
  source: { leagueId: string; sport: string | null }
): Promise<FantraxImportPayload> {
  const info = await getFantrax('getLeagueInfo', source.leagueId)
  const leagueName = string(info.leagueName)
  const infoTeams = entries(info.teamInfo)
  if (!leagueName || infoTeams.length === 0) {
    throw new FantraxApiImportError('Fantrax returned no league name or teams for this ID.')
  }

  const sport = sportForImport(source.sport || string(info.sport ?? info.sportId ?? info.leagueSport))
  const [rosterResult, standingsResult, draftResult, playerResult] = await Promise.allSettled([
    getFantrax('getTeamRosters', source.leagueId),
    getFantrax('getStandings', source.leagueId),
    getFantrax('getDraftResults', source.leagueId),
    getFantrax('getPlayerIds', source.leagueId, { sport: sport.fantrax }),
  ])
  if (rosterResult.status !== 'fulfilled') {
    throw new FantraxApiImportError('Fantrax team rosters could not be loaded; import stopped to avoid empty teams.')
  }
  const rosters = record(rosterResult.value.rosters)
  if (Object.keys(rosters).length === 0) {
    throw new FantraxApiImportError('Fantrax returned no team rosters; import stopped to avoid empty teams.')
  }
  const standings = standingsResult.status === 'fulfilled' ? readStandings(standingsResult.value) : new Map<string, Json>()
  const playerDirectory = playerResult.status === 'fulfilled' ? playerResult.value : {}
  const playerInfo = record(info.playerInfo)
  const playerMap: FantraxImportPayload['playerMap'] = {}
  const warnings: string[] = []
  if (standingsResult.status !== 'fulfilled') warnings.push('Standings were unavailable.')
  if (draftResult.status !== 'fulfilled') warnings.push('Draft results were unavailable.')
  if (playerResult.status !== 'fulfilled') warnings.push('Player names were unavailable; Fantrax IDs were preserved.')
  warnings.push('Fantrax does not identify managers in this response; team names are used as placeholders.')

  const teams: FantraxImportTeam[] = infoTeams.map(([teamId, teamInfo], index) => {
    const roster = record(rosters[teamId])
    const teamName = string(teamInfo.name ?? roster.teamName) || teamId
    const standing = standings.get(teamId) ?? {}
    const items = list(roster.rosterItems)
    const allIds: string[] = []
    const starters: string[] = []
    const reserves: string[] = []
    for (const item of items) {
      const id = string(item.id ?? item.playerId)
      if (!id) continue
      allIds.push(id)
      if (string(item.status).toUpperCase() === 'ACTIVE') starters.push(id)
      else reserves.push(id)
      const directory = record(playerDirectory[id])
      const pool = record(playerInfo[id])
      playerMap[id] = {
        name: string(directory.name ?? pool.name) || id,
        position: string(directory.position ?? item.position ?? pool.eligiblePos) || 'N/A',
        team: string(directory.team ?? pool.team),
      }
    }
    return {
      teamId,
      managerId: 'fantrax-manager:' + teamId,
      managerName: teamName,
      teamName,
      logoUrl: string(teamInfo.logoUrl ?? teamInfo.logoUrl512) || null,
      wins: number(standing.wins) ?? 0,
      losses: number(standing.losses) ?? 0,
      ties: number(standing.ties) ?? 0,
      rank: number(standing.rank) ?? index + 1,
      pointsFor: number(standing.pointsFor) ?? number(standing.points) ?? 0,
      pointsAgainst: number(standing.pointsAgainst),
      faabRemaining: null,
      waiverPriority: number(standing.waiverOrder),
      rosterPlayerIds: allIds,
      starterPlayerIds: starters,
      reservePlayerIds: reserves,
      playerMap: Object.fromEntries(allIds.map((id) => [id, playerMap[id]])),
    }
  })

  const scoringSystem = record(info.scoringSystem)
  const scoringType = string(scoringSystem.type)
  const rosterInfo = record(info.rosterInfo)
  const playoffs = record(info.playoffs)
  const draftSettings = record(info.draftSettings)
  const schedule = list(info.matchups).map((period) => {
    const week = number(period.period ?? period.number)
    if (week == null || week < 1) return null
    const matchups = list(period.matchupList).map((matchup) => {
      const away = record(matchup.away)
      const home = record(matchup.home)
      const teamId1 = string(away.id ?? away.teamId)
      const teamId2 = string(home.id ?? home.teamId)
      return teamId1 && teamId2 ? { teamId1, teamId2 } : null
    }).filter((item): item is { teamId1: string; teamId2: string } => item !== null)
    return { week, season: number(info.seasonYear) ?? new Date().getFullYear(), matchups }
  }).filter((item): item is NonNullable<typeof item> => item !== null)
  const draft = draftResult.status === 'fulfilled' ? draftResult.value : {}
  const draftPicks: FantraxImportDraftPick[] = list(draft.draftPicks).map((pick) => {
    const round = number(pick.round)
    const pickNumber = number(pick.pick ?? pick.pickNumber)
    const teamId = string(pick.teamId)
    const playerId = string(pick.playerId)
    if (round == null || pickNumber == null || !teamId || !playerId) return null
    const player = playerMap[playerId]
    return { round, pickNumber, teamId, playerId, playerName: player?.name ?? playerId,
      position: player?.position ?? null, team: player?.team ?? null }
  }).filter((item): item is FantraxImportDraftPick => item !== null)

  if (!scoringType) warnings.push('Fantrax scoring format was not identified.')
  if (scoringType && !scoringType.includes('HEAD_TO_HEAD')) {
    warnings.push('This scoring format needs commissioner review before playing in AllFantasy.')
  }
  warnings.push('Roster position constraints are retained as source data; starter slot counts need commissioner review.')
  const season = number(info.seasonYear) ?? new Date().getFullYear()
  const endDate = number(info.endDate)
  return {
    sourceInput,
    league: {
      leagueId: source.leagueId,
      name: leagueName,
      sport: sport.app,
      season,
      size: teams.length,
      currentWeek: number(rosterResult.value.period),
      isFinished: endDate != null ? endDate < Date.now() : season < new Date().getFullYear(),
      url: 'https://www.fantrax.com/fantasy/league/' + source.leagueId,
      isDevy: false,
    },
    settings: {
      scoringType: scoringType || null,
      rosterPositions: [],
      scoringRules: scoringRules(scoringSystem),
      raw: {
        source: 'fantrax_api',
        scoringSystem,
        rosterInfo,
        playoffs,
        draftSettings,
        playerPool: record(info.poolSettings),
        warnings,
      },
    },
    teams,
    schedule,
    transactions: [],
    draftPicks,
    playerMap,
    previousSeasons: [],
  }
}
