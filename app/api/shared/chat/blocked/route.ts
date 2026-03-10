import { NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getBlockedUsers } from '@/lib/platform/chat-service'

export async function GET() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ status: 'ok', blockedUsers: [] })
  }

  const blockedUsers = await getBlockedUsers(user.appUserId)
  return NextResponse.json({ status: 'ok', blockedUsers })
}
