/**
 * UnifiedCareerQueryService — aggregate manager profile and leaderboards from all career systems.
 */

import { getFranchiseProfileByManager } from '@/lib/gm-economy/GMProfileQueryService'
import { getOrCreateProfileView } from '@/lib/xp-progression/ManagerXPQueryService'
import { getReputationByLeagueAndManager } from '@/lib/reputation-engine/ManagerTrustQueryService'
import { getLegacyScoreByEntity } from '@/lib/legacy-score-engine/LegacyRankingService'
import { queryHallOfFameEntries } from '@/lib/hall-of-fame-engine/HallOfFameQueryService'
import { listFranchiseProfiles } from '@/lib/gm-economy/GMProfileQueryService'
import { getLeaderboard as getXPLeaderboard } from '@/lib/xp-progression/ManagerXPQueryService'
import { prisma } from '@/lib/prisma'
import { resolveSportForCareer } from './SportPrestigeResolver'
import { AWARD_LABELS } from '@/lib/awards-engine/types'
import { RECORD_LABELS } from '@/lib/record-book-engine/types'
import type {
  UnifiedCareerProfile,
  LeaguePrestigeSummary,
  CareerLeaderboardRow,
  CareerGMEconomySnapshot,
  CareerXPSnapshot,
  CareerReputationSnapshot,
  CareerLegacySnapshot,
} from './types'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

/**
 * Get unified career profile for a manager. If leagueId provided, reputation and legacy are for that league.
 */
export async function getUnifiedCareerProfile(
  managerId: string,
  options?: { leagueId?: string | null; sport?: string | null }
): Promise<UnifiedCareerProfile> {
  const leagueId = options?.leagueId ?? null
  const sport = resolveSportForCareer(options?.sport ?? DEFAULT_SPORT)

  const [gmProfile, xpProfile, reputation, legacy, hofResult, awardsWon, recordsHeld, awardTimeline, recordTimeline] =
    await Promise.all([
      getFranchiseProfileByManager(managerId),
      getOrCreateProfileView(managerId),
      leagueId
        ? getReputationByLeagueAndManager(leagueId, managerId)
        : Promise.resolve(null),
      leagueId
        ? getLegacyScoreByEntity('MANAGER', managerId, sport, leagueId)
        : Promise.resolve(null),
      leagueId
        ? queryHallOfFameEntries({
            leagueId,
            sport,
            entityType: 'MANAGER',
            entityId: managerId,
            limit: 10,
            offset: 0,
          })
        : Promise.resolve({ entries: [], total: 0 }),
      leagueId ? prisma.awardRecord.count({ where: { leagueId, managerId } }) : Promise.resolve(0),
      leagueId ? prisma.recordBookEntry.count({ where: { leagueId, holderId: managerId } }) : Promise.resolve(0),
      leagueId
        ? prisma.awardRecord.findMany({
            where: { leagueId, managerId },
            orderBy: [{ season: 'desc' }, { createdAt: 'desc' }],
            select: { season: true, awardType: true },
            take: 5,
          })
        : Promise.resolve([]),
      leagueId
        ? prisma.recordBookEntry.findMany({
            where: { leagueId, holderId: managerId },
            orderBy: [{ season: 'desc' }, { value: 'desc' }],
            select: { season: true, recordType: true },
            take: 5,
          })
        : Promise.resolve([]),
    ])

  const gmEconomy: CareerGMEconomySnapshot | null = gmProfile
    ? {
        franchiseValue: gmProfile.franchiseValue,
        gmPrestigeScore: gmProfile.gmPrestigeScore,
        tierLabel: gmProfile.tierLabel ?? null,
        championshipCount: gmProfile.championshipCount,
        careerWinPercentage: gmProfile.careerWinPercentage,
        totalCareerSeasons: gmProfile.totalCareerSeasons,
        totalLeaguesPlayed: gmProfile.totalLeaguesPlayed,
      }
    : null

  const xp: CareerXPSnapshot | null = xpProfile
    ? {
        totalXP: xpProfile.totalXP,
        currentTier: xpProfile.currentTier,
        progressInTier: xpProfile.progressInTier ?? 0,
        xpToNextTier: xpProfile.xpToNextTier,
      }
    : null

  const reputationSnapshot: CareerReputationSnapshot | null = reputation
    ? {
        overallScore: reputation.overallScore,
        tier: reputation.tier,
        commissionerTrustScore: reputation.commissionerTrustScore,
      }
    : null

  const legacySnapshot: CareerLegacySnapshot | null = legacy
    ? {
        overallLegacyScore: legacy.overallLegacyScore,
        championshipScore: legacy.championshipScore,
        playoffScore: legacy.playoffScore,
      }
    : null

  const timelineHints: string[] = []
  awardTimeline.forEach((award) => {
    const label = AWARD_LABELS[award.awardType as keyof typeof AWARD_LABELS] ?? award.awardType
    timelineHints.push(`${award.season} ${label}`)
  })
  recordTimeline.forEach((record) => {
    const label = RECORD_LABELS[record.recordType as keyof typeof RECORD_LABELS] ?? record.recordType
    timelineHints.push(`${record.season} ${label}`)
  })

  return {
    managerId,
    leagueId,
    sport: leagueId ? sport : null,
    gmEconomy,
    xp,
    reputation: reputationSnapshot,
    legacy: legacySnapshot,
    hallOfFameEntryCount: hofResult.total,
    topHallOfFameTitle: hofResult.entries[0]?.title ?? null,
    awardsWonCount: awardsWon,
    recordsHeldCount: recordsHeld,
    timelineHints,
  }
}

