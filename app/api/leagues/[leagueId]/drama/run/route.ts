import { NextResponse } from 'next/server'
import { runLeagueDramaEngine } from '@/lib/drama-engine/LeagueDramaEngine'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/drama/run
 * Run the drama engine for the league. Body: { sport?, season?, replace? }.
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

    const body = await req.json().catch(() => ({}))
    const sport = body.sport ?? league.sport ?? 'NFL'
    const season = body.season ?? league.season ?? new Date().getFullYear()
    const replace = body.replace === true

    const result = await runLeagueDramaEngine({
      leagueId,
      sport,
      season,
      replace,
    })
    return NextResponse.json({ leagueId, ...result })
  } catch (e) {
    console.error('[drama/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run drama engine' },
      { status: 500 }
    )
  }
}
