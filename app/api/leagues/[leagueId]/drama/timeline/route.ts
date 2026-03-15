import { NextResponse } from 'next/server'
import { buildTimelineForLeague } from '@/lib/drama-engine/DramaTimelineBuilder'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/drama/timeline
 * Get ordered timeline of drama events. Query: sport, season, limit.
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
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    const timeline = await buildTimelineForLeague(leagueId, { sport, season, limit })
    return NextResponse.json({ leagueId, timeline })
  } catch (e) {
    console.error('[drama/timeline GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get timeline' },
      { status: 500 }
    )
  }
}
