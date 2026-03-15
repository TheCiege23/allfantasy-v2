import { NextResponse } from 'next/server'
import { listDivisionsByLeague } from '@/lib/promotion-relegation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/divisions
 * Query: sport.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const url = new URL(req.url)
    const sport = url.searchParams.get('sport') ?? undefined

    const divisions = await listDivisionsByLeague(leagueId, { sport })
    return NextResponse.json({ leagueId, divisions })
  } catch (e) {
    console.error('[divisions GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list divisions' },
      { status: 500 }
    )
  }
}
