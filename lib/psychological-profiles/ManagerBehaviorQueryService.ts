/**
 * ManagerBehaviorQueryService — query psychological profiles by league, manager, sport.
 */

import { prisma } from '@/lib/prisma'
import type { ProfileLabel } from './types'
import { getPsychSportLabel, normalizeSportForPsych } from './SportBehaviorResolver'

export interface ManagerPsychProfileView {
  id: string
  leagueId: string
  managerId: string
  sport: string
  sportLabel: string
  profileLabels: ProfileLabel[]
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
  updatedAt: Date
  evidenceCount?: number
}

export async function getProfileByLeagueAndManager(
  leagueId: string,
  managerId: string
): Promise<ManagerPsychProfileView | null> {
  const p = await prisma.managerPsychProfile.findUnique({
    where: { leagueId_managerId: { leagueId, managerId } },
    include: { _count: { select: { evidence: true } } },
  })
  if (!p) return null
  return toView(p)
}

export async function listProfilesByLeague(
  leagueId: string,
  options?: {
    sport?: string
    season?: number
    limit?: number
    managerAId?: string
    managerBId?: string
  }
): Promise<ManagerPsychProfileView[]> {
  const sportNorm = normalizeSportForPsych(options?.sport)
  const seasonStart = options?.season != null ? new Date(Date.UTC(options.season, 0, 1)) : null
  const seasonEnd = options?.season != null ? new Date(Date.UTC(options.season + 1, 0, 1)) : null
  const where = {
    leagueId,
    ...(sportNorm ? { sport: sportNorm } : {}),
    ...(seasonStart && seasonEnd
      ? { evidence: { some: { createdAt: { gte: seasonStart, lt: seasonEnd } } } }
      : {}),
    ...(options?.managerAId && options?.managerBId
      ? { managerId: { in: [options.managerAId, options.managerBId] } }
      : {}),
  }
  const list = await prisma.managerPsychProfile.findMany({
    where,
    include: { _count: { select: { evidence: true } } },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
  })
  return list.map(toView)
}

export async function getProfileById(profileId: string): Promise<ManagerPsychProfileView | null> {
  const p = await prisma.managerPsychProfile.findUnique({
    where: { id: profileId },
    include: { _count: { select: { evidence: true } } },
  })
  if (!p) return null
  return toView(p)
}

export async function compareManagerProfiles(
  leagueId: string,
  managerAId: string,
  managerBId: string,
  sport?: string
): Promise<{
  managerA: ManagerPsychProfileView | null
  managerB: ManagerPsychProfileView | null
}> {
  const rows = await listProfilesByLeague(leagueId, {
    sport,
    managerAId,
    managerBId,
    limit: 2,
  })
  return {
    managerA: rows.find((r) => r.managerId === managerAId) ?? null,
    managerB: rows.find((r) => r.managerId === managerBId) ?? null,
  }
}

export async function listProfileEvidence(
  profileId: string,
  options?: { limit?: number; season?: number }
): Promise<
  Array<{
    id: string
    evidenceType: string
    value: number
    sourceReference: string | null
    createdAt: Date
  }>
> {
  const seasonStart = options?.season != null ? new Date(Date.UTC(options.season, 0, 1)) : null
  const seasonEnd = options?.season != null ? new Date(Date.UTC(options.season + 1, 0, 1)) : null
  return prisma.profileEvidenceRecord.findMany({
    where: {
      profileId,
      ...(seasonStart && seasonEnd
        ? { createdAt: { gte: seasonStart, lt: seasonEnd } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
    select: {
      id: true,
      evidenceType: true,
      value: true,
      sourceReference: true,
      createdAt: true,
    },
  })
}

function toView(p: {
  id: string
  leagueId: string
  managerId: string
  sport: string
  profileLabels: unknown
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
  updatedAt: Date
  _count?: { evidence: number }
}): ManagerPsychProfileView {
  const labels = Array.isArray(p.profileLabels) ? (p.profileLabels as ProfileLabel[]) : []
  return {
    id: p.id,
    leagueId: p.leagueId,
    managerId: p.managerId,
    sport: p.sport,
    sportLabel: getPsychSportLabel(p.sport),
    profileLabels: labels.filter((l): l is ProfileLabel => typeof l === 'string'),
    aggressionScore: p.aggressionScore,
    activityScore: p.activityScore,
    tradeFrequencyScore: p.tradeFrequencyScore,
    waiverFocusScore: p.waiverFocusScore,
    riskToleranceScore: p.riskToleranceScore,
    updatedAt: p.updatedAt,
    evidenceCount: p._count?.evidence,
  }
}
