/**
 * Decision OS — Phase 2 Canonical World Assembly: the READ-ONLY data-access port.
 *
 * This is the ONLY file in the substrate permitted to import prisma, and it exposes ONLY read methods
 * (`findUnique` / `findMany`). There is intentionally no create/update/upsert/delete surface anywhere
 * in the world module, so the read-only guarantee is structural: nothing the assembler can reach is
 * able to write. In particular this NEVER calls `resolveRedraftRosterLookup` (which performs owner
 * repair via `prisma.redraftRoster.update`).
 */
import { prisma } from '@/lib/prisma'
import type {
  RawInjuryContextRow,
  RawLeagueRow,
  RawPerformanceRow,
  RawPlayerMetadataRow,
  RawRosterRow,
  RawScheduleGameRow,
  RawTeamRow,
} from './facts'
import { mapRedraftRosterRowToRawRoster, unionRosterRows, type RawRedraftRosterRow } from './redraftRoster'

export interface CanonicalWorldPort {
  loadLeague(leagueId: string): Promise<RawLeagueRow | null>
  loadTeams(leagueId: string): Promise<RawTeamRow[]>
  loadRosters(leagueId: string): Promise<RawRosterRow[]>
  loadPerformances(teamIds: string[], season: number): Promise<RawPerformanceRow[]>
}

