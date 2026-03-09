import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getPlatformNotifications } from '@/lib/platform/notification-service'

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') || '40')
  const user = await resolvePlatformUser()

  if (!user.appUserId) {
    return NextResponse.json({ status: 'ok', notifications: [] })
  }

  const notifications = await getPlatformNotifications(user.appUserId, limit)
  return NextResponse.json({ status: 'ok', notifications })
}
