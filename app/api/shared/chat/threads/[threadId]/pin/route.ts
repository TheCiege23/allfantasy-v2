import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformThreadTypedMessage } from '@/lib/platform/chat-service'
import { prisma } from '@/lib/prisma'

const PIN_SNIPPET_MAX = 120

export async function POST(req: NextRequest, { params }: { params: { threadId: string } }) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const body = await req.json().catch(() => ({}))
  const messageId = String(body?.messageId || '').trim()
  if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 })

  let snippet: string | undefined
  const ref = await prisma.platformChatMessage.findFirst({
    where: { id: messageId, threadId },
    select: { body: true, messageType: true },
  })
  if (ref?.body) {
    const raw = typeof ref.body === 'string' ? ref.body : JSON.stringify(ref.body)
    snippet = raw.slice(0, PIN_SNIPPET_MAX).trim()
    if (raw.length > PIN_SNIPPET_MAX) snippet += '…'
  }

  const created = await createPlatformThreadTypedMessage(
    user.appUserId,
    threadId,
    'pin',
    { messageId, snippet: snippet || 'Pinned message' }
  )
  if (!created) return NextResponse.json({ error: 'Unable to pin message' }, { status: 400 })

  return NextResponse.json({ status: 'ok', message: created })
}
