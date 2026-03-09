import { NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { markAllPlatformNotificationsRead } from '@/lib/platform/notification-service'

export async function PATCH() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ok = await markAllPlatformNotificationsRead(user.appUserId)
  if (!ok) {
    return NextResponse.json({ error: 'Unable to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok' })
}
