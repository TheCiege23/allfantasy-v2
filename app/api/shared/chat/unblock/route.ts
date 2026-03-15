import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { unblockUserInSharedThreads } from '@/lib/platform/chat-service'
import { removeBlock } from '@/lib/moderation'

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const blockedUserId = String(body?.blockedUserId || '').trim()
  if (!blockedUserId) {
    return NextResponse.json({ error: 'blockedUserId is required' }, { status: 400 })
  }

  await removeBlock(user.appUserId, blockedUserId)
  const affectedThreads = await unblockUserInSharedThreads(user.appUserId, blockedUserId)
  return NextResponse.json({ status: 'ok', affectedThreads })
}

