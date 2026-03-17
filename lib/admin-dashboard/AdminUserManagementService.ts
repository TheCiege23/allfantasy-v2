/**
 * Admin user management: newest users, most active, reported users.
 */

import { prisma } from "@/lib/prisma"
import type { UserOverviewItem } from "./types"

const DEFAULT_PAGE_SIZE = 50

export async function getNewestUsers(limit: number = DEFAULT_PAGE_SIZE): Promise<UserOverviewItem[]> {
  const users = await prisma.appUser.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      emailVerified: true,
    },
  })
  const profileMap = new Map(
    (
      await prisma.userProfile.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        select: { userId: true, emailVerifiedAt: true },
      })
    ).map((p) => [p.userId, p])
  )
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    createdAt: u.createdAt,
    emailVerified: !!u.emailVerified || !!profileMap.get(u.id)?.emailVerifiedAt,
  }))
}

export async function getMostActiveUsers(limit: number = DEFAULT_PAGE_SIZE): Promise<UserOverviewItem[]> {
  const window = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const active = await prisma.analyticsEvent.groupBy({
    by: ["userId"],
    _count: { id: true },
    where: { userId: { not: null }, createdAt: { gte: window } },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  })
  const userIds = active.map((a) => a.userId!).filter(Boolean)
  if (userIds.length === 0) return []
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, username: true, createdAt: true, emailVerified: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  const profileMap = new Map(
    (
      await prisma.userProfile.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, emailVerifiedAt: true },
      })
    ).map((p) => [p.userId, p])
  )
  return userIds.map((id) => {
    const u = byId.get(id)
    if (!u) return null
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      createdAt: u.createdAt,
      emailVerified: !!u.emailVerified || !!profileMap.get(u.id)?.emailVerifiedAt,
    }
  }).filter(Boolean) as UserOverviewItem[]
}

export async function getReportedUserSummaries(limit: number = DEFAULT_PAGE_SIZE): Promise<(UserOverviewItem & { reportCount: number })[]> {
  const reported = await prisma.platformUserReport.groupBy({
    by: ["reportedUserId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  })
  const userIds = reported.map((r) => r.reportedUserId)
  if (userIds.length === 0) return []
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, username: true, createdAt: true, emailVerified: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  const countByUser = new Map(reported.map((r) => [r.reportedUserId, r._count.id]))
  const profileMap = new Map(
    (
      await prisma.userProfile.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, emailVerifiedAt: true },
      })
    ).map((p) => [p.userId, p])
  )
  return userIds.map((id) => {
    const u = byId.get(id)
    if (!u) return null
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      createdAt: u.createdAt,
      emailVerified: !!u.emailVerified || !!profileMap.get(u.id)?.emailVerifiedAt,
      reportCount: countByUser.get(id) ?? 0,
    }
  }).filter(Boolean) as (UserOverviewItem & { reportCount: number })[]
}
