import { NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getBlockedUsersWithDetails } from '@/lib/moderation'

export async function GET() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ status: 'ok', blockedUsers: [] })
  }

  const blockedUsers = await getBlockedUsersWithDetails(user.appUserId)
  return NextResponse.json({
    status: 'ok',
    blockedUsers: blockedUsers.map((u) => ({ userId: u.userId, username: u.username, displayName: u.displayName })),
  })
}
