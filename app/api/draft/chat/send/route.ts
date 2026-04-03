import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSessionKey } from '@/lib/draft/session-key'
import { canAccessLeague } from '@/lib/draft/access'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null; image?: string | null }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const mode = typeof body?.mode === 'string' ? body.mode : 'mock'

  if (!sessionId || !message) {
    return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 })
  }

  let parsed: { mode: 'mock' | 'live'; id: string }
  try {
    parsed = parseSessionKey(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  if (parsed.mode === 'live') {
    const ok = await canAccessLeague(parsed.id, userId)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { displayName: true, username: true, avatarUrl: true },
  })
  const name = user?.displayName ?? user?.username ?? session?.user?.name ?? 'Manager'

  const row = await prisma.draftRoomChatMessage.create({
    data: {
      sessionKey: sessionId,
      leagueId: parsed.mode === 'live' ? parsed.id : null,
      roomId: parsed.mode === 'mock' ? parsed.id : null,
      userId,
      authorDisplayName: name,
      authorAvatar: user?.avatarUrl ?? null,
      message,
      type: 'user',
    },
  })

  if (mode === 'live' && parsed.mode === 'live') {
    await createLeagueChatMessage(parsed.id, userId, `[Draft Room] ${name}: ${message}`, {
      source: 'draft',
    })
  }

  return NextResponse.json({
    message: {
      id: row.id,
      authorDisplayName: row.authorDisplayName,
      authorAvatar: row.authorAvatar,
      message: row.message,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
    },
  })
}
