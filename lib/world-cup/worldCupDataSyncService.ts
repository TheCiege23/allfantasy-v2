import "server-only"
import { prisma } from "@/lib/prisma"
import { recalculateWorldCupChallenge } from "./worldCupScoringService"
import {
  getWorldCupDataProvider,
  WorldCupProviderConfigError,
  type WorldCupProviderName,
  type WorldCupProviderTeam,
  type WorldCupProviderFixture,
  type WorldCupProviderGroupStanding,
} from "./worldCupDataProvider"
import { normalizeWorldCupRound } from "./apiSportsWorldCup"
import { normalizeFifaTeamCode } from "./worldCupSeedData"
import type { WorldCupRound } from "./types"
import { emitWorldCupMatchTransitionEvents } from "./worldCupBracketLiveEventHooks"
import { getBestThirdPlaceTeams, type WorldCupGroupStanding } from "./worldCupGroupResolver"

// ── Shared option types ───────────────────────────────────────────────────────

export type WorldCupSyncOptions = {
  provider?: WorldCupProviderName | string | null
  dryRun?: boolean
  seasonYear?: number
}

export type WorldCupOfficialGroupsReadiness = {
  ready: boolean
  assignedTeams: number
  incompleteGroups: Array<{ groupName: string; teamCount: number; missingTeams: number }>
}

// ── Team sync ────────────────────────────────────────────────────────────────

export type WorldCupTeamSyncResult = {
  created: number
  updated: number
  skipped: number
  warnings: string[]
  teams: Array<{ id?: string; providerId: string; name: string; action: "created" | "updated" | "skipped" | "error" }>
}

export async function syncWorldCupTeams(
  options: WorldCupSyncOptions = {}
): Promise<WorldCupTeamSyncResult> {
  const { dryRun = false, seasonYear = 2026 } = options
  const result: WorldCupTeamSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
    teams: [],
  }

  let providerTeams: WorldCupProviderTeam[]
  try {
    const provider = await getWorldCupDataProvider(options.provider)
    providerTeams = await provider.getTeams(seasonYear)
  } catch (err) {
    if (err instanceof WorldCupProviderConfigError) {
      result.warnings.push(err.message)
      return result
    }
    throw err
  }

  if (providerTeams.length === 0) {
    result.warnings.push(
      "Provider returned 0 teams. Check provider configuration and season year."
    )
    return result
  }

  for (const team of providerTeams) {
    try {
      const apiTeamId =
        team.providerId && !Number.isNaN(Number(team.providerId))
          ? Number(team.providerId)
          : null
      const fifaCode = normalizeFifaTeamCode(team.fifaCode)

      // Find existing record for deduplication
      const existing = apiTeamId
        ? await (prisma as any).worldCupTeam.findUnique({
            where: { apiTeamId },
            select: { id: true },
          })
        : fifaCode
        ? await (prisma as any).worldCupTeam.findFirst({
            where: { fifaCode },
            select: { id: true },
          })
        : null

      if (dryRun) {
        result.teams.push({
          providerId: team.providerId,
          name: team.displayName,
          action: existing ? "updated" : "created",
        })
        if (existing) result.updated++
        else result.created++
        continue
      }

      const upsertData = {
        name: team.displayName,
        country: team.countryName,
        fifaCode: fifaCode ?? undefined,
        flagUrl: team.flagUrl ?? undefined,
        logoUrl: team.flagUrl ?? undefined,
        groupName: team.groupName ?? undefined,
        qualificationStatus: team.qualificationStatus ?? "qualified",
        sourcePayload: (team as any).raw ?? undefined,
      }

      let dbId: string
      if (apiTeamId) {
        const row = await (prisma as any).worldCupTeam.upsert({
          where: { apiTeamId },
          create: { apiTeamId, ...upsertData },
          update: { ...upsertData, updatedAt: new Date() },
          select: { id: true },
        })
        dbId = row.id
      } else if (existing) {
        const row = await (prisma as any).worldCupTeam.update({
          where: { id: existing.id },
          data: { ...upsertData, updatedAt: new Date() },
          select: { id: true },
        })
        dbId = row.id
      } else {
        const row = await (prisma as any).worldCupTeam.create({
          data: upsertData,
          select: { id: true },
        })
        dbId = row.id
      }

      result.teams.push({
        id: dbId,
        providerId: team.providerId,
        name: team.displayName,
        action: existing ? "updated" : "created",
      })
      if (existing) result.updated++
      else result.created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.warnings.push(`Team ${team.displayName} (${team.providerId}): ${msg}`)
      result.teams.push({
        providerId: team.providerId,
        name: team.displayName,
        action: "error",
      })
    }
  }

  return result
}

