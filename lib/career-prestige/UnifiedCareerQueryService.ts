/**
 * UnifiedCareerQueryService — aggregate manager profile and leaderboards from all career systems.
 */

import { getFranchiseProfileByManager } from '@/lib/gm-economy/GMProfileQueryService'
import { getOrCreateProfileView } from '@/lib/xp-progression/ManagerXPQueryService'
import { getReputationByLeagueAndManager } from '@/lib/reputation-engine/ManagerTrustQueryService'
import { getLegacyScoreByEntity } from '@/lib/legacy-score-engine/LegacyRankingService'
import { queryHallOfFameEntries } from '@/lib/hall-of-fame-engine/HallOfFameQueryService'
import { listAwards } from '@/lib/awards-engine/AwardQueryService'
import { getRecordLeaderboard } from '@/lib/record-book-engine/RecordLeaderboardService'
import { listFranchiseProfiles } from '@/lib/gm-economy/GMProfileQueryService'
import { getLeaderboard as getXPLeaderboard } from '@/lib/xp-progression/ManagerXPQueryService'
import { prisma } from '@/lib/prisma'
import { resolveSportForCareer } from './SportPrestigeResolver'
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

  const [gmProfile, xpProfile, reputation, legacy, hofResult, awardsByLeague, recordsByLeague] =
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
      leagueId ? listAwards({ leagueId, limit: 200 }) : Promise.resolve([]),
      leagueId ? getRecordLeaderboard({ leagueId, limit: 200 }) : Promise.resolve([]),
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

  const awardsWon = leagueId
    ? (awardsByLeague as { managerId: string }[]).filter((a) => a.managerId === managerId).length
    : 0
  const recordsHeld = leagueId
    ? (recordsByLeague as { holderId: string }[]).filter((r) => r.holderId === managerId).length
    : 0

  const timelineHints: string[] = []
  if (awardsWon && Array.isArray(awardsByLeague)) {
    const myAwards = (awardsByLeague as { awardLabel?: string; season?: string; managerId: string }[]).filter(
      (a) => a.managerId === managerId
    )
    myAwards.slice(0, 5).forEach((a) => {
      if (a.awardLabel && a.season) timelineHints.push(`${a.season} ${a.awardLabel}`)
    })
  }
  if (recordsHeld && Array.isArray(recordsByLeague)) {
    const myRecords = (recordsByLeague as { recordLabel?: string; season?: string; holderId: string }[]).filter(
      (r) => r.holderId === managerId
    )
    myRecords.slice(0, 5).forEach((r) => {
      if (r.recordLabel && r.season) timelineHints.push(`${r.season} ${r.recordLabel}`)
    })
  }

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
  const managerIds = rosters.map((r) => r.platformUserId)

  const [gmCount, xpCount, repCount, legacyCount, hofCount, awardsCount, recordCount] =
    await Promise.all([
      managerIds.length ? prisma.managerFranchiseProfile.count({ where: { managerId: { in: managerIds } } }) : 0,
      managerIds.length ? prisma.managerXPProfile.count({ where: { managerId: { in: managerIds } } }) : 0,
      prisma.managerReputationRecord.count({ where: { leagueId } }),
      prisma.legacyScoreRecord.count({ where: { leagueId, entityType: 'MANAGER' } }),
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
    reputationCoverage: repCount,
    legacyCoverage: legacyCount,
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

  const [gmProfiles, xpLeaderboard, awardsList, recordsList] = await Promise.all([
    listFranchiseProfiles({ limit: 200, orderBy: 'franchiseValue' }),
    getXPLeaderboard({ limit: 200 }),
    leagueId ? listAwards({ leagueId, limit: 500 }) : Promise.resolve([]),
    leagueId ? getRecordLeaderboard({ leagueId, limit: 500 }) : Promise.resolve([]),
  ])

  const managerIds = new Set<string>()
  gmProfiles.profiles.forEach((p) => managerIds.add(p.managerId))
  xpLeaderboard.forEach((r) => managerIds.add(r.managerId))

  const awardsByManager = new Map<string, number>()
  if (Array.isArray(awardsList)) {
    (awardsList as { managerId: string }[]).forEach((a) => {
      awardsByManager.set(a.managerId, (awardsByManager.get(a.managerId) ?? 0) + 1)
    })
  }
  const recordsByManager = new Map<string, number>()
  if (Array.isArray(recordsList)) {
    (recordsList as { holderId: string }[]).forEach((r) => {
      recordsByManager.set(r.holderId, (recordsByManager.get(r.holderId) ?? 0) + 1)
    })
  }

  const gmByManager = new Map(gmProfiles.profiles.map((p) => [p.managerId, p]))
  const xpByManager = new Map(xpLeaderboard.map((r) => [r.managerId, { totalXP: r.totalXP }]))

  const rows: CareerLeaderboardRow[] = []
  for (const managerId of managerIds) {
    const gm = gmByManager.get(managerId)
    const xp = xpByManager.get(managerId)
    const franchiseValue = gm?.franchiseValue ?? 0
    const totalXP = xp?.totalXP ?? 0
    const legacyScore = null
    const reputationTier = null
    const championshipCount = gm?.championshipCount ?? 0
    const awardsCount = leagueId ? (awardsByManager.get(managerId) ?? 0) : 0
    const recordsCount = leagueId ? (recordsByManager.get(managerId) ?? 0) : 0
    const prestigeScore =
      Math.min(100, (franchiseValue / 1000) * 0.3 + (totalXP / 50) * 0.3 + championshipCount * 5 + (awardsCount + recordsCount) * 2)
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
