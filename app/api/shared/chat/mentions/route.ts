import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformNotification } from '@/lib/platform/notification-service'
import { prisma } from '@/lib/prisma'

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
    ? (body.mentionedUsernames as string[]).map((u) => String(u).trim()).filter(Boolean)
    : []
  if (!threadId || !messageId || mentionedUsernames.length === 0) {
    return NextResponse.json({ status: 'ok' })
  }

  const sender = await (prisma as any).appUser.findUnique({
    where: { id: user.appUserId },
    select: { displayName: true, username: true, email: true },
  })
  const senderName = sender?.displayName || sender?.username || sender?.email || 'Someone'

  const users = await (prisma as any).appUser.findMany({
    where: {
      username: { in: mentionedUsernames },
      id: { not: user.appUserId },
    },
    select: { id: true },
  })

  for (const u of users) {
    await createPlatformNotification({
      userId: u.id,
      productType: 'app',
      type: 'mention',
      title: 'You were mentioned',
      body: `${senderName} mentioned you in a league chat.`,
      severity: 'low',
      meta: { threadId, messageId, chatThreadId: threadId },
    })
  }

  return NextResponse.json({ status: 'ok', notified: users.length })
}
