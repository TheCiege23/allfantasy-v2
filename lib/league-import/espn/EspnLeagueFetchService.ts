import { getDecryptedAuth } from '@/lib/league-sync-core'
import type {
  EspnImportLeague,
  EspnImportPayload,
  EspnImportScheduleWeek,
  EspnImportSettings,
  EspnImportTeam,
} from '@/lib/league-import/adapters/espn/types'

const ESPN_API_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl'
const CURRENT_IMPORT_SEASON = new Date().getFullYear()
const ESPN_IMPORT_VIEWS = ['mTeam', 'mRoster', 'mMatchup', 'mScoreboard', 'mSettings']
const ESPN_DISCOVERY_VIEWS = ['mTeam', 'mSettings']
const ESPN_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; AllFantasy/1.0)',
}

const ESPN_SLOT_LABELS: Record<number, string> = {
  0: 'QB',
  1: 'TQB',
  2: 'RB',
  3: 'RB/WR',
  4: 'WR',
  5: 'WR/TE',
  6: 'TE',
  7: 'SUPER_FLEX',
  8: 'DT',
  9: 'DE',
  10: 'LB',
  11: 'DL',
  12: 'CB',
  13: 'S',
  14: 'DB',
  15: 'DP',
  16: 'D/ST',
  17: 'K',
  18: 'P',
  19: 'HC',
  20: 'BE',
  21: 'IR',
  23: 'FLEX',
  24: 'EDR',
}

const ESPN_POSITION_LABELS: Record<number, string> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST',
}

const ESPN_TEAM_ABBREVIATIONS: Record<number, string> = {
  1: 'ATL',
  2: 'BUF',
  3: 'CHI',
  4: 'CIN',
  5: 'CLE',
  6: 'DAL',
  7: 'DEN',
  8: 'DET',
  9: 'GB',
  10: 'TEN',
  11: 'IND',
  12: 'KC',
  13: 'LV',
  14: 'LAR',
  15: 'MIA',
  16: 'MIN',
  17: 'NE',
  18: 'NO',
  19: 'NYG',
  20: 'NYJ',
  21: 'PHI',
  22: 'ARI',
  23: 'PIT',
  24: 'LAC',
  25: 'SF',
  26: 'SEA',
  27: 'TB',
  28: 'WAS',
  29: 'CAR',
  30: 'JAX',
  33: 'BAL',
  34: 'HOU',
}

const ESPN_RESERVE_SLOTS = new Set([20, 21])

type EspnAuthContext = {
  swid: string | null
  espnS2: string | null
}

type EspnMemberSummary = {
  id: string
  displayName: string
}

class EspnApiResponseError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class EspnImportConnectionError extends Error {}

export class EspnImportLeagueNotFoundError extends Error {}

export interface EspnFetchOptions {
  includePreviousSeasons?: boolean
  maxPreviousSeasons?: number
  minSeason?: number
}

const DEFAULT_FETCH_OPTIONS: Required<EspnFetchOptions> = {
  includePreviousSeasons: true,
  maxPreviousSeasons: 6,
  minSeason: 2010,
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = parseNumber(value, null)
  return parsed != null && parsed > 0 ? Math.floor(parsed) : fallback
}

function buildEspnLeagueUrl(leagueId: string, season: number, views: string[] = ESPN_IMPORT_VIEWS): string {
  const query = views.map((view) => `view=${encodeURIComponent(view)}`).join('&')
  return `${ESPN_API_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?${query}`
}

