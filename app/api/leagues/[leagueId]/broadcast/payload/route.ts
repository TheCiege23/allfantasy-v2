import { NextResponse } from 'next/server'
import { getBroadcastPayload } from '@/lib/broadcast-engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/broadcast/payload
 * Query: sport, week.
 * Returns full broadcast payload (standings, matchups, storylines, rivalries) for the broadcast UI.
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
    const weekParam = url.searchParams.get('week')
    const week = weekParam != null ? parseInt(weekParam, 10) : undefined

    const payload = await getBroadcastPayload({ leagueId, sport, week: week ?? null })
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[broadcast payload GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load broadcast payload' },
      { status: 500 }
    )
  }
}
