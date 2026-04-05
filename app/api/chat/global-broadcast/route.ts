import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'
import { getLeagueMemberUserIds } from '@/lib/league-chat/leagueMemberIds'
import { dispatchNotification } from '@/lib/notifications/NotificationDispatcher'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const selectedLeagueIds = Array.isArray(body?.selectedLeagueIds)
    ? Array.from(new Set((body.selectedLeagueIds as string[]).map(String).filter(Boolean)))
    : []
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const messageType = (body?.messageType as string) || 'text'

  if (selectedLeagueIds.length === 0) {
    return NextResponse.json({ error: 'No leagues selected' }, { status: 400 })
  }

  const leagues = await prisma.league.findMany({
    where: { id: { in: selectedLeagueIds }, userId },
    select: { id: true, name: true },
  })
  if (leagues.length === 0) {
    return NextResponse.json({ error: 'No leagues you commission' }, { status: 403 })
  }

  const broadcastId = randomUUID()
  const sender = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { displayName: true, username: true, email: true },
  })
  const commissionerName = sender?.displayName || sender?.username || sender?.email || 'Commissioner'

  const metaPayload: Record<string, unknown> = {
    globalBroadcast: true,
    messageType,
    event: body?.event ?? null,
    poll: body?.poll ?? null,
    gif: body?.gifUrl ?? null,
    image: body?.imageUrl ?? null,
  }

  let createdCount = 0
  for (const league of leagues) {
    const display =
      text ||
      (messageType === 'event' && body?.event?.title ? `📅 ${body.event.title}` : '') ||
      (messageType === 'poll' && body?.poll?.question ? `📊 ${body.poll.question}` : '') ||
      '📡 League announcement'

    const row = await createLeagueChatMessage(league.id, userId, display, {
      type: messageType === 'poll' ? 'poll' : messageType === 'event' ? 'text' : 'text',
      messageSubtype: 'global_broadcast',
      globalBroadcastId: broadcastId,
      metadata: metaPayload,
    })
    if (row) createdCount++

    const memberIds = await getLeagueMemberUserIds(league.id)
    const targets = memberIds.filter((id) => id !== userId)
    if (targets.length > 0) {
      await dispatchNotification({
        userIds: targets,
        category: 'league_announcements',
        productType: 'app',
        type: 'global_broadcast',
        title: '📡 League announcement',
        body: `${commissionerName} posted an announcement in ${league.name ?? 'your league'}.`,
        severity: 'low',
        actionHref: `/app/league/${encodeURIComponent(league.id)}`,
        actionLabel: 'View message',
        meta: { leagueId: league.id, globalBroadcastId: broadcastId },
      })
    }
  }

  return NextResponse.json({
    success: true,
    sentToLeagues: createdCount,
    broadcastId,
  })
}
