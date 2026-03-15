import { NextResponse } from 'next/server'
import { getRivalryById } from '@/lib/rivalry-engine/RivalryQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/rivalries/[rivalryId]
 * Get a single rivalry by id.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; rivalryId: string }> }
) {
  try {
    const { rivalryId } = await ctx.params
    if (!rivalryId) return NextResponse.json({ error: 'Missing rivalryId' }, { status: 400 })

    const rivalry = await getRivalryById(rivalryId)
    if (!rivalry) return NextResponse.json({ error: 'Rivalry not found' }, { status: 404 })

    return NextResponse.json(rivalry)
  } catch (e) {
    console.error('[rivalries/[rivalryId] GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get rivalry' },
      { status: 500 }
    )
  }
}