function parseEspnSourceInput(sourceInput: string): { leagueId: string; season: number } {
  const trimmed = sourceInput.trim()
  if (!trimmed) {
    throw new EspnImportLeagueNotFoundError('ESPN league ID is required.')
  }

  let leagueId = ''
  let season = CURRENT_IMPORT_SEASON

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      const leagueIdParam = url.searchParams.get('leagueId')
      const seasonIdParam = url.searchParams.get('seasonId')
      if (leagueIdParam) leagueId = leagueIdParam.replace(/\D/g, '')
      if (seasonIdParam) season = toPositiveInt(seasonIdParam, season)
    } catch {
      // Fall through to shorthand parsing.
    }
  }

  if (!leagueId) {
    const seasonFirst = trimmed.match(/^(\d{4})[:/](\d+)$/)
    const leagueFirst = trimmed.match(/^(\d+)[@:](\d{4})$/)
    const leagueIdMatch = trimmed.match(/leagueId=(\d+)/i)
    const seasonIdMatch = trimmed.match(/seasonId=(\d{4})/i)

    if (seasonFirst) {
      season = toPositiveInt(seasonFirst[1], season)
      leagueId = seasonFirst[2]
    } else if (leagueFirst) {
      leagueId = leagueFirst[1]
      season = toPositiveInt(leagueFirst[2], season)
    } else if (leagueIdMatch) {
      leagueId = leagueIdMatch[1]
      if (seasonIdMatch) season = toPositiveInt(seasonIdMatch[1], season)
    } else if (/^\d+$/.test(trimmed)) {
      leagueId = trimmed
    }
  }

  if (!leagueId) {
    throw new EspnImportLeagueNotFoundError(
      'Enter an ESPN league ID, a full ESPN league URL, or a season-prefixed value like 2025:12345678.'
    )
  }

  return { leagueId, season }
}