export async function getWorldCupOfficialGroupsReadiness(
  options: Pick<WorldCupSyncOptions, "seasonYear"> = {}
): Promise<WorldCupOfficialGroupsReadiness> {
  void options.seasonYear
  const rows = await (prisma as any).worldCupTeam.groupBy({
    by: ["groupName"],
    where: {
      groupName: { not: null },
      qualificationStatus: { not: "test" },
    },
    _count: { _all: true },
  })

  const counts = new Map<string, number>()
  for (const row of rows as Array<{ groupName: string | null; _count: { _all: number } }>) {
    if (row.groupName) counts.set(row.groupName, row._count._all)
  }

  const groupNames = Array.from({ length: 12 }, (_, index) =>
    String.fromCharCode("A".charCodeAt(0) + index)
  )
  const incompleteGroups = groupNames
    .map((groupName) => {
      const teamCount = counts.get(groupName) ?? 0
      return { groupName, teamCount, missingTeams: Math.max(0, 4 - teamCount) }
    })
    .filter((group) => group.missingTeams > 0)
  const assignedTeams = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)

  return {
    ready: assignedTeams >= 48 && incompleteGroups.length === 0,
    assignedTeams,
    incompleteGroups,
  }
}

// ── Fixture sync ──────────────────────────────────────────────────────────────

export type WorldCupFixtureSyncResult = {
  created: number
  updated: number
  skipped: number
  officialFixturesCreated?: number
  officialFixturesUpdated?: number
  bracketMatchesUpdated?: number
  warnings: string[]
  lockTimeInferred: string | null
  fixtures: Array<{
    providerId: string
    matchId?: string
    action: "updated" | "skipped" | "no_match" | "error"
  }>
}

export type WorldCupGroupStandingsSyncResult = {
  created: number
  updated: number
  skipped: number
  warnings: string[]
  groupsComplete: boolean
  thirdPlaceAdvancers: Array<{ teamId: string; teamName: string; groupName: string }>
  standings: Array<{ teamId?: string; teamName: string; groupName: string; rank: number; action: "created" | "updated" | "skipped" | "error" }>
}

const WORLD_CUP_TOURNAMENT_KEY = "fifa_world_cup"

function providerNameFor(options: WorldCupSyncOptions) {
  return (options.provider ?? process.env.WORLD_CUP_DATA_PROVIDER ?? "mock").toString()
}

