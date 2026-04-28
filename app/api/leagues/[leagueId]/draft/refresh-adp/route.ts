/**
 * POST: Commissioner-triggered ADP refresh. Invalidates cached ADP rows so
 * the next pool fetch re-pulls from FFC + analytics. Use when the pool's
 * ADP column shows empty/stale values.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'
import { invalidateAdpCache, getLiveADP } from '@/lib/adp-data'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const gate = await assertLeagueActionGate(leagueId, userId, 'draft_commissioner_control')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.err.error, code: gate.err.code }, { status: gate.err.status })
  }

  const { deleted } = await invalidateAdpCache()
  const refreshed = await getLiveADP('redraft', 1000).catch(() => [])

  return NextResponse.json({
    ok: true,
    cacheRowsDeleted: deleted,
    adpEntriesFetched: refreshed.length,
    sampleTop10: refreshed.slice(0, 10).map((e) => ({ name: e.name, position: e.position, adp: e.adp })),
  })
}