async function fetchEspnJson(
  leagueId: string,
  season: number,
  cookieHeader?: string | null,
  views: string[] = ESPN_IMPORT_VIEWS
): Promise<any> {
  const headers = cookieHeader
    ? {
        ...ESPN_HEADERS,
        Cookie: cookieHeader,
      }
    : ESPN_HEADERS

  const response = await fetch(buildEspnLeagueUrl(leagueId, season, views), {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new EspnApiResponseError(response.status, body || response.statusText)
  }

  return response.json()
}

async function getEspnAuthForUser(userId: string): Promise<EspnAuthContext> {
  const auth = await getDecryptedAuth(userId, 'espn')
  return {
    swid: auth?.espnSwid ?? null,
    espnS2: auth?.espnS2 ?? null,
  }
}

function buildEspnCookieHeader(context: EspnAuthContext): string | null {
  if (!context.swid || !context.espnS2) return null
  return `SWID=${context.swid}; espn_s2=${context.espnS2}`
}

async function loadEspnLeagueRaw(args: {
  leagueId: string
  season: number
  auth: EspnAuthContext
  views?: string[]
}): Promise<any> {
  const cookieHeader = buildEspnCookieHeader(args.auth)
  const attempts = cookieHeader ? [cookieHeader, null] : [null]
  let lastError: unknown = null

  for (const attempt of attempts) {
    try {
      return await fetchEspnJson(args.leagueId, args.season, attempt, args.views ?? ESPN_IMPORT_VIEWS)
    } catch (error) {
      lastError = error

      if (!(error instanceof EspnApiResponseError)) {
        throw error
      }

      if (error.status === 404) {
        throw new EspnImportLeagueNotFoundError(
          `ESPN league "${args.leagueId}" was not found for season ${args.season}.`
        )
      }

      if (error.status !== 401 && error.status !== 403) {
        throw error
      }
    }
  }

  if (lastError instanceof EspnApiResponseError && (lastError.status === 401 || lastError.status === 403)) {
    if (cookieHeader) {
      throw new EspnImportConnectionError(
        'Your saved ESPN cookies no longer unlock this league. Reconnect ESPN in League Sync and try again.'
      )
    }
    throw new EspnImportConnectionError(
      'This ESPN league is private. Connect ESPN in League Sync before importing it.'
    )
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load ESPN league data.')
}

function buildEspnMemberDirectory(rawMembers: unknown): Map<string, EspnMemberSummary> {
  const directory = new Map<string, EspnMemberSummary>()
  if (!Array.isArray(rawMembers)) return directory

  for (const member of rawMembers) {
    if (!isRecord(member)) continue
    const idCandidates = [member.id, member.memberId, member.guid]
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter(Boolean)
    const displayName =
      typeof member.displayName === 'string' && member.displayName.trim()
        ? member.displayName.trim()
        : `${typeof member.firstName === 'string' ? member.firstName : ''} ${typeof member.lastName === 'string' ? member.lastName : ''}`.trim()

    for (const id of idCandidates) {
      directory.set(id, {
        id,
        displayName: displayName || id,
      })
    }
  }

  return directory
}

function resolveEspnOwners(team: Record<string, any>, members: Map<string, EspnMemberSummary>) {
  const ownerRefs = Array.isArray(team.owners) ? team.owners : []
  const resolvedOwners: EspnMemberSummary[] = []

  for (const ownerRef of ownerRefs) {
    if (isRecord(ownerRef)) {
      const ownerId = String(ownerRef.id ?? ownerRef.memberId ?? ownerRef.guid ?? '').trim()
      const displayName =
        typeof ownerRef.displayName === 'string' && ownerRef.displayName.trim()
          ? ownerRef.displayName.trim()
          : `${typeof ownerRef.firstName === 'string' ? ownerRef.firstName : ''} ${typeof ownerRef.lastName === 'string' ? ownerRef.lastName : ''}`.trim()
      if (ownerId || displayName) {
        resolvedOwners.push({
          id: ownerId || displayName || String(team.id ?? 'manager'),
          displayName: displayName || members.get(ownerId)?.displayName || ownerId || String(team.id ?? 'Manager'),
        })
      }
      continue
    }

    const ownerId = String(ownerRef ?? '').trim()
    if (!ownerId) continue
    resolvedOwners.push(members.get(ownerId) ?? { id: ownerId, displayName: ownerId })
  }

  const uniqueOwners = resolvedOwners.filter(
    (owner, index, array) =>
      array.findIndex((candidate) => candidate.id === owner.id && candidate.displayName === owner.displayName) === index
  )

  const managerId = uniqueOwners[0]?.id ?? String(team.primaryOwner ?? team.id ?? 'manager')
  const managerName = uniqueOwners.map((owner) => owner.displayName).filter(Boolean).join(' / ')

  return {
    managerId,
    managerName: managerName || `Manager ${managerId}`,
  }
}

function parseEspnSettings(raw: any): EspnImportSettings | null {
  const settings = isRecord(raw?.settings) ? raw.settings : null
  if (!settings) return null

  const rosterSettings = isRecord(settings.rosterSettings) ? settings.rosterSettings : {}
  const scoringSettings = isRecord(settings.scoringSettings) ? settings.scoringSettings : {}
  const acquisitionSettings = isRecord(settings.acquisitionSettings) ? settings.acquisitionSettings : {}
  const scheduleSettings = isRecord(settings.scheduleSettings) ? settings.scheduleSettings : {}
  const draftSettings = isRecord(settings.draftSettings) ? settings.draftSettings : {}
  const lineupSlotCountsRaw = isRecord(rosterSettings.lineupSlotCounts) ? rosterSettings.lineupSlotCounts : {}
  const scoringItemsRaw = Array.isArray(scoringSettings.scoringItems) ? scoringSettings.scoringItems : []

  const lineupSlotCounts = Object.entries(lineupSlotCountsRaw)
    .map(([slotId, count]) => ({
      slotId: toPositiveInt(slotId, 0),
      slot: ESPN_SLOT_LABELS[toPositiveInt(slotId, 0)] ?? `SLOT_${slotId}`,
      count: toPositiveInt(count, 0),
    }))
    .filter((slot) => slot.count > 0)
    .sort((a, b) => a.slotId - b.slotId)

  const scoringItems = scoringItemsRaw
    .map((item: unknown) => {
      if (!isRecord(item)) return null
      const statId = parseNumber(item.statId, null)
      if (statId == null) return null
      return {
        statId,
        points: parseNumber(item.points, 0) ?? 0,
      }
    })
    .filter(Boolean) as EspnImportSettings['scoringItems']

  return {
    scoringType: typeof scoringSettings.scoringType === 'string' ? scoringSettings.scoringType : null,
    draftType: typeof draftSettings.type === 'string' ? draftSettings.type : null,
    lineupSlotCounts,
    scoringItems,
    usesFaab: Boolean(
      acquisitionSettings.isUsingAcquisitionBudget ??
        acquisitionSettings.useAcquisitionBudget ??
        acquisitionSettings.acquisitionBudget
    ),
    acquisitionBudget: parseNumber(acquisitionSettings.acquisitionBudget, null),
    waiverProcessDay:
      parseNumber(acquisitionSettings.waiverProcessDays, null) ??
      parseNumber(acquisitionSettings.waiverProcessDay, null),
    playoffTeamCount: parseNumber(scheduleSettings.playoffTeamCount, null),
    matchupPeriodCount: parseNumber(scheduleSettings.matchupPeriodCount, null),
    regularSeasonMatchupCount: parseNumber(scheduleSettings.matchupPeriodCount, null),
    raw: settings,
  }
}

function buildEspnTeamName(team: Record<string, any>, fallback: string): string {
  const location = typeof team.location === 'string' ? team.location.trim() : ''
  const nickname = typeof team.nickname === 'string' ? team.nickname.trim() : ''
  if (location && nickname) return `${location} ${nickname}`.trim()
  if (typeof team.name === 'string' && team.name.trim()) return team.name.trim()
  if (typeof team.abbrev === 'string' && team.abbrev.trim()) return team.abbrev.trim()
  return fallback
}

function parseEspnRosterEntries(entries: unknown): {
  playerIds: string[]
  starterIds: string[]
  reserveIds: string[]
  playerMap: Record<string, { name: string; position: string; team: string }>
} {
  const playerIds: string[] = []
  const starterIds: string[] = []
  const reserveIds: string[] = []
  const playerMap: Record<string, { name: string; position: string; team: string }> = {}

  if (!Array.isArray(entries)) {
    return { playerIds, starterIds, reserveIds, playerMap }
  }

  for (const entry of entries) {
    if (!isRecord(entry)) continue
    const playerPoolEntry = isRecord(entry.playerPoolEntry) ? entry.playerPoolEntry : {}
    const player = isRecord(playerPoolEntry.player) ? playerPoolEntry.player : {}
    const playerId = String(entry.playerId ?? player.id ?? playerPoolEntry.id ?? '').trim()
    if (!playerId) continue

    const lineupSlotId = toPositiveInt(entry.lineupSlotId, 20)
    const isReserve = ESPN_RESERVE_SLOTS.has(lineupSlotId)
    const playerName =
      typeof player.fullName === 'string' && player.fullName.trim()
        ? player.fullName.trim()
        : `Player ${playerId}`
    const positionId = toPositiveInt(player.defaultPositionId, 0)
    const teamId = toPositiveInt(player.proTeamId, 0)

    playerIds.push(playerId)
    if (isReserve) {
      reserveIds.push(playerId)
    } else {
      starterIds.push(playerId)
    }
    playerMap[playerId] = {
      name: playerName,
      position: ESPN_POSITION_LABELS[positionId] ?? 'N/A',
      team: ESPN_TEAM_ABBREVIATIONS[teamId] ?? '',
    }
  }

  return { playerIds, starterIds, reserveIds, playerMap }
}

function getEspnTeamRank(team: Record<string, any>): number | null {
  return (
    parseNumber(team.rankCalculatedFinal, null) ??
    parseNumber(team.currentProjectedRank, null) ??
    parseNumber(team.playoffSeed, null) ??
    parseNumber(team.record?.overall?.rank, null)
  )
}

function computeEspnStandingsRanks(teams: EspnImportTeam[]): Map<string, number> {
  const ranked = [...teams].sort((a, b) => {
    const gamesA = a.wins + a.losses + a.ties
    const gamesB = b.wins + b.losses + b.ties
    const pctA = gamesA > 0 ? (a.wins + a.ties * 0.5) / gamesA : 0
    const pctB = gamesB > 0 ? (b.wins + b.ties * 0.5) / gamesB : 0
    if (pctB !== pctA) return pctB - pctA
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
    if ((a.pointsAgainst ?? Number.POSITIVE_INFINITY) !== (b.pointsAgainst ?? Number.POSITIVE_INFINITY)) {
      return (a.pointsAgainst ?? Number.POSITIVE_INFINITY) - (b.pointsAgainst ?? Number.POSITIVE_INFINITY)
    }
    return a.teamName.localeCompare(b.teamName)
  })

  return new Map(ranked.map((team, index) => [team.teamId, index + 1]))
}

function parseEspnTeams(raw: any, settings: EspnImportSettings | null): EspnImportTeam[] {
  const members = buildEspnMemberDirectory(raw?.members)
  const teamsRaw = Array.isArray(raw?.teams) ? raw.teams : []
  const teams = teamsRaw
    .filter(isRecord)
    .map((team: Record<string, any>) => {
      const teamId = String(team.id ?? '').trim()
      if (!teamId) return null

      const { managerId, managerName } = resolveEspnOwners(team, members)
      const roster = parseEspnRosterEntries(team.roster?.entries)
      const record = isRecord(team.record?.overall) ? team.record.overall : {}
      const acquisitionBudgetSpent = parseNumber(team.transactionCounter?.acquisitionBudgetSpent, null)
      const faabRemaining =
        parseNumber(team.waiverBudgetRemaining, null) ??
        (settings?.acquisitionBudget != null && acquisitionBudgetSpent != null
          ? Math.max(0, settings.acquisitionBudget - acquisitionBudgetSpent)
          : null)

      return {
        teamId,
        managerId,
        managerName,
        teamName: buildEspnTeamName(team, managerName),
        logoUrl: typeof team.logo === 'string' ? team.logo : null,
        wins: parseNumber(record.wins, 0) ?? 0,
        losses: parseNumber(record.losses, 0) ?? 0,
        ties: parseNumber(record.ties, 0) ?? 0,
        rank: getEspnTeamRank(team),
        pointsFor: parseNumber(record.pointsFor, 0) ?? 0,
        pointsAgainst: parseNumber(record.pointsAgainst, null),
        faabRemaining,
        waiverPriority: parseNumber(team.waiverRank, null),
        rosterPlayerIds: roster.playerIds,
        starterPlayerIds: roster.starterIds,
        reservePlayerIds: roster.reserveIds,
        playerMap: roster.playerMap,
      }
    })
    .filter(Boolean) as EspnImportTeam[]

  const computedRanks = computeEspnStandingsRanks(teams)
  for (const team of teams) {
    if (team.rank == null) {
      team.rank = computedRanks.get(team.teamId) ?? null
    }
  }

  return teams
}

function upsertEspnMatchup(
  weeks: Map<number, EspnImportScheduleWeek['matchups']>,
  week: number,
  teamId1: string,
  teamId2: string,
  points1?: number,
  points2?: number
) {
  if (!teamId1 || !teamId2) return
  if (!weeks.has(week)) {
    weeks.set(week, [])
  }
  const matchups = weeks.get(week)!
  const matchupKey = [teamId1, teamId2].sort().join('::')
  const existing = matchups.find((matchup) => [matchup.teamId1, matchup.teamId2].sort().join('::') === matchupKey)
  if (existing) {
    if (typeof points1 === 'number') existing.points1 = points1
    if (typeof points2 === 'number') existing.points2 = points2
    return
  }

  matchups.push({
    teamId1,
    teamId2,
    points1,
    points2,
  })
}

function parseEspnSchedule(raw: any, season: number, currentWeek: number | null): EspnImportScheduleWeek[] {
  const weeks = new Map<number, EspnImportScheduleWeek['matchups']>()
  const scheduleRaw = Array.isArray(raw?.schedule) ? raw.schedule : []

  for (const matchup of scheduleRaw) {
    if (!isRecord(matchup)) continue
    const week = parseNumber(matchup.matchupPeriodId, null)
    if (week == null || week < 1) continue
    const home = isRecord(matchup.home) ? matchup.home : {}
    const away = isRecord(matchup.away) ? matchup.away : {}
    const teamId1 = String(home.teamId ?? '').trim()
    const teamId2 = String(away.teamId ?? '').trim()
    upsertEspnMatchup(
      weeks,
      week,
      teamId1,
      teamId2,
      parseNumber(home.totalPoints, null) ?? undefined,
      parseNumber(away.totalPoints, null) ?? undefined
    )
  }

  const scoreboardMatchups = Array.isArray(raw?.scoreboard?.matchups) ? raw.scoreboard.matchups : []
  const scoreboardWeek = currentWeek ?? parseNumber(raw?.scoringPeriodId, null)
  if (scoreboardWeek != null) {
    for (const matchup of scoreboardMatchups) {
      if (!isRecord(matchup)) continue
      const home = isRecord(matchup.home) ? matchup.home : {}
      const away = isRecord(matchup.away) ? matchup.away : {}
      const teamId1 = String(home.teamId ?? '').trim()
      const teamId2 = String(away.teamId ?? '').trim()
      upsertEspnMatchup(
        weeks,
        scoreboardWeek,
        teamId1,
        teamId2,
        parseNumber(home.totalPoints, null) ?? undefined,
        parseNumber(away.totalPoints, null) ?? undefined
      )
    }
  }

  return Array.from(weeks.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, matchups]) => ({
      week,
      season,
      matchups,
    }))
}

