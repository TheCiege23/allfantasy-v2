import { NextResponse } from 'next/server'
import { listRivalries } from '@/lib/rivalry-engine/RivalryQueryService'
import { runRivalryEngine } from '@/lib/rivalry-engine/RivalryEngine'
import { getTradeCountByPairForGraph } from '@/lib/league-intelligence-graph/GraphHistoryAggregator'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/rivalries
 * List rivalries for the league. Query: sport, managerId, limit.
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
    const managerId = url.searchParams.get('managerId') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    const rivalries = await listRivalries(leagueId, { sport, managerId, limit })
    return NextResponse.json({ leagueId, rivalries })
  } catch (e) {
    console.error('[rivalries GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list rivalries' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leagues/[leagueId]/rivalries
 * Run the rivalry engine for the league (detect, score, persist). Body: { sport?, seasons? }.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true, season: true },
    })
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

    let body: { sport?: string; seasons?: number[] } = {}
    try {
      body = await req.json()
    } catch {
      // optional body
    }
    const sport = body.sport ?? league.sport ?? 'NFL'
    const seasons = Array.isArray(body.seasons) && body.seasons.length > 0
      ? body.seasons
      : [league.season ?? new Date().getFullYear()].filter(Boolean)

    const tradeCountByPair = await getTradeCountByPairForGraph(leagueId, null)
    const tradeCountByManagerPair = new Map<string, number>()
    for (const [key, count] of tradeCountByPair) {
      tradeCountByManagerPair.set(key, count)
    }

    const result = await runRivalryEngine({
      leagueId,
      sport,
      seasons,
      tradeCountByPair: tradeCountByManagerPair,
    })

    return NextResponse.json({ leagueId, ...result })
  } catch (e) {
    console.error('[rivalries POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run rivalry engine' },
      { status: 500 }
    )
  }
}
