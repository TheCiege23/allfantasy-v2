import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveManagerIntelligencePayload } from '@/lib/decision-os/dashboard-intelligence'

export const dynamic = 'force-dynamic'

/**
 * Decision OS — Phase 8.1 real Manager DNA + Recommendations for the signed-in
 * user in one league. Read-only. Degraded-safe: `resolveManagerIntelligencePayload`
 * never throws — a pipeline failure returns honest nulls, not a 500.
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

  const payload = await resolveManagerIntelligencePayload({ leagueId, managerId: userId })
  return NextResponse.json(payload)
}