export const defaultCanonicalWorldPort: CanonicalWorldPort = {
  async loadLeague(leagueId) {
    const row = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        sport: true,
        season: true,
        scoring: true,
        scoringPresetId: true,
        leagueType: true,
        isDynasty: true,
        rosterSize: true,
        starters: true,
        irSlots: true,
        taxiSlots: true,
        waiverType: true,
        waiverBudget: true,
        waiverMinBid: true,
        waiverHours: true,
        tradeReviewHours: true,
        tradeDeadlineWeek: true,
        draftPickTrading: true,
        settings: true,
        lastSyncedAt: true,
        syncStatus: true,
        platform: true,
        platformLeagueId: true,
      },
    })
    if (!row) return null
    return {
      id: row.id,
      sport: String(row.sport),
      season: row.season,
      scoring: row.scoring ?? null,
      scoringPresetId: row.scoringPresetId ?? null,
      leagueType: row.leagueType ?? null,
      isDynasty: row.isDynasty,
      rosterSize: row.rosterSize ?? null,
      starters: row.starters ?? null,
      irSlots: row.irSlots ?? null,
      taxiSlots: row.taxiSlots ?? null,
      waiverType: row.waiverType ?? null,
      waiverBudget: row.waiverBudget ?? null,
      waiverMinBid: row.waiverMinBid ?? null,
      waiverHours: row.waiverHours ?? null,
      tradeReviewHours: row.tradeReviewHours ?? null,
      tradeDeadlineWeek: row.tradeDeadlineWeek ?? null,
      draftPickTrading: row.draftPickTrading ?? null,
      settings: row.settings ?? null,
      lastSyncedAt: row.lastSyncedAt ?? null,
      syncStatus: row.syncStatus ?? null,
      platform: row.platform ?? null,
      platformLeagueId: row.platformLeagueId ?? null,
    }
  },

  async loadTeams(leagueId) {
    const rows = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: {
        id: true,
        externalId: true,
        ownerName: true,
        teamName: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        currentRank: true,
        role: true,
        isOrphan: true,
        isCommissioner: true,
        isCoCommissioner: true,
        platformUserId: true,
        claimedByUserId: true,
      },
    })
    return rows.map((row: {
      id: string
      externalId: string | null
      ownerName: string | null
      teamName: string | null
      wins: number | null
      losses: number | null
      ties: number | null
      pointsFor: number | null
      pointsAgainst: number | null
      currentRank: number | null
      role: string | null
      isOrphan: boolean | null
      isCommissioner: boolean | null
      isCoCommissioner: boolean | null
      platformUserId: string | null
      claimedByUserId: string | null
    }) => ({
      id: row.id,
      externalId: row.externalId ?? '',
      ownerName: row.ownerName ?? '',
      teamName: row.teamName ?? '',
      wins: row.wins ?? 0,
      losses: row.losses ?? 0,
      ties: row.ties ?? 0,
      pointsFor: row.pointsFor ?? 0,
      pointsAgainst: row.pointsAgainst ?? 0,
      currentRank: row.currentRank ?? null,
      role: row.role ?? 'member',
      isOrphan: row.isOrphan ?? false,
      isCommissioner: row.isCommissioner ?? false,
      isCoCommissioner: row.isCoCommissioner ?? false,
      platformUserId: row.platformUserId ?? null,
      claimedByUserId: row.claimedByUserId ?? null,
    }))
  },

  async loadRosters(leagueId) {
    // Source 1 — canonical `Roster.playerData` (imported leagues + some native AF leagues).
    const rows = await prisma.roster.findMany({
      where: { leagueId },
      select: {
        id: true,
        platformUserId: true,
        playerData: true,
        faabRemaining: true,
        waiverPriority: true,
        settings: true,
      },
    })
    const canonical: RawRosterRow[] = rows.map((row: {
      id: string
      platformUserId: string | null
      playerData: unknown
      faabRemaining: number | null
      waiverPriority: number | null
      settings: unknown
    }) => ({
      id: row.id,
      platformUserId: row.platformUserId ?? '',
      playerData: row.playerData ?? null,
      faabRemaining: row.faabRemaining ?? null,
      waiverPriority: row.waiverPriority ?? null,
      settings: row.settings ?? null,
      sourceModel: 'Roster',
    }))

    // Source 2 — native redraft `RedraftRoster` / `RedraftRosterPlayer` (read-only; only non-dropped
    // players). Projected into the SAME RawRosterRow shape, then unioned with canonical (Roster wins on
    // owner conflict). See ADR_CANONICAL_WORLD_REDRAFT_COVERAGE.md. This NEVER calls the write-prone
    // `resolveRedraftRosterLookup`; it reads the rows directly with a `findMany`.
    const redraftRows = await prisma.redraftRoster.findMany({
      where: { leagueId },
      select: {
        id: true,
        ownerId: true,
        faabBalance: true,
        waiverPriority: true,
        players: {
          where: { droppedAt: null },
          select: { playerId: true, slotType: true },
        },
      },
    })
    const redraft: RawRosterRow[] = redraftRows.map((row: RawRedraftRosterRow) =>
      mapRedraftRosterRowToRawRoster(row),
    )

    return unionRosterRows(canonical, redraft)
  },

  async loadPerformances(teamIds, season) {
    if (teamIds.length === 0) return []
    const rows = await prisma.teamPerformance.findMany({
      where: { teamId: { in: teamIds }, season },
      select: {
        teamId: true,
        week: true,
        season: true,
        points: true,
        opponent: true,
        result: true,
      },
    })
    return rows.map((row: {
      teamId: string
      week: number
      season: number
      points: number | null
      opponent: string | null
      result: string | null
    }) => ({
      teamId: row.teamId,
      week: row.week,
      season: row.season,
      points: row.points ?? 0,
      opponent: row.opponent ?? null,
      result: row.result ?? null,
    }))
  },
}

/**
 * READ-ONLY player-metadata read for the canonical enrichment seam (lib/decision-os/world/playerMetadata).
 *
 * Resolves raw canonical roster ids (provider ids for imported leagues, native ids for AF leagues) to
 * persisted player rows from the SportsPlayer cache — the SAME table + key the existing imported-league
 * lineup scan reads (lib/lineup-actions/sleeperLineupScan.ts). This is a single `findMany` ONLY: it never
 * writes, never warms the cache, and NEVER calls a live provider API (it reads only already-persisted
 * rows; the live Sleeper players endpoint in players-cache.ts is deliberately NOT touched). Freshest row
 * per id wins (orderBy fetchedAt desc) so the projector's first-write-wins keeps the latest.
 */
