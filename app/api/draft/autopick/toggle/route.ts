import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSessionKey } from '@/lib/draft/session-key'
import { canAccessLeague } from '@/lib/draft/access'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const enabled = body?.enabled === true

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
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

  await prisma.draftAutopickSetting.upsert({
    where: { userId_sessionKey: { userId, sessionKey: sessionId } },
    create: { userId, sessionKey: sessionId, enabled },
    update: { enabled, updatedAt: new Date() },
  })

  return NextResponse.json({ success: true, enabled })
}
