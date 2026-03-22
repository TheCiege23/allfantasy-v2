/**
 * ManagerTrustQueryService — query reputation by league, manager, sport; list evidence; support comparisons.
 */

import { prisma } from '@/lib/prisma'
import { getReputationSportLabel } from './SportReputationResolver'
import { getReputationTierLabel, getReputationTierBadgeColor } from './ReputationTierResolver'
import type { ReputationTier } from './types'

export interface ManagerReputationView {
  id: string
  leagueId: string
  managerId: string
  sport: string
  season: number
  sportLabel: string
  overallScore: number
  reliabilityScore: number
  activityScore: number
  tradeFairnessScore: number
  sportsmanshipScore: number
  commissionerTrustScore: number
  toxicityRiskScore: number
  participationQualityScore: number
  responsivenessScore: number
  tier: ReputationTier
  tierLabel: string
  tierBadgeColor: string
  updatedAt: Date
  evidenceCount?: number
}

export interface ReputationEvidenceView {
  id: string
  managerId: string
  leagueId: string
  sport: string
  season: number
  evidenceType: string
  value: number
  sourceReference: string | null
  createdAt: Date
}

function toView(r: {
  id: string
  leagueId: string
  managerId: string
  sport: string
  season: number
  overallScore: number
  reliabilityScore: number
  activityScore: number
  tradeFairnessScore: number
  sportsmanshipScore: number
  commissionerTrustScore: number
  toxicityRiskScore: number
  participationQualityScore: number
  responsivenessScore: number
  tier: string
  updatedAt: Date
}): ManagerReputationView {
  const tier = r.tier as ReputationTier
  return {
    ...r,
    sportLabel: getReputationSportLabel(r.sport),
    tierLabel: getReputationTierLabel(tier),
    tierBadgeColor: getReputationTierBadgeColor(tier),
    tier,
  }
}

export async function getReputationByLeagueAndManager(
  leagueId: string,
  managerId: string,
  options?: { sport?: string; season?: number | null }
): Promise<ManagerReputationView | null> {
  const r = await prisma.managerReputationRecord.findFirst({
    where: {
      leagueId,
      managerId,
      ...(options?.sport ? { sport: options.sport } : {}),
      ...(typeof options?.season === 'number' ? { season: options.season } : {}),
    },
    orderBy: [{ season: 'desc' }, { updatedAt: 'desc' }],
  })
  if (!r) return null
  return toView(r)
}

export async function listReputationsByLeague(
  leagueId: string,
  options?: { sport?: string; season?: number | null; tier?: string; limit?: number }
): Promise<ManagerReputationView[]> {
  const where: { leagueId: string; sport?: string; season?: number; tier?: string } = { leagueId }
  if (options?.sport) where.sport = options.sport
  if (typeof options?.season === 'number') where.season = options.season
  if (options?.tier) where.tier = options.tier
  const take = options?.limit ?? 100
  const list = await prisma.managerReputationRecord.findMany({
    where,
    orderBy: [{ managerId: 'asc' }, { season: 'desc' }, { overallScore: 'desc' }, { updatedAt: 'desc' }],
    take: typeof options?.season === 'number' ? take : Math.max(take * 4, 200),
  })
  if (typeof options?.season === 'number') return list.map(toView)

  const byManager = new Map<string, (typeof list)[number]>()
  for (const row of list) {
    if (!byManager.has(row.managerId)) byManager.set(row.managerId, row)
  }
  return [...byManager.values()]
    .sort((a, b) => b.overallScore - a.overallScore || b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, take)
    .map(toView)
}

export async function listEvidenceForManager(
  leagueId: string,
  managerId: string,
  options?: { sport?: string; season?: number | null; evidenceType?: string; limit?: number }
): Promise<ReputationEvidenceView[]> {
  const where: {
    leagueId: string
    managerId: string
    sport?: string
    season?: number
    evidenceType?: string
  } = { leagueId, managerId }
  if (options?.sport) where.sport = options.sport
  if (typeof options?.season === 'number') where.season = options.season
  if (options?.evidenceType) where.evidenceType = options.evidenceType
  const list = await prisma.reputationEvidenceRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
  })
  return list.map((e) => ({
    id: e.id,
    managerId: e.managerId,
    leagueId: e.leagueId,
    sport: e.sport,
    season: e.season,
    evidenceType: e.evidenceType,
    value: e.value,
    sourceReference: e.sourceReference,
    createdAt: e.createdAt,
  }))
}

/** Compare two managers' reputations in a league (for trade/trust context). */
export async function compareManagersReputation(
  leagueId: string,
  managerAId: string,
  managerBId: string,
  options?: { sport?: string; season?: number | null }
): Promise<{ managerA: ManagerReputationView | null; managerB: ManagerReputationView | null }> {
  const [a, b] = await Promise.all([
    getReputationByLeagueAndManager(leagueId, managerAId, options),
    getReputationByLeagueAndManager(leagueId, managerBId, options),
  ])
  return { managerA: a, managerB: b }
}
