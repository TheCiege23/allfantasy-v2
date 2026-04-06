import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { dispatchNotification } from '@/lib/notifications/NotificationDispatcher'
import { prisma } from '@/lib/prisma'
import { getLeagueIdFromVirtualRoom, isLeagueVirtualRoom } from '@/lib/chat-core'

export async function GET() {
  return NextResponse.json({ status: 'ok', mentions: [] })
}

/**
 * POST: record @mentions for a message so mentioned users receive a notification.
 * Body: { threadId, messageId, mentionedUsernames: string[] }
 */
export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const threadId = body?.threadId as string | undefined
  const messageId = body?.messageId as string | undefined
  const mentionedUsernames = Array.isArray(body?.mentionedUsernames)
    ? Array.from(
        new Set(
          (body.mentionedUsernames as string[])
            .map((u) => String(u).trim().replace(/^@+/, ''))
            .filter(Boolean)
        )
      )
    : []
  if (!threadId || !messageId || mentionedUsernames.length === 0) {
    return NextResponse.json({ status: 'ok' })
  }

  if (isLeagueVirtualRoom(threadId)) {
    const leagueId = getLeagueIdFromVirtualRoom(threadId)
    if (!leagueId) return NextResponse.json({ error: 'Invalid league room' }, { status: 400 })
    const leagueMessage = await (prisma as any).leagueChatMessage.findFirst({
      where: { id: messageId, leagueId, userId: user.appUserId },
      select: { id: true },
    })
    if (!leagueMessage) {
      return NextResponse.json({ error: 'Message not found or not owned by user' }, { status: 403 })
    }
  } else {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: user.appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    const ownMessage = await (prisma as any).platformChatMessage.findFirst({
      where: { id: messageId, threadId, senderUserId: user.appUserId },
      select: { id: true },
    })
    if (!ownMessage) {
      return NextResponse.json({ error: 'Message not found or not owned by user' }, { status: 403 })
    }
  }

  const sender = await (prisma as any).appUser.findUnique({
    where: { id: user.appUserId },
    select: { displayName: true, username: true, email: true },
  })
  const senderName = sender?.displayName || sender?.username || sender?.email || 'Someone'

  const users = await (prisma as any).appUser.findMany({
    where: {
      OR: mentionedUsernames.map((username) => ({
        username: { equals: username, mode: 'insensitive' as const },
      })),
      id: { not: user.appUserId },
    },
    select: { id: true },
  })

  const userIds = users.map((u: { id: string }) => u.id)
  if (userIds.length > 0) {
    const isLeague = isLeagueVirtualRoom(threadId)
    const leagueId = isLeague ? getLeagueIdFromVirtualRoom(threadId) : null
    const actionHref = isLeague && leagueId
      ? `/league/${encodeURIComponent(leagueId)}`
      : `/messages?thread=${encodeURIComponent(threadId)}&message=${encodeURIComponent(messageId)}`
    const bodyText = isLeague
      ? `${senderName} mentioned you in a league chat.`
      : `${senderName} mentioned you in a chat.`
    await dispatchNotification({
      userIds,
      category: 'chat_mentions',
      productType: 'app',
      type: 'mention',
      title: 'You were mentioned',
      body: bodyText,
      severity: 'low',
      actionHref,
      actionLabel: isLeague ? 'Open league chat' : 'Open mention',
      meta: { threadId, messageId, chatThreadId: threadId, leagueId: leagueId ?? undefined },
    })
  }

  return NextResponse.json({ status: 'ok', notified: userIds.length })
}
