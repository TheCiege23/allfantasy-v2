/**
 * ManagerXPQueryService — get profile, events, leaderboard for Career XP.
 */

import { prisma } from '@/lib/prisma'
import {
  getTierFromXP,
  getXPRemainingToNextTier,
  getProgressInTier,
  getTierBadgeColor,
} from './TierResolver'
import type { ManagerXPProfileView, XPEventView, XPEventType } from './types'
import { XP_EVENT_TYPES } from './types'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

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
    currentTier: tier,
    xpToNextTier: getXPRemainingToNextTier(profile.totalXP),
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
    xpToNextTier: getXPRemainingToNextTier(0),
    updatedAt: new Date(),
    tierBadgeColor: getTierBadgeColor(tier),
    progressInTier: 0,
  }
}

export async function getEventsByManagerId(
  managerId: string,
  options?: { sport?: string | null; eventType?: string | null; limit?: number }
): Promise<XPEventView[]> {
  const where: { managerId: string; sport?: string; eventType?: XPEventType } = { managerId }
  if (options?.sport && isSupportedSport(options.sport)) {
    where.sport = normalizeToSupportedSport(options.sport)
  }
  if (
    options?.eventType &&
    XP_EVENT_TYPES.includes(options.eventType as XPEventType)
  ) {
    where.eventType = options.eventType as XPEventType
  }
  const limit = Math.min(options?.limit ?? 100, 500)
  const events = await prisma.xPEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return events.map((e) => ({
    eventId: e.id,
    managerId: e.managerId,
    eventType: e.eventType as XPEventType,
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
  const limit = Math.min(options?.limit ?? 50, 200)

  if (options?.sport && isSupportedSport(options.sport)) {
    const sport = normalizeToSupportedSport(options.sport)
    const grouped = await prisma.xPEvent.groupBy({
      by: ['managerId'],
      where: { sport },
      _sum: { xpValue: true },
      orderBy: { _sum: { xpValue: 'desc' } },
      take: limit * 4,
    })
    const normalized = grouped.map((row) => {
      const totalXP = Number(row._sum.xpValue ?? 0)
      return {
        managerId: row.managerId,
        totalXP,
        currentTier: getTierFromXP(totalXP),
      }
    })
    const filtered = options?.tier
      ? normalized.filter((row) => row.currentTier === options.tier)
      : normalized
    return filtered.slice(0, limit).map((row, index) => ({
      managerId: row.managerId,
      totalXP: row.totalXP,
      currentTier: row.currentTier,
      rank: index + 1,
    }))
  }

  const where: { currentTier?: string } = {}
  if (options?.tier) where.currentTier = options.tier
  const profiles = await prisma.managerXPProfile.findMany({
    where,
    orderBy: { totalXP: 'desc' },
    take: limit,
    select: { managerId: true, totalXP: true, currentTier: true },
  })
  return profiles.map((p, i) => ({
    managerId: p.managerId,
    totalXP: p.totalXP,
    currentTier: getTierFromXP(p.totalXP),
    rank: i + 1,
  }))
}
