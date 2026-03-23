/**
 * GMProfileQueryService — query franchise profiles and progression events.
 */

import { prisma } from '@/lib/prisma'
import { getGMTierFromScore, getGMTierLabel, getGMTierBadgeColor } from './GMTierResolver'
import type { ManagerFranchiseProfileView, GMProgressionEventView, GMProgressionEventFilters } from './types'
import { normalizeSportForGMCareer } from './SportCareerResolver'

export async function getFranchiseProfileByManager(
  managerId: string
): Promise<ManagerFranchiseProfileView | null> {
  const p = await prisma.managerFranchiseProfile.findUnique({
    where: { managerId },
  })
  if (!p) return null

  const tier = getGMTierFromScore(Number(p.gmPrestigeScore))
  return {
    profileId: p.id,
    managerId: p.managerId,
    totalCareerSeasons: p.totalCareerSeasons,
    totalLeaguesPlayed: p.totalLeaguesPlayed,
    championshipCount: p.championshipCount,
    playoffAppearances: p.playoffAppearances,
    careerWinPercentage: Number(p.careerWinPercentage),
    gmPrestigeScore: Number(p.gmPrestigeScore),
    franchiseValue: Number(p.franchiseValue),
    updatedAt: p.updatedAt,
    tierLabel: getGMTierLabel(tier),
    tierBadgeColor: getGMTierBadgeColor(tier),
  }
}

export async function listFranchiseProfiles(options?: {
  sport?: string | null
  limit?: number
  offset?: number
  orderBy?: 'franchiseValue' | 'gmPrestigeScore'
}): Promise<{ profiles: ManagerFranchiseProfileView[]; total: number }> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200)
  const offset = Math.max(options?.offset ?? 0, 0)
  const orderBy = options?.orderBy ?? 'franchiseValue'
  let managerIdFilter: string[] | null = null

  if (options?.sport) {
    const sport = normalizeSportForGMCareer(options.sport)
    const rosterManagers = await prisma.roster.findMany({
      where: { league: { sport } },
      distinct: ['platformUserId'],
      select: { platformUserId: true },
    })
    managerIdFilter = [...new Set(rosterManagers.map((row) => row.platformUserId).filter(Boolean))]
    if (managerIdFilter.length === 0) {
      return { profiles: [], total: 0 }
    }
  }

  const where = managerIdFilter ? { managerId: { in: managerIdFilter } } : undefined

  const [profiles, total] = await Promise.all([
    prisma.managerFranchiseProfile.findMany({
      where,
      orderBy: orderBy === 'gmPrestigeScore' ? { gmPrestigeScore: 'desc' } : { franchiseValue: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.managerFranchiseProfile.count({ where }),
  ])

  const views: ManagerFranchiseProfileView[] = profiles.map((p) => {
    const tier = getGMTierFromScore(Number(p.gmPrestigeScore))
    return {
      profileId: p.id,
      managerId: p.managerId,
      totalCareerSeasons: p.totalCareerSeasons,
      totalLeaguesPlayed: p.totalLeaguesPlayed,
      championshipCount: p.championshipCount,
      playoffAppearances: p.playoffAppearances,
      careerWinPercentage: Number(p.careerWinPercentage),
      gmPrestigeScore: Number(p.gmPrestigeScore),
      franchiseValue: Number(p.franchiseValue),
      updatedAt: p.updatedAt,
      tierLabel: getGMTierLabel(tier),
      tierBadgeColor: getGMTierBadgeColor(tier),
    }
  })

  return { profiles: views, total }
}

export async function listProgressionEvents(
  filters: GMProgressionEventFilters
): Promise<{ events: GMProgressionEventView[]; total: number }> {
  const where: { managerId: string; sport?: string; eventType?: string } = {
    managerId: filters.managerId,
  }
  if (filters.sport) where.sport = normalizeSportForGMCareer(filters.sport)
  if (filters.eventType) where.eventType = filters.eventType

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const [events, total] = await Promise.all([
    prisma.gMProgressionEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.gMProgressionEvent.count({ where }),
  ])

  const views: GMProgressionEventView[] = events.map((e) => ({
    eventId: e.id,
    managerId: e.managerId,
    sport: e.sport,
    eventType: e.eventType,
    valueChange: Number(e.valueChange),
    sourceReference: e.sourceReference,
    createdAt: e.createdAt,
  }))

  return { events: views, total }
}
