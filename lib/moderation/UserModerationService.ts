/**
 * User moderation: warning, mute, suspension, permanent ban.
 * Platform-level actions stored in PlatformModerationAction.
 */

import { prisma } from "@/lib/prisma"

export const MODERATION_ACTION_TYPES = ["warning", "mute", "suspend", "ban"] as const
export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number]

export interface ApplyActionInput {
  userId: string
  actionType: ModerationActionType
  reason?: string | null
  expiresAt?: Date | null
  createdByUserId?: string | null
}

export interface ModerationActionRecord {
  id: string
  userId: string
  actionType: string
  reason: string | null
  expiresAt: Date | null
  createdByUserId: string | null
  createdAt: Date
}

export async function applyModerationAction(input: ApplyActionInput): Promise<ModerationActionRecord | null> {
  const { userId, actionType, reason, expiresAt, createdByUserId } = input
  if (!userId || !MODERATION_ACTION_TYPES.includes(actionType as ModerationActionType)) return null
  try {
    const row = await prisma.platformModerationAction.create({
      data: {
        userId,
        actionType,
        reason: reason?.slice(0, 2000) ?? null,
        expiresAt: expiresAt ?? null,
        createdByUserId: createdByUserId ?? null,
      },
    })
    return {
      id: row.id,
      userId: row.userId,
      actionType: row.actionType,
      reason: row.reason,
      expiresAt: row.expiresAt,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
    }
  } catch {
    return null
  }
}

/** Remove the most recent ban for user (unban). */
export async function removeBan(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const deleted = await prisma.platformModerationAction.deleteMany({
      where: { userId, actionType: "ban" },
    })
    return (deleted.count ?? 0) > 0
  } catch {
    return false
  }
}

/** Remove active mute for user. */
export async function removeMute(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const now = new Date()
    const rows = await prisma.platformModerationAction.findMany({
      where: { userId, actionType: "mute" },
      orderBy: { createdAt: "desc" },
    })
    for (const row of rows) {
      if (!row.expiresAt || row.expiresAt > now) {
        await prisma.platformModerationAction.delete({ where: { id: row.id } })
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

/** Remove active suspension for user. */
export async function removeSuspend(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const now = new Date()
    const rows = await prisma.platformModerationAction.findMany({
      where: { userId, actionType: "suspend" },
      orderBy: { createdAt: "desc" },
    })
    for (const row of rows) {
      if (!row.expiresAt || row.expiresAt > now) {
        await prisma.platformModerationAction.delete({ where: { id: row.id } })
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

/** Check if user is currently banned (has active ban action). */
export async function isUserBanned(userId: string): Promise<boolean> {
  if (!userId) return false
  const ban = await prisma.platformModerationAction.findFirst({
    where: { userId, actionType: "ban" },
  })
  return !!ban
}

/** Check if user is currently muted (has mute with future expiresAt or no expiresAt). */
export async function isUserMuted(userId: string): Promise<boolean> {
  if (!userId) return false
  const now = new Date()
  const mute = await prisma.platformModerationAction.findFirst({
    where: {
      userId,
      actionType: "mute",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  })
  return !!mute
}

/** List active moderation actions for a user. */
export async function getActiveActionsForUser(userId: string): Promise<ModerationActionRecord[]> {
  if (!userId) return []
  const now = new Date()
  const rows = await prisma.platformModerationAction.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    actionType: r.actionType,
    reason: r.reason,
    expiresAt: r.expiresAt,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
  }))
}
