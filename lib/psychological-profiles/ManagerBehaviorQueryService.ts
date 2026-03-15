/**
 * ManagerBehaviorQueryService — query psychological profiles by league, manager, sport.
 */

import { prisma } from '@/lib/prisma'
import type { ProfileLabel } from './types'
import { getPsychSportLabel } from './SportBehaviorResolver'

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
  options?: { sport?: string; limit?: number }
): Promise<ManagerPsychProfileView[]> {
  const where = { leagueId, ...(options?.sport ? { sport: options.sport } : {}) }
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
