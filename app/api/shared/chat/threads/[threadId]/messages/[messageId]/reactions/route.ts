import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { addReactionToMessage, removeReactionFromMessage } from "@/lib/platform/chat-service"
import { getLeagueIdFromVirtualRoom, isLeagueVirtualRoom } from "@/lib/chat-core"
import { canAccessLeagueDraft } from "@/lib/live-draft-engine/auth"
import { prisma } from "@/lib/prisma"

type ReactionEntry = { emoji: string; count: number; userIds: string[] }

function getReactionEntries(metadata: unknown): ReactionEntry[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return []
  const reactions = (metadata as Record<string, unknown>).reactions
  if (!Array.isArray(reactions)) return []
  return reactions
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null
      const emoji = typeof (entry as Record<string, unknown>).emoji === "string" ? (entry as Record<string, unknown>).emoji.trim() : ""
      const countRaw = (entry as Record<string, unknown>).count
      const count = typeof countRaw === "number" && Number.isFinite(countRaw) ? Math.max(0, Math.floor(countRaw)) : 0
      const userIdsRaw = (entry as Record<string, unknown>).userIds
      const userIds = Array.isArray(userIdsRaw)
        ? userIdsRaw.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : []
      if (!emoji) return null
      return { emoji, count, userIds }
    })
    .filter((entry): entry is ReactionEntry => Boolean(entry))
}

function addReaction(entries: ReactionEntry[], emoji: string, userId: string): ReactionEntry[] {
  const next = [...entries]
  const existing = next.find((entry) => entry.emoji === emoji)
  if (!existing) {
    return [...next, { emoji, count: 1, userIds: [userId] }]
  }
  if (!existing.userIds.includes(userId)) {
    existing.userIds = [...existing.userIds, userId]
    existing.count = existing.userIds.length
  }
  return next
}

function removeReaction(entries: ReactionEntry[], emoji: string, userId: string): ReactionEntry[] {
  return entries
    .map((entry) => {
      if (entry.emoji !== emoji) return entry
      const userIds = entry.userIds.filter((id) => id !== userId)
      return { ...entry, userIds, count: userIds.length }
    })
    .filter((entry) => entry.count > 0)
}

/**
 * POST: add an emoji reaction to a message.
 * Body: { emoji: string } (e.g. "👍", "😂")
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string; messageId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const messageId = decodeURIComponent(params.messageId)
  const body = await req.json().catch(() => ({}))
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""

  if (!emoji || emoji.length > 10) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  if (isLeagueVirtualRoom(threadId)) {
    const leagueId = getLeagueIdFromVirtualRoom(threadId)
    if (!leagueId) return NextResponse.json({ error: "Invalid league room" }, { status: 400 })

    const bracketMember = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.appUserId } },
      select: { id: true },
    })
    if (bracketMember) {
      const msg = await (prisma as any).bracketLeagueMessage.findUnique({
        where: { id: messageId },
        select: { leagueId: true },
      })
      if (!msg || msg.leagueId !== leagueId) {
        return NextResponse.json({ error: "Message not found in this league" }, { status: 404 })
      }

      const existing = await (prisma as any).bracketMessageReaction.findUnique({
        where: { messageId_userId_emoji: { messageId, userId: user.appUserId, emoji } },
        select: { id: true },
      })
      if (!existing) {
        await (prisma as any).bracketMessageReaction.create({
          data: { messageId, userId: user.appUserId, emoji },
        })
      }
      return NextResponse.json({ status: "ok" })
    }

    const canAccessMainLeague = await canAccessLeagueDraft(leagueId, user.appUserId)
    if (!canAccessMainLeague) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    const row = await (prisma as any).leagueChatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, leagueId: true, metadata: true },
    })
    if (!row || row.leagueId !== leagueId) {
      return NextResponse.json({ error: "Message not found in this league" }, { status: 404 })
    }
    const baseMetadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const updatedReactions = addReaction(getReactionEntries(baseMetadata), emoji, user.appUserId)
    await (prisma as any).leagueChatMessage.update({
      where: { id: messageId },
      data: { metadata: { ...baseMetadata, reactions: updatedReactions } },
    })
    return NextResponse.json({ status: "ok" })
  }

  const ok = await addReactionToMessage(user.appUserId, threadId, messageId, emoji)
  if (!ok) return NextResponse.json({ error: "Could not add reaction" }, { status: 400 })

  return NextResponse.json({ status: "ok" })
}

/**
 * DELETE: remove an emoji reaction from a message.
 * Body: { emoji: string }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { threadId: string; messageId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const messageId = decodeURIComponent(params.messageId)
  const body = await req.json().catch(() => ({}))
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""

  if (!emoji || emoji.length > 10) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  if (isLeagueVirtualRoom(threadId)) {
    const leagueId = getLeagueIdFromVirtualRoom(threadId)
    if (!leagueId) return NextResponse.json({ error: "Invalid league room" }, { status: 400 })

    const bracketMember = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.appUserId } },
      select: { id: true },
    })
    if (bracketMember) {
      const msg = await (prisma as any).bracketLeagueMessage.findUnique({
        where: { id: messageId },
        select: { leagueId: true },
      })
      if (!msg || msg.leagueId !== leagueId) {
        return NextResponse.json({ error: "Message not found in this league" }, { status: 404 })
      }

      await (prisma as any).bracketMessageReaction.deleteMany({
        where: { messageId, userId: user.appUserId, emoji },
      })
      return NextResponse.json({ status: "ok" })
    }

    const canAccessMainLeague = await canAccessLeagueDraft(leagueId, user.appUserId)
    if (!canAccessMainLeague) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    const row = await (prisma as any).leagueChatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, leagueId: true, metadata: true },
    })
    if (!row || row.leagueId !== leagueId) {
      return NextResponse.json({ error: "Message not found in this league" }, { status: 404 })
    }
    const baseMetadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const updatedReactions = removeReaction(getReactionEntries(baseMetadata), emoji, user.appUserId)
    await (prisma as any).leagueChatMessage.update({
      where: { id: messageId },
      data: { metadata: { ...baseMetadata, reactions: updatedReactions } },
    })
    return NextResponse.json({ status: "ok" })
  }

  const ok = await removeReactionFromMessage(user.appUserId, threadId, messageId, emoji)
  if (!ok) return NextResponse.json({ error: "Could not remove reaction" }, { status: 400 })

  return NextResponse.json({ status: "ok" })
}
