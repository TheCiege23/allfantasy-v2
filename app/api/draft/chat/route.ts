import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeague } from '@/lib/draft/access'

export const dynamic = 'force-dynamic'

/** POST draft chat message. `chimmy` messages are private (visibility) and not synced to league chat. */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const draftId = typeof body?.draftId === 'string' ? body.draftId.trim() : ''
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const messageType = typeof body?.messageType === 'string' ? body.messageType : 'message'

  if (!draftId || !text) {
    return NextResponse.json({ error: 'draftId and text required' }, { status: 400 })
  }

  const ds = await prisma.draftSession.findFirst({
    where: { id: draftId },
    select: { leagueId: true },
  })
  if (!ds) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!(await canAccessLeague(ds.leagueId, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isChimmy = messageType === 'chimmy'
  const msg = await prisma.draftChatMessage.create({
    data: {
      draftSessionId: draftId,
      authorId: userId,
      authorName: session?.user?.name ?? 'Manager',
      text,
      messageType,
      visibility: isChimmy ? 'private' : 'public',
      metadata: (body?.metadata as object) ?? undefined,
    },
  })

  if (!isChimmy) {
    // TODO: sync public draft chat to league chat + Discord when wired
  }

  return NextResponse.json({ id: msg.id })
}
