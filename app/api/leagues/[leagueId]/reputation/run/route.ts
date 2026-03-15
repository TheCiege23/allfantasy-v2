import { NextResponse } from 'next/server'
import { runReputationEngineForLeague } from '@/lib/reputation-engine/ReputationEngine'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/reputation/run
 * Run reputation engine for all teams in the league. Body: { sport?, replace? }.
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
      select: { id: true },
    })
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const sport = body.sport ?? undefined
    const replace = body.replace !== false

    const result = await runReputationEngineForLeague(leagueId, { sport, replace })
    return NextResponse.json({
      leagueId,
      processed: result.processed,
      created: result.created,
      updated: result.updated,
      results: result.results,
    })
  } catch (e) {
    console.error('[reputation/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run reputation engine' },
      { status: 500 }
    )
  }
}