function dateOrNull(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function findTeamIdByProviderOrName(input: {
  providerId?: string | null
  name?: string | null
  fifaCode?: string | null
}) {
  const apiTeamId =
    input.providerId && !Number.isNaN(Number(input.providerId))
      ? Number(input.providerId)
      : null
  if (apiTeamId) {
    const row = await (prisma as any).worldCupTeam.findUnique({
      where: { apiTeamId },
      select: { id: true },
    })
    if (row?.id) return row.id as string
  }

  const fifaCode = normalizeFifaTeamCode(input.fifaCode)
  if (fifaCode) {
    const row = await (prisma as any).worldCupTeam.findFirst({
      where: { fifaCode },
      select: { id: true },
    })
    if (row?.id) return row.id as string
  }

  if (input.name?.trim()) {
    const row = await (prisma as any).worldCupTeam.findFirst({
      where: { name: { equals: input.name.trim(), mode: "insensitive" } },
      select: { id: true },
    })
    if (row?.id) return row.id as string
  }

  return null
}

function isBracketRound(round: WorldCupRound | null) {
  return Boolean(round)
}

function groupStandingsComplete(rows: WorldCupProviderGroupStanding[]) {
  const groups = new Map<string, Set<number>>()
  for (const row of rows) {
    if (!row.groupName || !Number.isInteger(row.rank)) continue
    const ranks = groups.get(row.groupName) ?? new Set<number>()
    ranks.add(row.rank)
    groups.set(row.groupName, ranks)
  }

  if (groups.size < 12) return false
  for (const ranks of groups.values()) {
    if (![1, 2, 3, 4].every((rank) => ranks.has(rank))) return false
  }
  return true
}

async function upsertOfficialWorldCupFixtures(input: {
  fixtures: WorldCupProviderFixture[]
  providerName: string
  seasonYear: number
  dryRun: boolean
}) {
  let created = 0
  let updated = 0
  const rows: Array<{ providerId: string; action: "created" | "updated" | "skipped" | "error"; officialFixtureId?: string }> = []
  const warnings: string[] = []

  for (const fixture of input.fixtures) {
    try {
      const existing = await (prisma as any).worldCupOfficialFixture.findUnique({
        where: {
          providerName_seasonYear_providerFixtureId: {
            providerName: input.providerName,
            seasonYear: input.seasonYear,
            providerFixtureId: fixture.providerId,
          },
        },
        select: { id: true },
      })

      if (input.dryRun) {
        rows.push({ providerId: fixture.providerId, action: existing ? "updated" : "created" })
        if (existing) updated++
        else created++
        continue
      }

      const [homeTeamId, awayTeamId, winnerTeamId] = await Promise.all([
        findTeamIdByProviderOrName({ providerId: fixture.homeProviderId, name: fixture.homeName, fifaCode: fixture.homeFifaCode }),
        findTeamIdByProviderOrName({ providerId: fixture.awayProviderId, name: fixture.awayName, fifaCode: fixture.awayFifaCode }),
        findTeamIdByProviderOrName({ providerId: fixture.winnerProviderId, name: fixture.winnerName, fifaCode: fixture.winnerFifaCode }),
      ])
      const round = fixture.roundName ? normalizeWorldCupRound(fixture.roundName) : null
      const data = {
        tournamentKey: WORLD_CUP_TOURNAMENT_KEY,
        round,
        stage: fixture.stage ?? fixture.roundName ?? null,
        groupName: fixture.groupName ?? null,
        startsAt: dateOrNull(fixture.startsAt),
        status: normalizeProviderStatus(fixture.status),
        apiStatusShort: fixture.apiStatusShort ?? null,
        elapsedMinute: fixture.elapsedMinute ?? null,
        injuryTime: fixture.injuryTime ?? null,
        period: fixture.period ?? null,
        venueName: fixture.venueName ?? null,
        venueCity: fixture.venueCity ?? null,
        homeTeamId,
        awayTeamId,
        winnerTeamId,
        homeProviderId: fixture.homeProviderId ?? null,
        awayProviderId: fixture.awayProviderId ?? null,
        winnerProviderId: fixture.winnerProviderId ?? null,
        homeTeamName: fixture.homeName ?? null,
        awayTeamName: fixture.awayName ?? null,
        winnerTeamName: fixture.winnerName ?? null,
        homeTeamLogo: fixture.homeLogo ?? null,
        awayTeamLogo: fixture.awayLogo ?? null,
        homeScore: fixture.homeScore ?? null,
        awayScore: fixture.awayScore ?? null,
        homePenaltyScore: fixture.homePenaltyScore ?? null,
        awayPenaltyScore: fixture.awayPenaltyScore ?? null,
        sourcePayload: fixture.raw ? (fixture.raw as object) : undefined,
      }

      const row = await (prisma as any).worldCupOfficialFixture.upsert({
        where: {
          providerName_seasonYear_providerFixtureId: {
            providerName: input.providerName,
            seasonYear: input.seasonYear,
            providerFixtureId: fixture.providerId,
          },
        },
        create: {
          providerName: input.providerName,
          providerFixtureId: fixture.providerId,
          seasonYear: input.seasonYear,
          ...data,
        },
        update: { ...data, updatedAt: new Date() },
        select: { id: true },
      })

      rows.push({ providerId: fixture.providerId, action: existing ? "updated" : "created", officialFixtureId: row.id })
      if (existing) updated++
      else created++
    } catch (err) {
      rows.push({ providerId: fixture.providerId, action: "error" })
      warnings.push(`Fixture ${fixture.providerId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { created, updated, rows, warnings }
}

export async function syncWorldCupFixtures(
  options: WorldCupSyncOptions & {
    challengeId?: string
    upsert?: boolean
  } = {}
): Promise<WorldCupFixtureSyncResult> {
  const { dryRun = false, seasonYear = 2026, challengeId, upsert = true } =
    options

  const result: WorldCupFixtureSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    officialFixturesCreated: 0,
    officialFixturesUpdated: 0,
    bracketMatchesUpdated: 0,
    warnings: [],
    lockTimeInferred: null,
    fixtures: [],
  }

  let providerFixtures: WorldCupProviderFixture[]
  try {
    const provider = await getWorldCupDataProvider(options.provider)
    providerFixtures = await provider.getFixtures(seasonYear)
  } catch (err) {
    if (err instanceof WorldCupProviderConfigError) {
      result.warnings.push(err.message)
      return result
    }
    throw err
  }

  if (providerFixtures.length === 0) {
    result.warnings.push(
      "Provider returned 0 fixtures. Check provider configuration."
    )
    return result
  }

  const providerName = providerNameFor(options)
  const officialSync = await upsertOfficialWorldCupFixtures({
    fixtures: providerFixtures,
    providerName,
    seasonYear,
    dryRun,
  })
  result.created += officialSync.created
  result.updated += officialSync.updated
  result.officialFixturesCreated = officialSync.created
  result.officialFixturesUpdated = officialSync.updated
  result.warnings.push(...officialSync.warnings)
  result.fixtures.push(...officialSync.rows)

  // Determine which challenges to update
  const challengeIds: string[] = challengeId
    ? [challengeId]
    : await (prisma as any).worldCupBracketChallenge
        .findMany({
          where: { status: { in: ["open", "locked", "live"] } },
          select: { id: true },
        })
        .then((rows: Array<{ id: string }>) => rows.map((r) => r.id))

  // Build a round → [fixtures] map for fallback matching
  const byRound = new Map<WorldCupRound, WorldCupProviderFixture[]>()
  for (const f of providerFixtures) {
    const round = f.roundName
      ? normalizeWorldCupRound(f.roundName as string)
      : null
    if (!round) continue
    const arr = byRound.get(round) ?? []
    arr.push(f)
    byRound.set(round, arr)
  }

  // Infer earliest start time for lock time suggestion
  const starts = providerFixtures
    .map((f) => f.startsAt)
    .filter(Boolean)
    .sort()
  const earliestStart = starts[0] ?? null

  for (const cid of challengeIds) {
    const challenge = await (prisma as any).worldCupBracketChallenge.findUnique({
      where: { id: cid },
      select: {
        id: true,
        pickLockAt: true,
        matches: { orderBy: { matchNumber: "asc" } },
      },
    })
    if (!challenge) continue

    // Auto-infer lock time if not set
    if (
      !challenge.pickLockAt &&
      earliestStart &&
      !dryRun &&
      challengeId // only when explicit challenge is given to avoid mass-updates
    ) {
      await (prisma as any).worldCupBracketChallenge.update({
        where: { id: cid },
        data: { pickLockAt: new Date(earliestStart) },
      })
      result.lockTimeInferred = earliestStart
    } else if (!challenge.pickLockAt && earliestStart) {
      result.lockTimeInferred = earliestStart // report even on dry-run
    }

    for (const f of providerFixtures) {
      const round = f.roundName
        ? normalizeWorldCupRound(f.roundName as string)
        : null
      const apiFixtureId = Number(f.providerId)

      // Find existing match: by apiFixtureId first, then by round+slot
      let match = !Number.isNaN(apiFixtureId)
        ? (challenge.matches as any[]).find(
            (m: any) => m.apiFixtureId === apiFixtureId
          )
        : null

      if (!match && round) {
        const roundFixtures = byRound.get(round) ?? []
        const idx = roundFixtures.findIndex(
          (rf) => rf.providerId === f.providerId
        )
        match = (challenge.matches as any[]).find(
          (m: any) => m.round === round && m.roundIndex === idx + 1
        )
      }

      if (!match) {
        if (isBracketRound(round)) {
          result.fixtures.push({ providerId: f.providerId, action: "no_match" })
          result.skipped++
        }
        continue
      }

      if (!upsert) {
        result.fixtures.push({
          providerId: f.providerId,
          matchId: match.id,
          action: "skipped",
        })
        result.skipped++
        continue
      }

      // Resolve team DB IDs
      const homeApiId = f.homeProviderId
        ? Number(f.homeProviderId)
        : null
      const awayApiId = f.awayProviderId
        ? Number(f.awayProviderId)
        : null

      let homeTeamId: string | null = match.homeTeamId
      let awayTeamId: string | null = match.awayTeamId

      if (homeApiId && !Number.isNaN(homeApiId)) {
        const t = await (prisma as any).worldCupTeam.findUnique({
          where: { apiTeamId: homeApiId },
          select: { id: true },
        })
        if (t) homeTeamId = t.id
        else if (f.homeName) {
          // Auto-upsert team
          const created = await (prisma as any).worldCupTeam.upsert({
            where: { apiTeamId: homeApiId },
            create: {
              apiTeamId: homeApiId,
              name: f.homeName,
              country: f.homeName,
              flagUrl: f.homeLogo ?? null,
              logoUrl: f.homeLogo ?? null,
              qualificationStatus: "qualified",
            },
            update: {
              name: f.homeName,
              flagUrl: f.homeLogo ?? null,
              logoUrl: f.homeLogo ?? null,
            },
            select: { id: true },
          })
          homeTeamId = created.id
        }
      }

      if (awayApiId && !Number.isNaN(awayApiId)) {
        const t = await (prisma as any).worldCupTeam.findUnique({
          where: { apiTeamId: awayApiId },
          select: { id: true },
        })
        if (t) awayTeamId = t.id
        else if (f.awayName) {
          const created = await (prisma as any).worldCupTeam.upsert({
            where: { apiTeamId: awayApiId },
            create: {
              apiTeamId: awayApiId,
              name: f.awayName,
              country: f.awayName,
              flagUrl: f.awayLogo ?? null,
              logoUrl: f.awayLogo ?? null,
              qualificationStatus: "qualified",
            },
            update: {
              name: f.awayName,
              flagUrl: f.awayLogo ?? null,
              logoUrl: f.awayLogo ?? null,
            },
            select: { id: true },
          })
          awayTeamId = created.id
        }
      }

      // Resolve winner team ID
      let winnerTeamId: string | null = null
      if (f.winnerProviderId) {
        const wApiId = Number(f.winnerProviderId)
        if (!Number.isNaN(wApiId)) {
          const t = await (prisma as any).worldCupTeam.findUnique({
            where: { apiTeamId: wApiId },
            select: { id: true },
          })
          winnerTeamId = t?.id ?? null
        }
      }

      const normalStatus = normalizeProviderStatus(f.status)
      const updateData: Record<string, unknown> = {
        homeTeamId: homeTeamId ?? undefined,
        awayTeamId: awayTeamId ?? undefined,
        homeTeamName: f.homeName ?? undefined,
        awayTeamName: f.awayName ?? undefined,
        homeTeamLogo: f.homeLogo ?? undefined,
        awayTeamLogo: f.awayLogo ?? undefined,
        startsAt: f.startsAt ? new Date(f.startsAt) : undefined,
        venueName: f.venueName ?? undefined,
        venueCity: f.venueCity ?? undefined,
        status: normalStatus,
        apiStatusShort: f.apiStatusShort ?? undefined,
        winnerTeamId: winnerTeamId ?? undefined,
        winnerTeamName: f.winnerName ?? undefined,
        sourcePayload: f.raw ? (f.raw as object) : undefined,
        updatedAt: new Date(),
      }
      if (!Number.isNaN(apiFixtureId)) {
        updateData.apiFixtureId = apiFixtureId
      }

      if (dryRun) {
        result.fixtures.push({
          providerId: f.providerId,
          matchId: match.id,
          action: "updated",
        })
        result.updated++
        continue
      }

      await (prisma as any).worldCupBracketMatch.update({
        where: { id: match.id },
        data: updateData,
      })

      result.fixtures.push({
        providerId: f.providerId,
        matchId: match.id,
        action: "updated",
      })
      result.updated++
      result.bracketMatchesUpdated = (result.bracketMatchesUpdated ?? 0) + 1
    }
  }

  return result
}

// ── Live score sync ────────────────────────────────────────────────────────────

export type WorldCupLiveScoreSyncResult = {
  updated: number
  skipped: number
  finalMatches: number
  warnings: string[]
  recalculated: boolean
}

/**
 * Applies provider fixture rows to a challenge's matches (by apiFixtureId).
 * Shared by legacy single-provider sync and multi-provider fallback sync.
 */
export async function applyWorldCupLiveFixturesToChallenge(
  challengeId: string,
  liveFixtures: WorldCupProviderFixture[],
  options: { dryRun?: boolean; recalculate?: boolean } = {}
): Promise<WorldCupLiveScoreSyncResult> {
  const { dryRun = false, recalculate = true } = options

  const result: WorldCupLiveScoreSyncResult = {
    updated: 0,
    skipped: 0,
    finalMatches: 0,
    warnings: [],
    recalculated: false,
  }

  if (liveFixtures.length === 0) {
    result.warnings.push("No live/updated fixtures to apply.")
    return result
  }

  const challenge = await (prisma as any).worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: { matches: { orderBy: { matchNumber: "asc" } } },
  })
  if (!challenge) {
    result.warnings.push(`Challenge ${challengeId} not found.`)
    return result
  }

  let hadFinalUpdate = false

  for (const f of liveFixtures) {
    const apiFixtureId = Number(f.providerId)
    const match = !Number.isNaN(apiFixtureId)
      ? (challenge.matches as any[]).find(
          (m: any) => m.apiFixtureId === apiFixtureId
        )
      : null

    if (!match) {
      result.skipped++
      continue
    }

    const normalStatus = normalizeProviderStatus(f.status)

    let winnerTeamId: string | null = match.winnerTeamId ?? null
    if (normalStatus === "final" && f.winnerProviderId) {
      const wApiId = Number(f.winnerProviderId)
      if (!Number.isNaN(wApiId)) {
        const t = await (prisma as any).worldCupTeam.findUnique({
          where: { apiTeamId: wApiId },
          select: { id: true },
        })
        winnerTeamId = t?.id ?? winnerTeamId
      }
    }

    const scoreData: Record<string, unknown> = {
      status: normalStatus,
      homeScore: f.homeScore ?? undefined,
      awayScore: f.awayScore ?? undefined,
      homePenaltyScore: f.homePenaltyScore ?? undefined,
      awayPenaltyScore: f.awayPenaltyScore ?? undefined,
      elapsedMinute: f.elapsedMinute ?? undefined,
      injuryTime: f.injuryTime ?? undefined,
      period: f.period ?? undefined,
      apiStatusShort: f.apiStatusShort ?? undefined,
      lastScoreSyncedAt: new Date(),
      updatedAt: new Date(),
    }
    if (normalStatus === "final") {
      scoreData.winnerTeamId = winnerTeamId
      scoreData.winnerTeamName = f.winnerName ?? undefined
      hadFinalUpdate = true
    }

    if (dryRun) {
      result.updated++
      if (normalStatus === "final") result.finalMatches++
      continue
    }

    const prevSnap = {
      id: match.id,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      status: typeof match.status === "string" ? match.status : "scheduled",
      apiStatusShort: match.apiStatusShort ?? null,
      homeSlotKey: match.homeSlotKey ?? null,
      awaySlotKey: match.awaySlotKey ?? null,
      homeTeamId: match.homeTeamId ?? null,
      awayTeamId: match.awayTeamId ?? null,
      winnerTeamId: match.winnerTeamId ?? null,
    }

    const updated = await (prisma as any).worldCupBracketMatch.update({
      where: { id: match.id },
      data: scoreData,
    })

    if (!dryRun) {
      emitWorldCupMatchTransitionEvents({
        challengeId,
        prev: prevSnap,
        match: {
          id: updated.id,
          homeTeamName: updated.homeTeamName,
          awayTeamName: updated.awayTeamName,
          status: typeof updated.status === "string" ? updated.status : normalStatus,
          apiStatusShort: updated.apiStatusShort ?? null,
          homeSlotKey: updated.homeSlotKey ?? null,
          awaySlotKey: updated.awaySlotKey ?? null,
          homeTeamId: updated.homeTeamId ?? null,
          awayTeamId: updated.awayTeamId ?? null,
          winnerTeamId: updated.winnerTeamId ?? null,
        },
      })
    }

    if (normalStatus === "final") {
      result.finalMatches++
      if (updated.nextMatchId && updated.nextMatchSlot && winnerTeamId) {
        const slot = updated.nextMatchSlot === "home" ? "home" : "away"
        await (prisma as any).worldCupBracketMatch.update({
          where: { id: updated.nextMatchId },
          data: {
            [`${slot}TeamId`]: winnerTeamId,
            [`${slot}TeamName`]: f.winnerName ?? undefined,
            [`${slot}TeamLogo`]:
              winnerTeamId === updated.homeTeamId
                ? updated.homeTeamLogo
                : updated.awayTeamLogo,
          },
        })
      }
    }

    result.updated++
  }

  if (!dryRun && hadFinalUpdate && recalculate) {
    try {
      await recalculateWorldCupChallenge(challengeId)
      result.recalculated = true
    } catch (err) {
      result.warnings.push(
        `Recalculation triggered but failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return result
}

export async function syncWorldCupLiveScores(
  options: WorldCupSyncOptions & {
    challengeId: string
    recalculate?: boolean
  }
): Promise<WorldCupLiveScoreSyncResult> {
  const { dryRun = false, challengeId, recalculate = true, seasonYear = 2026 } =
    options

  let liveFixtures: WorldCupProviderFixture[]
  try {
    const provider = await getWorldCupDataProvider(options.provider)
    liveFixtures = provider.getLiveFixtures
      ? await provider.getLiveFixtures(seasonYear)
      : await provider.getFixtures(seasonYear)
  } catch (err) {
    if (err instanceof WorldCupProviderConfigError) {
      return {
        updated: 0,
        skipped: 0,
        finalMatches: 0,
        warnings: [err.message],
        recalculated: false,
      }
    }
    throw err
  }

  if (liveFixtures.length === 0) {
    return {
      updated: 0,
      skipped: 0,
      finalMatches: 0,
      warnings: ["No live/updated fixtures returned by provider."],
      recalculated: false,
    }
  }

  return applyWorldCupLiveFixturesToChallenge(challengeId, liveFixtures, {
    dryRun,
    recalculate,
  })
}

export async function syncWorldCupProviderGroupStandings(
  options: WorldCupSyncOptions & { challengeId: string }
): Promise<WorldCupGroupStandingsSyncResult> {
  const seasonYear = options.seasonYear ?? 2026
  const providerName = providerNameFor(options)
  const result: WorldCupGroupStandingsSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
    groupsComplete: false,
    thirdPlaceAdvancers: [],
    standings: [],
  }

  let providerStandings: WorldCupProviderGroupStanding[]
  try {
    const provider = await getWorldCupDataProvider(options.provider)
    if (!provider.getGroupStandings) {
      result.warnings.push("standings_not_available_yet: provider does not expose group standings.")
      return result
    }
    providerStandings = await provider.getGroupStandings(seasonYear)
  } catch (err) {
    if (err instanceof WorldCupProviderConfigError) {
      result.warnings.push(err.message)
      return result
    }
    throw err
  }

  if (providerStandings.length === 0) {
    result.warnings.push("standings_not_available_yet: provider returned 0 group standings rows.")
    return result
  }

  for (const standing of providerStandings) {
    const teamId = await findTeamIdByProviderOrName({
      providerId: standing.providerTeamId,
      fifaCode: standing.fifaCode,
      name: standing.teamName,
    })

    if (!teamId) {
      result.skipped++
      result.standings.push({
        teamName: standing.teamName,
        groupName: standing.groupName,
        rank: standing.rank,
        action: "skipped",
      })
      result.warnings.push(`Standing ${standing.groupName} ${standing.teamName}: team not found.`)
      continue
    }

    try {
      const existing = await (prisma as any).worldCupOfficialGroupStanding.findUnique({
        where: {
          providerName_seasonYear_groupName_teamId: {
            providerName,
            seasonYear,
            groupName: standing.groupName,
            teamId,
          },
        },
        select: { id: true },
      })

      if (options.dryRun) {
        result.standings.push({
          teamId,
          teamName: standing.teamName,
          groupName: standing.groupName,
          rank: standing.rank,
          action: existing ? "updated" : "created",
        })
        if (existing) result.updated++
        else result.created++
        continue
      }

      await (prisma as any).worldCupOfficialGroupStanding.upsert({
        where: {
          providerName_seasonYear_groupName_teamId: {
            providerName,
            seasonYear,
            groupName: standing.groupName,
            teamId,
          },
        },
        create: {
          providerName,
          seasonYear,
          tournamentKey: WORLD_CUP_TOURNAMENT_KEY,
          groupName: standing.groupName,
          teamId,
          providerTeamId: standing.providerTeamId ?? null,
          teamName: standing.teamName,
          actualRank: standing.rank,
          points: standing.points,
          goalDifference: standing.goalDifference,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst ?? 0,
          played: standing.played ?? 0,
          wins: standing.wins ?? 0,
          draws: standing.draws ?? 0,
          losses: standing.losses ?? 0,
          sourcePayload: standing.raw ? (standing.raw as object) : undefined,
        },
        update: {
          providerTeamId: standing.providerTeamId ?? null,
          teamName: standing.teamName,
          actualRank: standing.rank,
          points: standing.points,
          goalDifference: standing.goalDifference,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst ?? 0,
          played: standing.played ?? 0,
          wins: standing.wins ?? 0,
          draws: standing.draws ?? 0,
          losses: standing.losses ?? 0,
          sourcePayload: standing.raw ? (standing.raw as object) : undefined,
          updatedAt: new Date(),
        },
      })

      result.standings.push({
        teamId,
        teamName: standing.teamName,
        groupName: standing.groupName,
        rank: standing.rank,
        action: existing ? "updated" : "created",
      })
      if (existing) result.updated++
      else result.created++
    } catch (err) {
      result.standings.push({
        teamId,
        teamName: standing.teamName,
        groupName: standing.groupName,
        rank: standing.rank,
        action: "error",
      })
      result.warnings.push(`Standing ${standing.groupName} ${standing.teamName}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  result.groupsComplete = groupStandingsComplete(providerStandings)
  if (!result.groupsComplete) {
    result.warnings.push("standings_not_available_yet: complete 12-group standings are not available.")
    return result
  }

  const byGroup: Record<string, WorldCupGroupStanding[]> = {}
  for (const row of result.standings) {
    if (!row.teamId || row.action === "skipped" || row.action === "error") continue
    const providerRow = providerStandings.find((standing) => standing.groupName === row.groupName && standing.rank === row.rank && standing.teamName === row.teamName)
    if (!providerRow) continue
    byGroup[row.groupName] = byGroup[row.groupName] ?? []
    byGroup[row.groupName].push({
      group: row.groupName,
      teamId: row.teamId,
      teamName: row.teamName,
      points: providerRow.points,
      goalDifference: providerRow.goalDifference,
      goalsFor: providerRow.goalsFor,
    })
  }

  const advancers = getBestThirdPlaceTeams(byGroup).slice(0, 8)
  result.thirdPlaceAdvancers = advancers.map((row) => ({
    teamId: row.teamId,
    teamName: row.teamName,
    groupName: row.group,
  }))

  if (!options.dryRun) {
    await (prisma as any).worldCupOfficialGroupStanding.updateMany({
      where: { providerName, seasonYear },
      data: { isThirdPlaceAdvancer: false },
    })
    if (result.thirdPlaceAdvancers.length > 0) {
      await (prisma as any).worldCupOfficialGroupStanding.updateMany({
        where: {
          providerName,
          seasonYear,
          teamId: { in: result.thirdPlaceAdvancers.map((row) => row.teamId) },
        },
        data: { isThirdPlaceAdvancer: true },
      })
    }
  }

  if (result.thirdPlaceAdvancers.length !== 8) {
    result.warnings.push(`Expected 8 third-place advancers, found ${result.thirdPlaceAdvancers.length}.`)
  }

  return result
}

// ── Status normalization (internal) ───────────────────────────────────────────

/**
 * Maps provider status strings to the internal WorldCupMatchStatus type.
 * Exported for use in admin tools; canonical display formatting is in worldCupMatchStatus.ts.
 */
export function normalizeProviderStatus(
  raw?: string | null
): "scheduled" | "live" | "halftime" | "final" | "postponed" | "cancelled" {
  if (!raw) return "scheduled"
  const s = raw.toLowerCase().trim()
  if (s === "final" || s === "ft" || s === "aet" || s === "pen" || s === "ft_pen") return "final"
  if (s === "halftime" || s === "ht") return "halftime"
  if (s === "live" || s === "1h" || s === "2h" || s === "extra_time" || s === "et" || s === "penalties") return "live"
  if (s === "postponed" || s === "pst" || s === "susp" || s === "suspended" || s === "int") return "postponed"
  if (s === "cancelled" || s === "canc" || s === "abd" || s === "awd" || s === "wo") return "cancelled"
  // tbd, scheduled, ns, upcoming all map to scheduled
  return "scheduled"
}
