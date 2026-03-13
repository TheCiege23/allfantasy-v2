import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import {
  createSystemMessage,
  createPlatformThreadTypedMessage,
  setMessageHiddenByMod,
} from '@/lib/platform/chat-service'

async function getLeagueChatThreadId(leagueId: string): Promise<string | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = (league?.settings as Record<string, unknown>) || {}
  const id = settings.leagueChatThreadId
  return typeof id === 'string' ? id : null
}

/** Commissioner chat: broadcast, pin, remove_message. League chat thread must be set in league settings (leagueChatThreadId). */
export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || '').toLowerCase()

  if (action === 'broadcast') {
    const message = body?.message || body?.text
    if (!message) return NextResponse.json({ error: 'message required for broadcast' }, { status: 400 })
    const threadId = await getLeagueChatThreadId(params.leagueId)
    if (!threadId) {
      return NextResponse.json({
        status: 'not_linked',
        action: 'broadcast',
        message: 'Link a league chat thread in league settings (leagueChatThreadId) to send broadcasts.',
      }, { status: 400 })
    }
    const sent = await createSystemMessage(threadId, 'broadcast', `@everyone ${String(message).trim()}`)
    return NextResponse.json({
      status: sent ? 'sent' : 'failed',
      action: 'broadcast',
      stored: !!sent,
      messageId: sent?.id ?? null,
    })
  }

  if (action === 'pin') {
    const messageId = body?.messageId
    if (!messageId) return NextResponse.json({ error: 'messageId required for pin' }, { status: 400 })
    const threadId = await getLeagueChatThreadId(params.leagueId)
    if (!threadId) {
      return NextResponse.json({
        status: 'not_linked',
        action: 'pin',
        message: 'Link a league chat thread in league settings to use pin.',
      }, { status: 400 })
    }
    const sent = await createPlatformThreadTypedMessage(userId, threadId, 'pin', { messageId })
    return NextResponse.json({
      status: sent ? 'acknowledged' : 'failed',
      action: 'pin',
      messageId,
    })
  }

  if (action === 'remove_message' || action === 'remove') {
    const messageId = body?.messageId
    if (!messageId) return NextResponse.json({ error: 'messageId required for remove_message' }, { status: 400 })
    const threadId = await getLeagueChatThreadId(params.leagueId)
    if (!threadId) {
      return NextResponse.json({
        status: 'not_linked',
        message: 'Link a league chat thread in league settings to moderate messages.',
      }, { status: 400 })
    }
    const ok = await setMessageHiddenByMod(threadId, messageId, true)
    return NextResponse.json({
      status: ok ? 'removed' : 'failed',
      action: 'remove_message',
      messageId,
    })
  }

  return NextResponse.json({ error: 'Invalid action. Use: broadcast, pin, remove_message' }, { status: 400 })
}
