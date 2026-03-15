/**
 * BlockUserService — global block list (PlatformBlockedUser) and thread-level block.
 */

import { prisma } from "@/lib/prisma"

export type BlockedUserInfo = { userId: string; username: string | null; displayName: string | null }

export async function addBlock(blockerUserId: string, blockedUserId: string): Promise<boolean> {
  if (!blockerUserId || !blockedUserId || blockerUserId === blockedUserId) return false
  try {
    await prisma.platformBlockedUser.upsert({
      where: {
        blockerUserId_blockedUserId: { blockerUserId, blockedUserId },
      },
      create: { blockerUserId, blockedUserId },
      update: {},
    })
    return true
  } catch {
    return false
  }
}

export async function removeBlock(blockerUserId: string, blockedUserId: string): Promise<boolean> {
  if (!blockerUserId || !blockedUserId) return false
  try {
    await prisma.platformBlockedUser.deleteMany({
      where: { blockerUserId, blockedUserId },
    })
    return true
  } catch {
    return false
  }
}

export async function getBlockedUserIds(blockerUserId: string): Promise<string[]> {
  if (!blockerUserId) return []
  try {
    const rows = await prisma.platformBlockedUser.findMany({
      where: { blockerUserId },
      select: { blockedUserId: true },
    })
    return rows.map((r) => r.blockedUserId)
  } catch {
    return []
  }
}

export async function getBlockedUsersWithDetails(blockerUserId: string): Promise<BlockedUserInfo[]> {
  if (!blockerUserId) return []
  try {
    const rows = await prisma.platformBlockedUser.findMany({
      where: { blockerUserId },
      include: {
        blocked: { select: { id: true, username: true, displayName: true } },
      },
    })
    return rows.map((r) => ({
      userId: r.blocked.id,
      username: r.blocked.username ?? null,
      displayName: r.blocked.displayName ?? null,
    }))
  } catch {
    return []
  }
}

export function isUserBlockedBy(blockedUserId: string, blockerUserId: string, blockSet: Set<string>): boolean {
  return blockSet.has(blockedUserId)
}