function inferEspnSeasonFinished(args: {
  season: number
  currentWeek: number | null
  raw: any
}): boolean {
  if (args.season < CURRENT_IMPORT_SEASON) return true

  const finalScoringPeriod = parseNumber(args.raw?.status?.finalScoringPeriod, null)
  if (finalScoringPeriod != null && args.currentWeek != null) {
    return args.currentWeek >= finalScoringPeriod
  }

  return false
}

async function discoverEspnPreviousSeasons(args: {
  leagueId: string
  season: number
  auth: EspnAuthContext
  maxPreviousSeasons: number
  minSeason: number
}): Promise<Array<{ season: string; sourceLeagueId: string }>> {
  const previousSeasons: Array<{ season: string; sourceLeagueId: string }> = []

  for (
    let candidateSeason = args.season - 1;
    candidateSeason >= args.minSeason && previousSeasons.length < args.maxPreviousSeasons;
    candidateSeason -= 1
  ) {
    try {
      await loadEspnLeagueRaw({
        leagueId: args.leagueId,
        season: candidateSeason,
        auth: args.auth,
        views: ESPN_DISCOVERY_VIEWS,
      })
      previousSeasons.push({
        season: String(candidateSeason),
        sourceLeagueId: args.leagueId,
      })
    } catch (error) {
      if (error instanceof EspnImportLeagueNotFoundError) {
        break
      }
      if (error instanceof EspnImportConnectionError) {
        break
      }
      throw error
    }
  }

  return previousSeasons
}