export async function loadPlayerMetadataRows(
  sport: string,
  ids: string[],
): Promise<RawPlayerMetadataRow[]> {
  const clean = Array.from(new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))).slice(0, 200)
  if (clean.length === 0) return []
  const rows = await prisma.sportsPlayer.findMany({
    where: { sport, OR: [{ externalId: { in: clean } }, { sleeperId: { in: clean } }] },
    orderBy: { fetchedAt: 'desc' },
    select: {
      externalId: true,
      sleeperId: true,
      name: true,
      position: true,
      team: true,
      status: true,
      source: true,
    },
  })
  return rows.map(
    (row: {
      externalId: string
      sleeperId: string | null
      name: string | null
      position: string | null
      team: string | null
      status: string | null
      source: string | null
    }) => ({
      externalId: row.externalId,
      sleeperId: row.sleeperId ?? null,
      name: row.name ?? null,
      position: row.position ?? null,
      team: row.team ?? null,
      status: row.status ?? null,
      source: row.source ?? null,
    }),
  )
}

function cleanScheduleSeason(input: string | number): string {
  const raw = String(input ?? '').trim()
  return raw.includes('-') ? raw.split('-')[0]! : raw
}

function cleanScheduleTeam(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  return trimmed ? trimmed : null
}

function scheduleGameKey(row: Pick<RawScheduleGameRow, 'week' | 'homeTeam' | 'awayTeam'>): string {
  return `${row.week}|${cleanScheduleTeam(row.homeTeam) ?? ''}|${cleanScheduleTeam(row.awayTeam) ?? ''}`
}

/**
 * READ-ONLY season-schedule read for the F2.2 schedule/bye enrichment seam.
 *
 * Reads ONLY already-persisted schedule rows. Preference order:
 *   1. `FantasyScheduleGame` (canonical fantasy cache: source + fetchedAt + expiresAt)
 *   2. `GameSchedule` (generic schedule cache fallback: updatedAt only)
 *
 * The first row per normalized matchup key wins, so fantasy-cache rows shadow generic schedule rows when
 * both exist. NO writes, NO refreshes, NO provider API calls.
 */
