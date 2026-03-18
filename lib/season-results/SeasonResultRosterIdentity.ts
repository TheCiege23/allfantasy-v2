export interface SeasonResultRosterLookupRow {
  id: string
  leagueId: string
  playerData?: unknown
}

export interface SeasonResultManagerLookupRow extends SeasonResultRosterLookupRow {
  platformUserId?: string | null
}

export interface ResolvedSeasonResultRosterIds {
  leagueIds: string[]
  rosterIds: string[]
  rosterIdsByLeague: Map<string, string[]>
}

export interface LeagueScopedRosterIdFilter {
  leagueId: string
  rosterId: { in: string[] }
}

export interface BasicSeasonResultAliasRow {
  leagueId: string
  season: string
  wins?: number | null
  losses?: number | null
  champion?: boolean | null
}

function extractSourceTeamId(playerData: unknown): string | null {
  if (!playerData || typeof playerData !== 'object' || Array.isArray(playerData)) {
    return null
  }

  const rawSourceTeamId = (playerData as Record<string, unknown>).source_team_id
  if (typeof rawSourceTeamId === 'string' && rawSourceTeamId.trim()) {
    return rawSourceTeamId.trim()
  }

  if (typeof rawSourceTeamId === 'number' && Number.isFinite(rawSourceTeamId)) {
    return String(rawSourceTeamId)
  }

  return null
}

export function getSeasonResultKeysForRoster(
  roster: SeasonResultRosterLookupRow
): string[] {
  const keys = [roster.id]
  const sourceTeamId = extractSourceTeamId(roster.playerData)

  if (sourceTeamId && sourceTeamId !== roster.id) {
    keys.push(sourceTeamId)
  }

  return keys
}

export function buildSeasonResultManagerMap(
  rosters: SeasonResultManagerLookupRow[]
): Map<string, string> {
  const rosterIdToManager = new Map<string, string>()

  for (const roster of rosters) {
    if (!roster.platformUserId) {
      continue
    }

    for (const key of getSeasonResultKeysForRoster(roster)) {
      rosterIdToManager.set(key, roster.platformUserId)
    }
  }

  return rosterIdToManager
}

export function buildLeagueScopedRosterIdFilters(
  resolved: ResolvedSeasonResultRosterIds
): LeagueScopedRosterIdFilter[] {
  const filters: LeagueScopedRosterIdFilter[] = []

  for (const [leagueId, rosterIds] of resolved.rosterIdsByLeague.entries()) {
    if (rosterIds.length === 0) {
      continue
    }

    filters.push({
      leagueId,
      rosterId: { in: rosterIds },
    })
  }

  return filters
}

export function mergeSeasonResultAliases<T extends BasicSeasonResultAliasRow>(
  rows: T[]
): Array<{
  leagueId: string
  season: string
  wins: number
  losses: number
  champion: boolean
}> {
  const bySeason = new Map<
    string,
    { leagueId: string; season: string; wins: number; losses: number; champion: boolean }
  >()

  for (const row of rows) {
    const key = `${row.leagueId}:${row.season}`
    const existing = bySeason.get(key)
    const wins = row.wins ?? 0
    const losses = row.losses ?? 0
    const champion = row.champion ?? false

    if (!existing) {
      bySeason.set(key, {
        leagueId: row.leagueId,
        season: row.season,
        wins,
        losses,
        champion,
      })
      continue
    }

    existing.wins = Math.max(existing.wins, wins)
    existing.losses = Math.max(existing.losses, losses)
    existing.champion = existing.champion || champion
  }

  return Array.from(bySeason.values())
}

/**
 * SeasonResult rows may be keyed by either the app's internal Roster.id or the
 * imported provider roster identifier stored in playerData.source_team_id.
 */
export function resolveSeasonResultRosterIds(
  rosters: SeasonResultRosterLookupRow[]
): ResolvedSeasonResultRosterIds {
  const rosterIdsByLeagueSet = new Map<string, Set<string>>()
  const rosterIdSet = new Set<string>()

  for (const roster of rosters) {
    const idsForLeague = rosterIdsByLeagueSet.get(roster.leagueId) ?? new Set<string>()
    for (const rosterId of getSeasonResultKeysForRoster(roster)) {
      idsForLeague.add(rosterId)
      rosterIdSet.add(rosterId)
    }

    rosterIdsByLeagueSet.set(roster.leagueId, idsForLeague)
  }

  const rosterIdsByLeague = new Map<string, string[]>(
    Array.from(rosterIdsByLeagueSet.entries()).map(([leagueId, ids]) => [
      leagueId,
      Array.from(ids),
    ])
  )

  return {
    leagueIds: Array.from(rosterIdsByLeague.keys()),
    rosterIds: Array.from(rosterIdSet),
    rosterIdsByLeague,
  }
}
