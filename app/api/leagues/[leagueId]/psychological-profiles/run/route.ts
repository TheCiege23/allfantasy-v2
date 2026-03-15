import { NextResponse } from 'next/server'
import { runPsychologicalProfileEngine } from '@/lib/psychological-profiles/PsychologicalProfileEngine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/psychological-profiles/run
 * Run the psychological profile engine for one manager. Body: { managerId, sport?, sleeperUsername?, rosterId? }.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { managerId, sport, sleeperUsername, rosterId } = body
    if (!managerId) return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })

    const result = await runPsychologicalProfileEngine({
      leagueId,
      managerId: String(managerId),
      sport: sport ?? 'NFL',
      sleeperUsername,
      rosterId,
    })
    return NextResponse.json({ leagueId, ...result })
  } catch (e) {
    console.error('[psychological-profiles/run POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run profile engine' },
      { status: 500 }
    )
  }
}
