import { NextResponse } from 'next/server'
import { runPromotionRelegation } from '@/lib/promotion-relegation'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/promotion/run
 * Body: { dryRun?: boolean }
 * Runs promotion/relegation for the league; returns planned or applied transitions.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const dryRun = !!body.dryRun

    const result = await runPromotionRelegation({ leagueId, dryRun })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[promotion run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run promotion' },
      { status: 500 }
    )
  }
}
