import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import {
  getLeagueIdFromVirtualRoom,
  getThreadTypingState,
  isLeagueVirtualRoom,
  setThreadTypingState,
} from "@/lib/chat-core"
import { canAccessLeagueDraft } from "@/lib/live-draft-engine/auth"
import { prisma } from "@/lib/prisma"

async function canAccessThread(threadId: string, appUserId: string): Promise<boolean> {
  if (isLeagueVirtualRoom(threadId)) {
    const leagueId = getLeagueIdFromVirtualRoom(threadId)
    if (!leagueId) return false

    const bracketMember = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: appUserId } },
      select: { id: true },
    })
    if (bracketMember) return true

    return canAccessLeagueDraft(leagueId, appUserId)
  }

  const member = await (prisma as any).platformChatThreadMember.findFirst({
    where: { threadId, userId: appUserId, isBlocked: false },
    select: { id: true },
  })
  return Boolean(member)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const allowed = await canAccessThread(threadId, user.appUserId)
  if (!allowed) return NextResponse.json({ error: "Thread not available" }, { status: 403 })

  const typing = getThreadTypingState(threadId, user.appUserId)
  return NextResponse.json({ status: "ok", typing })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const allowed = await canAccessThread(threadId, user.appUserId)
  if (!allowed) return NextResponse.json({ error: "Thread not available" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const isTyping = Boolean(body?.isTyping)
  const profile = await (prisma as any).appUser.findUnique({
    where: { id: user.appUserId },
    select: { displayName: true, username: true },
  })

  setThreadTypingState({
    threadId,
    userId: user.appUserId,
    displayName: profile?.displayName ?? null,
    username: profile?.username ?? null,
    isTyping,
  })

  const typing = getThreadTypingState(threadId, user.appUserId)
  return NextResponse.json({ status: "ok", typing })
}