/**
 * Get league-level prestige summary (counts and coverage).
 */
export async function getLeaguePrestigeSummary(
  leagueId: string,
  sport?: string | null
): Promise<LeaguePrestigeSummary> {
  const sportNorm = resolveSportForCareer(sport ?? DEFAULT_SPORT)

  const [league, rosters] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { sport: true } }),
    prisma.roster.findMany({ where: { leagueId }, select: { platformUserId: true } }),
  ])
  const managerIds = rosters
    .map((r) => r.platformUserId)
    .filter((value): value is string => Boolean(value))

  const [gmCount, xpCount, repDistinctRows, legacyDistinctRows, hofCount, awardsCount, recordCount] =
    await Promise.all([
      managerIds.length ? prisma.managerFranchiseProfile.count({ where: { managerId: { in: managerIds } } }) : 0,
      managerIds.length ? prisma.managerXPProfile.count({ where: { managerId: { in: managerIds } } }) : 0,
      prisma.managerReputationRecord.findMany({
        where: { leagueId },
        select: { managerId: true },
        distinct: ['managerId'],
      }),
      prisma.legacyScoreRecord.findMany({
        where: { leagueId, entityType: 'MANAGER' },
        select: { entityId: true },
        distinct: ['entityId'],
      }),
      prisma.hallOfFameEntry.count({ where: { leagueId } }),
      prisma.awardRecord.count({ where: { leagueId } }),
      prisma.recordBookEntry.count({ where: { leagueId } }),
    ])

  let topLegacy: number | null = null
  let topXP: number | null = null
  if (managerIds.length > 0) {
    const [legacyRec, xpRec] = await Promise.all([
      prisma.legacyScoreRecord.findFirst({
        where: { leagueId, entityType: 'MANAGER', entityId: { in: managerIds } },
        orderBy: { overallLegacyScore: 'desc' },
        select: { overallLegacyScore: true },
      }),
      prisma.managerXPProfile.findFirst({
        where: { managerId: { in: managerIds } },
        orderBy: { totalXP: 'desc' },
        select: { totalXP: true },
      }),
    ])
    topLegacy = legacyRec ? Number(legacyRec.overallLegacyScore) : null
    topXP = xpRec?.totalXP ?? null
  }

  return {
    leagueId,
    sport: (league?.sport as string) ?? sportNorm,
    managerCount: managerIds.length,
    gmEconomyCoverage: gmCount,
    xpCoverage: xpCount,
    reputationCoverage: repDistinctRows.length,
    legacyCoverage: legacyDistinctRows.length,
    hallOfFameEntryCount: hofCount,
    awardsCount,
    recordBookCount: recordCount,
    topLegacyScore: topLegacy,
    topXP,
  }
}

/**
 * Get unified career leaderboard (managers ranked by combined prestige).
 */
