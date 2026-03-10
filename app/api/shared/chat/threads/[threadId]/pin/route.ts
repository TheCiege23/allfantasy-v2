import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformThreadTypedMessage } from '@/lib/platform/chat-service'

export async function POST(req: NextRequest, { params }: { params: { threadId: string } }) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const messageId = String(body?.messageId || '').trim()
  if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 })

  const created = await createPlatformThreadTypedMessage(user.appUserId, decodeURIComponent(params.threadId), 'pin', { messageId })
  if (!created) return NextResponse.json({ error: 'Unable to pin message' }, { status: 400 })

  return NextResponse.json({ status: 'ok', message: created })
}
