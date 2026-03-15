import { NextResponse } from 'next/server'
import { startBroadcastSession } from '@/lib/broadcast-engine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/broadcast/session
 * Body: { sport?, createdBy? }
 * Starts a broadcast session and returns sessionId, leagueId, sport, startedAt.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const result = await startBroadcastSession(leagueId, {
      sport: body.sport ?? undefined,
      createdBy: body.createdBy ?? undefined,
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[broadcast session POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to start broadcast session' },
      { status: 500 }
    )
  }
}