export async function getCareerLeaderboard(options?: {
  leagueId?: string | null
  sport?: string | null
  limit?: number
}): Promise<CareerLeaderboardRow[]> {
  const limit = Math.min(options?.limit ?? 50, 100)
  const leagueId = options?.leagueId ?? undefined
  const sport = options?.sport ? resolveSportForCareer(options.sport) : undefined

  const [leagueManagerIds, gmProfiles, xpLeaderboard, awardRows, recordRows] = await Promise.all([
    leagueId
      ? prisma.roster.findMany({
          where: { leagueId },
          select: { platformUserId: true },
        })
      : Promise.resolve([]),
    listFranchiseProfiles({ limit: 500, orderBy: 'franchiseValue', sport }),
    getXPLeaderboard({ limit: 500, sport }),
    leagueId
      ? prisma.awardRecord.findMany({
          where: { leagueId },
          select: { managerId: true },
        })
      : Promise.resolve([]),
    leagueId
      ? prisma.recordBookEntry.findMany({
          where: { leagueId },
          select: { holderId: true },
        })
      : Promise.resolve([]),
  ])

  const managerIds = new Set<string>()
  if (leagueId) {
    leagueManagerIds
      .map((row) => row.platformUserId)
      .filter((value): value is string => Boolean(value))
      .forEach((managerId) => managerIds.add(managerId))
  } else {
    gmProfiles.profiles.forEach((p) => managerIds.add(p.managerId))
    xpLeaderboard.forEach((r) => managerIds.add(r.managerId))
  }

  const awardsByManager = new Map<string, number>()
  awardRows.forEach((row) => {
    awardsByManager.set(row.managerId, (awardsByManager.get(row.managerId) ?? 0) + 1)
  })
  const recordsByManager = new Map<string, number>()
  recordRows.forEach((row) => {
    recordsByManager.set(row.holderId, (recordsByManager.get(row.holderId) ?? 0) + 1)
  })

  const gmByManager = new Map(gmProfiles.profiles.map((p) => [p.managerId, p]))
  const xpByManager = new Map(xpLeaderboard.map((r) => [r.managerId, { totalXP: r.totalXP }]))
  const managerIdList = Array.from(managerIds)
  const [legacyRows, reputationRows, hofCounts] = leagueId
    ? await Promise.all([
        prisma.legacyScoreRecord.findMany({
          where: {
            leagueId,
            entityType: 'MANAGER',
            entityId: { in: managerIdList },
            ...(sport ? { sport } : {}),
          },
          select: { entityId: true, overallLegacyScore: true },
        }),
        prisma.managerReputationRecord.findMany({
          where: {
            leagueId,
            managerId: { in: managerIdList },
            ...(sport ? { sport } : {}),
          },
          orderBy: [{ season: 'desc' }, { updatedAt: 'desc' }],
          select: { managerId: true, tier: true },
        }),
        prisma.hallOfFameEntry.groupBy({
          by: ['entityId'],
          where: {
            leagueId,
            entityType: 'MANAGER',
            entityId: { in: managerIdList },
            ...(sport ? { sport } : {}),
          },
          _count: { _all: true },
        }),
      ])
    : await Promise.all([Promise.resolve([]), Promise.resolve([]), Promise.resolve([])])
  const legacyByManager = new Map<string, number>()
  legacyRows.forEach((row) => {
    legacyByManager.set(row.entityId, Number(row.overallLegacyScore))
  })
  const reputationByManager = new Map<string, string>()
  reputationRows.forEach((row) => {
    if (!reputationByManager.has(row.managerId)) {
      reputationByManager.set(row.managerId, row.tier)
    }
  })
  const hofByManager = new Map<string, number>()
  hofCounts.forEach((row) => {
    hofByManager.set(row.entityId, row._count._all)
  })

  const rows: CareerLeaderboardRow[] = []
  for (const managerId of managerIds) {
    const gm = gmByManager.get(managerId)
    const xp = xpByManager.get(managerId)
    const franchiseValue = gm?.franchiseValue ?? 0
    const totalXP = xp?.totalXP ?? 0
    const legacyScore = leagueId ? (legacyByManager.get(managerId) ?? null) : null
    const reputationTier = leagueId ? (reputationByManager.get(managerId) ?? null) : null
    const championshipCount = gm?.championshipCount ?? 0
    const awardsCount = leagueId ? (awardsByManager.get(managerId) ?? 0) : 0
    const recordsCount = leagueId ? (recordsByManager.get(managerId) ?? 0) : 0
    const hofCount = leagueId ? (hofByManager.get(managerId) ?? 0) : 0
    const reputationTierBoost =
      reputationTier == null
        ? 0
        : reputationTier === 'LEGENDARY'
          ? 9
          : reputationTier === 'ELITE'
            ? 7
            : reputationTier === 'TRUSTED'
              ? 5
              : reputationTier === 'NEUTRAL'
                ? 2
                : 0
    const legacyBoost = legacyScore == null ? 0 : Math.min(20, legacyScore / 5)
    const prestigeScore =
      Math.min(
        100,
        (franchiseValue / 1000) * 0.25 +
          (totalXP / 50) * 0.25 +
          championshipCount * 4 +
          (awardsCount + recordsCount) * 2 +
          legacyBoost +
          reputationTierBoost +
          hofCount * 1.5
      )
    rows.push({
      managerId,
      rank: 0,
      franchiseValue,
      totalXP,
      legacyScore,
      reputationTier,
      championshipCount,
      awardsCount,
      recordsCount,
      prestigeScore: Math.round(prestigeScore * 10) / 10,
    })
  }

  rows.sort((a, b) => b.prestigeScore - a.prestigeScore)
  rows.forEach((r, i) => {
    r.rank = i + 1
  })
  return rows.slice(0, limit)
}
