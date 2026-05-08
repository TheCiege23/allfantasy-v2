import "server-only"
import { prisma } from "@/lib/prisma"
import { recalculateWorldCupChallenge } from "./worldCupScoringService"
import {
  getWorldCupDataProvider,
  WorldCupProviderConfigError,
  type WorldCupProviderName,
  type WorldCupProviderTeam,
  type WorldCupProviderFixture,
} from "./worldCupDataProvider"
import { normalizeWorldCupRound } from "./apiSportsWorldCup"
import { normalizeFifaTeamCode } from "./worldCupSeedData"
import type { WorldCupRound } from "./types"

// ── Shared option types ───────────────────────────────────────────────────────

export type WorldCupSyncOptions = {
  provider?: WorldCupProviderName | string | null
  dryRun?: boolean
  seasonYear?: number
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

// ── Fixture sync ──────────────────────────────────────────────────────────────

export type WorldCupFixtureSyncResult = {
  created: number
  updated: number
  skipped: number
  warnings: string[]
  lockTimeInferred: string | null
  fixtures: Array<{
    providerId: string
    matchId?: string
    action: "updated" | "skipped" | "no_match" | "error"
  }>
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
        result.fixtures.push({ providerId: f.providerId, action: "no_match" })
        result.skipped++
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

export async function syncWorldCupLiveScores(
  options: WorldCupSyncOptions & {
    challengeId: string
    recalculate?: boolean
  }
): Promise<WorldCupLiveScoreSyncResult> {
  const { dryRun = false, challengeId, recalculate = true, seasonYear = 2026 } =
    options

  const result: WorldCupLiveScoreSyncResult = {
    updated: 0,
    skipped: 0,
    finalMatches: 0,
    warnings: [],
    recalculated: false,
  }

  let liveFixtures: WorldCupProviderFixture[]
  try {
    const provider = await getWorldCupDataProvider(options.provider)
    liveFixtures = provider.getLiveFixtures
      ? await provider.getLiveFixtures(seasonYear)
      : await provider.getFixtures(seasonYear)
  } catch (err) {
    if (err instanceof WorldCupProviderConfigError) {
      result.warnings.push(err.message)
      return result
    }
    throw err
  }

  if (liveFixtures.length === 0) {
    result.warnings.push("No live/updated fixtures returned by provider.")
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

    // Resolve winner team ID when final
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

    const updated = await (prisma as any).worldCupBracketMatch.update({
      where: { id: match.id },
      data: scoreData,
    })

    if (normalStatus === "final") {
      result.finalMatches++
      // Advance winner to next match if wired
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

  // Trigger recalculation after final score updates
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
