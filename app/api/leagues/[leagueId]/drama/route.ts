import { NextResponse } from 'next/server'
import { listDramaEvents } from '@/lib/drama-engine/DramaQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/drama
 * List drama events. Query: sport, season, dramaType, limit.
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
    const seasonParam = url.searchParams.get('season')
    const season = seasonParam != null ? parseInt(seasonParam, 10) : undefined
    const dramaType = url.searchParams.get('dramaType') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 30, 100) : 30

    const events = await listDramaEvents(leagueId, { sport, season, dramaType, limit })
    return NextResponse.json({ leagueId, events })
  } catch (e) {
    console.error('[drama GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list drama events' },
      { status: 500 }
    )
  }
}
