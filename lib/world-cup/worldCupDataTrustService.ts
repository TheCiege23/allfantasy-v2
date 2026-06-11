import "server-only"
import { prisma } from "@/lib/prisma"
import type { DataFreshnessTier } from "@/lib/ai/engine/types"

const LIVE_API_STATUSES = ["1H", "2H", "ET", "P", "BT", "HT"]
const FINAL_API_STATUSES = ["FT", "AET", "PEN"]
const LIVE_STALE_MS = 5 * 60 * 1000
const SYNC_STALE_MS = 24 * 60 * 60 * 1000

export type WorldCupDataTrustReport = {
  fixturesCount: number
  teamsCount: number
  standingsCount: number
  liveMatchCount: number
  upcomingMatchCount: number
  completedMatchCount: number
  lastFixtureSyncAt: string | null
  lastScoreSyncAt: string | null
  lastStandingsSyncAt: string | null
  teamsMissingFlag: number
  teamsMissingLogo: number
  fixturesMissingKickoff: number
  fixturesMissingStatus: number
  dataFreshness: DataFreshnessTier
  userFacingLabel: string
  hasLiveData: boolean
  syncLogStatus: "success" | "partial" | "error" | null
  lastSyncSource: string | null
}

export async function getWorldCupDataTrustReport(
  challengeId: string
): Promise<WorldCupDataTrustReport> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { seasonYear: true },
  })
  const seasonYear = challenge?.seasonYear ?? new Date().getUTCFullYear()

  const [
    latestSyncLog,
    liveMatchCount,
    completedMatchCount,
    upcomingMatchCount,
    latestScoreSync,
    fixturesCount,
    fixturesMissingKickoff,
    fixturesMissingStatus,
    teamsCount,
    teamsMissingFlag,
    teamsMissingLogo,
    standingsAgg,
  ] = await Promise.all([
    prisma.worldCupSyncLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { status: true, source: true, finishedAt: true, createdAt: true },
    }),
    prisma.worldCupBracketMatch.count({
      where: { challengeId, apiStatusShort: { in: LIVE_API_STATUSES } },
    }),
    prisma.worldCupBracketMatch.count({
      where: { challengeId, apiStatusShort: { in: FINAL_API_STATUSES } },
    }),
    prisma.worldCupBracketMatch.count({
      where: { challengeId, status: "scheduled" },
    }),
    prisma.worldCupBracketMatch.aggregate({
      where: { challengeId, lastScoreSyncedAt: { not: null } },
      _max: { lastScoreSyncedAt: true },
    }),
    prisma.worldCupOfficialFixture.count({ where: { seasonYear } }),
    prisma.worldCupOfficialFixture.count({ where: { seasonYear, startsAt: null } }),
    prisma.worldCupOfficialFixture.count({ where: { seasonYear, apiStatusShort: null } }),
    prisma.worldCupTeam.count(),
    prisma.worldCupTeam.count({ where: { flagUrl: null } }),
    prisma.worldCupTeam.count({ where: { logoUrl: null } }),
    prisma.worldCupOfficialGroupStanding.aggregate({
      where: { seasonYear },
      _count: { id: true },
      _max: { updatedAt: true },
    }),
  ])

  const now = Date.now()
  const lastScoreSyncAt = latestScoreSync._max.lastScoreSyncedAt
    ? latestScoreSync._max.lastScoreSyncedAt.toISOString()
    : null
  const lastFixtureSyncAt = latestSyncLog?.finishedAt?.toISOString() ?? null
  const lastStandingsSyncAt = standingsAgg._max.updatedAt?.toISOString() ?? null

  const hasLiveData = liveMatchCount > 0
  const scoreSyncFresh = lastScoreSyncAt
    ? now - new Date(lastScoreSyncAt).getTime() <= LIVE_STALE_MS
    : false
  const fixtureSyncFresh = lastFixtureSyncAt
    ? now - new Date(lastFixtureSyncAt).getTime() <= SYNC_STALE_MS
    : false

  let dataFreshness: DataFreshnessTier
  let userFacingLabel: string

  if (hasLiveData && scoreSyncFresh) {
    dataFreshness = "live"
    userFacingLabel = "Live scores active"
  } else if (fixtureSyncFresh && fixturesCount > 0) {
    dataFreshness = "cached"
    userFacingLabel = "Updated within 24 hours"
  } else if (fixturesCount > 0) {
    dataFreshness = "schedule_only"
    userFacingLabel = "Schedule only — scores may be outdated"
  } else if (teamsCount > 0) {
    dataFreshness = "pool_only"
    userFacingLabel = "Pool data only — no fixture data loaded"
  } else {
    dataFreshness = "none"
    userFacingLabel = "No data loaded"
  }

  return {
    fixturesCount,
    teamsCount,
    standingsCount: standingsAgg._count.id,
    liveMatchCount,
    upcomingMatchCount,
    completedMatchCount,
    lastFixtureSyncAt,
    lastScoreSyncAt,
    lastStandingsSyncAt,
    teamsMissingFlag,
    teamsMissingLogo,
    fixturesMissingKickoff,
    fixturesMissingStatus,
    dataFreshness,
    userFacingLabel,
    hasLiveData,
    syncLogStatus: latestSyncLog
      ? (latestSyncLog.status as "success" | "partial" | "error")
      : null,
    lastSyncSource: latestSyncLog?.source ?? null,
  }
}
