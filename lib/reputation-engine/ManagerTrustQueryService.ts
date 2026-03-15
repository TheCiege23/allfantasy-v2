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
  managerId: string
): Promise<ManagerReputationView | null> {
  const r = await prisma.managerReputationRecord.findUnique({
    where: { leagueId_managerId: { leagueId, managerId } },
  })
  if (!r) return null
  return toView(r)
}

export async function listReputationsByLeague(
  leagueId: string,
  options?: { sport?: string; tier?: string; limit?: number }
): Promise<ManagerReputationView[]> {
  const where: { leagueId: string; sport?: string; tier?: string } = { leagueId }
  if (options?.sport) where.sport = options.sport
  if (options?.tier) where.tier = options.tier
  const list = await prisma.managerReputationRecord.findMany({
    where,
    orderBy: [{ overallScore: 'desc' }, { updatedAt: 'desc' }],
    take: options?.limit ?? 100,
  })
  return list.map(toView)
}

export async function listEvidenceForManager(
  leagueId: string,
  managerId: string,
  options?: { sport?: string; limit?: number }
): Promise<ReputationEvidenceView[]> {
  const where: { leagueId: string; managerId: string; sport?: string } = { leagueId, managerId }
  if (options?.sport) where.sport = options.sport
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
  managerBId: string
): Promise<{ managerA: ManagerReputationView | null; managerB: ManagerReputationView | null }> {
  const [a, b] = await Promise.all([
    getReputationByLeagueAndManager(leagueId, managerAId),
    getReputationByLeagueAndManager(leagueId, managerBId),
  ])
  return { managerA: a, managerB: b }
}
