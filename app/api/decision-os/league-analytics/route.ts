import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLeagueAnalyticsSnapshot } from '@/lib/decision-os/leagueAnalytics'

export const dynamic = 'force-dynamic'

/**
 * Commissioner OS Demo Breadth — Phase C Increment 4.
 *
 * League Analytics read API for one league. Mirrors `/api/decision-os/mission-control`'s contract
 * exactly (session-gated, `leagueId` required, degraded-safe). Read-only.
 * `resolveLeagueAnalyticsSnapshot` never throws — a pipeline failure returns an honest
 * `available: false` snapshot, not a 500.
 */
export async function GET(request: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = new URL(request.url).searchParams.get('leagueId')?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  const snapshot = await resolveLeagueAnalyticsSnapshot(leagueId)
  return NextResponse.json(snapshot)
}
