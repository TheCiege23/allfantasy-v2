import { NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getPlatformThreadById } from '@/lib/platform/chat-service'

export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } },
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threadId = decodeURIComponent(params.threadId)
  const thread = await getPlatformThreadById(user.appUserId, threadId)

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  return NextResponse.json({ status: 'ok', thread })
}