function fillEspnPointsAgainst(teams: EspnImportTeam[], schedule: EspnImportScheduleWeek[]) {
  const pointsAgainstByTeam = new Map<string, number>()

  for (const week of schedule) {
    for (const matchup of week.matchups) {
      if (typeof matchup.points2 === 'number') {
        pointsAgainstByTeam.set(
          matchup.teamId1,
          (pointsAgainstByTeam.get(matchup.teamId1) ?? 0) + matchup.points2
        )
      }
      if (typeof matchup.points1 === 'number') {
        pointsAgainstByTeam.set(
          matchup.teamId2,
          (pointsAgainstByTeam.get(matchup.teamId2) ?? 0) + matchup.points1
        )
      }
    }
  }

  for (const team of teams) {
    if (team.pointsAgainst == null && pointsAgainstByTeam.has(team.teamId)) {
      team.pointsAgainst = pointsAgainstByTeam.get(team.teamId) ?? null
    }
  }
}

export async function fetchEspnLeagueForImport(
  userId: string,
  sourceInput: string,
  options: EspnFetchOptions = {}
): Promise<EspnImportPayload> {
  const opts = { ...DEFAULT_FETCH_OPTIONS, ...options }
  const { leagueId, season } = parseEspnSourceInput(sourceInput)
  const auth = await getEspnAuthForUser(userId)
  const raw = await loadEspnLeagueRaw({
    leagueId,
    season,
    auth,
    views: ESPN_IMPORT_VIEWS,
  })

  const settings = parseEspnSettings(raw)
  const currentWeek =
    parseNumber(raw?.status?.currentMatchupPeriod, null) ??
    parseNumber(raw?.scoringPeriodId, null)
  const league: EspnImportLeague = {
    leagueId,
    name:
      typeof raw?.settings?.name === 'string' && raw.settings.name.trim()
        ? raw.settings.name.trim()
        : `ESPN League ${leagueId}`,
    sport: 'NFL',
    season,
    size: parseNumber(raw?.settings?.size, Array.isArray(raw?.teams) ? raw.teams.length : 0) ?? 0,
    currentWeek,
    isFinished: inferEspnSeasonFinished({ season, currentWeek, raw }),
    playoffTeamCount: settings?.playoffTeamCount ?? null,
    regularSeasonLength:
      settings?.regularSeasonMatchupCount ?? settings?.matchupPeriodCount ?? null,
  }

  const teams = parseEspnTeams(raw, settings)
  if (teams.length === 0) {
    throw new EspnImportLeagueNotFoundError(
      `ESPN league "${leagueId}" was found, but no team data was available for import.`
    )
  }

  const schedule = parseEspnSchedule(raw, season, currentWeek)
  fillEspnPointsAgainst(teams, schedule)
  const previousSeasons = opts.includePreviousSeasons
    ? await discoverEspnPreviousSeasons({
        leagueId,
        season,
        auth,
        maxPreviousSeasons: opts.maxPreviousSeasons,
        minSeason: opts.minSeason,
      })
    : []

  return {
    sourceInput,
    league,
    settings,
    teams,
    schedule,
    previousSeasons,
  }
}
