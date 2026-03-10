import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformThreadTypedMessage } from '@/lib/platform/chat-service'

export async function POST(req: NextRequest, { params }: { params: { threadId: string } }) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const announcement = String(body?.announcement || body?.body || '').trim()
  if (!announcement) return NextResponse.json({ error: 'announcement is required' }, { status: 400 })

  const created = await createPlatformThreadTypedMessage(
    user.appUserId,
    decodeURIComponent(params.threadId),
    'broadcast',
    { announcement },
  )

  if (!created) return NextResponse.json({ error: 'Unable to post broadcast' }, { status: 400 })
  return NextResponse.json({ status: 'ok', message: created })
}
