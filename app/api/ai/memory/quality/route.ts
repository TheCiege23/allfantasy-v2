import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getChimmyQualityMetrics } from '@/lib/chimmy-quality/ChimmyQualityAnalytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? 30)
  const days = Number.isFinite(daysParam) ? daysParam : 30

  const metrics = await getChimmyQualityMetrics({
    userId: user.appUserId,
    periodDays: days,
  })

  return NextResponse.json({ ok: true, metrics })
}
