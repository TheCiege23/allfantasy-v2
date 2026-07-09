import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveMissionControlSnapshot } from '@/lib/decision-os/missionControl'

export const dynamic = 'force-dynamic'

/**
 * Commissioner OS Surface Alignment — Phase B Increment 5.
 *
 * Mission Control read API for one league. Mirrors `/api/decision-os/manager-intelligence`'s
 * contract exactly (session-gated, `leagueId` required, degraded-safe). Read-only.
 * `resolveMissionControlSnapshot` never throws — a pipeline failure returns an honest
 * `leagueHealth: { available: false }` snapshot, not a 500.
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

  const snapshot = await resolveMissionControlSnapshot(leagueId)
  return NextResponse.json(snapshot)
}