export async function loadScheduleGameRows(
  sport: string,
  season: number,
  teamKeys?: string[],
): Promise<RawScheduleGameRow[]> {
  const cleanSport = String(sport ?? '').trim().toUpperCase()
  if (!cleanSport) return []
  const cleanTeams = Array.from(
    new Set(
      (teamKeys ?? [])
        .map((value) => cleanScheduleTeam(value))
        .filter((value): value is string => Boolean(value)),
    ),
  )

  const fantasyWhere =
    cleanTeams.length > 0
      ? {
          sport: cleanSport,
          season: cleanScheduleSeason(season),
          OR: [{ homeTeam: { in: cleanTeams } }, { awayTeam: { in: cleanTeams } }],
        }
      : { sport: cleanSport, season: cleanScheduleSeason(season) }

  const gameWhere =
    cleanTeams.length > 0
      ? {
          sportType: cleanSport,
          season,
          OR: [{ homeTeam: { in: cleanTeams } }, { awayTeam: { in: cleanTeams } }],
        }
      : { sportType: cleanSport, season }

  const [fantasyRows, gameRows] = await Promise.all([
    prisma.fantasyScheduleGame.findMany({
      where: fantasyWhere,
      orderBy: [{ week: 'asc' }, { fetchedAt: 'desc' }],
      select: {
        sport: true,
        season: true,
        week: true,
        homeTeam: true,
        awayTeam: true,
        kickoffTime: true,
        status: true,
        source: true,
        fetchedAt: true,
        expiresAt: true,
        updatedAt: true,
      },
    }),
    prisma.gameSchedule.findMany({
      where: gameWhere,
      orderBy: [{ weekOrRound: 'asc' }, { updatedAt: 'desc' }],
      select: {
        sportType: true,
        season: true,
        weekOrRound: true,
        homeTeam: true,
        awayTeam: true,
        startTime: true,
        status: true,
        updatedAt: true,
      },
    }),
  ])

  const combined: RawScheduleGameRow[] = [
    ...fantasyRows.map((row: {
      sport: string
      season: string
      week: number
      homeTeam: string
      awayTeam: string
      kickoffTime: Date | null
      status: string | null
      source: string
      fetchedAt: Date
      expiresAt: Date
      updatedAt: Date
    }) => ({
      sport: cleanSport,
      season: Number.parseInt(cleanScheduleSeason(row.season), 10) || season,
      week: row.week,
      homeTeam: cleanScheduleTeam(row.homeTeam),
      awayTeam: cleanScheduleTeam(row.awayTeam),
      kickoffTime: row.kickoffTime ?? null,
      status: row.status ?? null,
      source: row.source ?? null,
      fetchedAt: row.fetchedAt ?? null,
      expiresAt: row.expiresAt ?? null,
      updatedAt: row.updatedAt ?? null,
      sourceModel: 'FantasyScheduleGame' as const,
    })),
    ...gameRows.map((row: {
      sportType: string
      season: number
      weekOrRound: number
      homeTeam: string | null
      awayTeam: string | null
      startTime: Date | null
      status: string
      updatedAt: Date
    }) => ({
      sport: cleanSport,
      season: row.season,
      week: row.weekOrRound,
      homeTeam: cleanScheduleTeam(row.homeTeam),
      awayTeam: cleanScheduleTeam(row.awayTeam),
      kickoffTime: row.startTime ?? null,
      status: row.status ?? null,
      source: null,
      fetchedAt: null,
      expiresAt: null,
      updatedAt: row.updatedAt ?? null,
      sourceModel: 'GameSchedule' as const,
    })),
  ]

  const deduped = new Map<string, RawScheduleGameRow>()
  for (const row of combined) {
    if (row.week <= 0) continue
    const key = scheduleGameKey(row)
    if (!deduped.has(key)) deduped.set(key, row)
  }
  return [...deduped.values()].sort((a, b) => a.week - b.week)
}

/**
 * READ-ONLY injury-context read for the F2.3 injury/availability enrichment seam.
 *
 * Reads the SAME SportsPlayer cache as F2.1 player metadata but selects freshness fields
 * (fetchedAt / expiresAt / updatedAt) that the F2.1 read does not include. One `findMany` only —
 * no writes, no cache warming, no live API calls. Freshest row per id wins (orderBy fetchedAt desc).
 */
export async function loadInjuryContextRows(
  sport: string,
  ids: string[],
): Promise<RawInjuryContextRow[]> {
  const clean = Array.from(new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))).slice(0, 200)
  if (clean.length === 0) return []
  const rows = await prisma.sportsPlayer.findMany({
    where: { sport, OR: [{ externalId: { in: clean } }, { sleeperId: { in: clean } }] },
    orderBy: { fetchedAt: 'desc' },
    select: {
      externalId: true,
      sleeperId: true,
      status: true,
      source: true,
      fetchedAt: true,
      expiresAt: true,
      updatedAt: true,
    },
  })
  return rows.map(
    (row: {
      externalId: string
      sleeperId: string | null
      status: string | null
      source: string | null
      fetchedAt: Date
      expiresAt: Date
      updatedAt: Date
    }) => ({
      externalId: row.externalId,
      sleeperId: row.sleeperId ?? null,
      status: row.status ?? null,
      source: row.source ?? null,
      fetchedAt: row.fetchedAt ?? null,
      expiresAt: row.expiresAt ?? null,
      updatedAt: row.updatedAt ?? null,
    }),
  )
}
