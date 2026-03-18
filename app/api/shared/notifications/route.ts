import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getPlatformNotifications } from '@/lib/platform/notification-service'

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') || '40')
    const user = await resolvePlatformUser()

    if (!user.appUserId) {
      return NextResponse.json({ status: 'ok', notifications: [] })
    }

    const notifications = await getPlatformNotifications(user.appUserId, Math.min(Math.max(limit, 1), 100))
    return NextResponse.json({ status: 'ok', notifications })
  } catch (e) {
    console.error('[shared/notifications GET]', e)
    return NextResponse.json({ status: 'ok', notifications: [] })
  }
}
