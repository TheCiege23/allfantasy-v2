import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { addReactionToMessage, removeReactionFromMessage } from "@/lib/platform/chat-service"
import { getLeagueIdFromVirtualRoom, isLeagueVirtualRoom } from "@/lib/chat-core"
import { prisma } from "@/lib/prisma"

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

    const member = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.appUserId } },
      select: { id: true },
    })
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

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

    const member = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.appUserId } },
      select: { id: true },
    })
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

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

  const ok = await removeReactionFromMessage(user.appUserId, threadId, messageId, emoji)
  if (!ok) return NextResponse.json({ error: "Could not remove reaction" }, { status: 400 })

  return NextResponse.json({ status: "ok" })
}
