import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformThreadMessage, getPlatformThreadMessages } from '@/lib/platform/chat-service'

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threadId = decodeURIComponent(params.threadId)
  const limit = Number(req.nextUrl.searchParams.get('limit') || '50')
  const messages = await getPlatformThreadMessages(user.appUserId, threadId, limit)

  return NextResponse.json({ status: 'ok', messages })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threadId = decodeURIComponent(params.threadId)
  const body = await req.json().catch(() => ({}))
  const message = String(body?.body || '').trim()
  const metadata =
    body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined

  if (!message) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 })
  }

  const created = await createPlatformThreadMessage(
    user.appUserId,
    threadId,
    message,
    String(body?.messageType || 'text'),
    metadata,
  )

  if (!created) {
    return NextResponse.json({ error: 'Unable to send message' }, { status: 400 })
  }

  return NextResponse.json({ status: 'ok', message: created })
}
