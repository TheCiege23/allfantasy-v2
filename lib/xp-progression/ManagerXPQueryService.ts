/**
 * ManagerXPQueryService — get profile, events, leaderboard for Career XP.
 */

import { prisma } from '@/lib/prisma'
import { getTierFromXP, getXPToNextTier, getProgressInTier, getTierBadgeColor } from './TierResolver'
import type { ManagerXPProfileView, XPEventView } from './types'
import { isSupportedSport } from '@/lib/sport-scope'

export async function getProfileByManagerId(managerId: string): Promise<ManagerXPProfileView | null> {
  const profile = await prisma.managerXPProfile.findUnique({
    where: { managerId },
  })
  if (!profile) return null
  const tier = getTierFromXP(profile.totalXP)
  return {
    profileId: profile.id,
    managerId: profile.managerId,
    totalXP: profile.totalXP,
    currentTier: profile.currentTier,
    xpToNextTier: profile.xpToNextTier,
    updatedAt: profile.updatedAt,
    tierBadgeColor: getTierBadgeColor(tier),
    progressInTier: getProgressInTier(profile.totalXP),
  }
}

export async function getOrCreateProfileView(managerId: string): Promise<ManagerXPProfileView> {
  const existing = await getProfileByManagerId(managerId)
  if (existing) return existing
  const tier = getTierFromXP(0)
  return {
    profileId: '',
    managerId,
    totalXP: 0,
    currentTier: tier,
    xpToNextTier: getXPToNextTier(0),
    updatedAt: new Date(),
    tierBadgeColor: getTierBadgeColor(tier),
    progressInTier: 0,
  }
}

export async function getEventsByManagerId(
  managerId: string,
  options?: { sport?: string | null; eventType?: string | null; limit?: number }
): Promise<XPEventView[]> {
  const where: { managerId: string; sport?: string; eventType?: string } = { managerId }
  if (options?.sport && isSupportedSport(options.sport)) where.sport = options.sport
  if (options?.eventType) where.eventType = options.eventType
  const limit = Math.min(options?.limit ?? 100, 500)
  const events = await prisma.xPEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return events.map((e) => ({
    eventId: e.id,
    managerId: e.managerId,
    eventType: e.eventType,
    xpValue: e.xpValue,
    sport: e.sport,
    createdAt: e.createdAt,
  }))
}

export async function getLeaderboard(options?: {
  sport?: string | null
  tier?: string | null
  limit?: number
}): Promise<{ managerId: string; totalXP: number; currentTier: string; rank: number }[]> {
  const where: { currentTier?: string } = {}
  if (options?.tier) where.currentTier = options.tier
  const limit = Math.min(options?.limit ?? 50, 200)
  const profiles = await prisma.managerXPProfile.findMany({
    where,
    orderBy: { totalXP: 'desc' },
    take: limit,
    select: { managerId: true, totalXP: true, currentTier: true },
  })
  return profiles.map((p, i) => ({
    managerId: p.managerId,
    totalXP: p.totalXP,
    currentTier: p.currentTier,
    rank: i + 1,
  }))
}
