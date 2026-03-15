import { NextResponse } from 'next/server'
import { getDramaEventById } from '@/lib/drama-engine/DramaQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/drama/[eventId]
 * Get a single drama event by id.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; eventId: string }> }
) {
  try {
    const { leagueId, eventId } = await ctx.params
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

    const event = await getDramaEventById(eventId)
    if (!event || event.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Drama event not found' }, { status: 404 })
    }
    return NextResponse.json(event)
  } catch (e) {
    console.error('[drama/[eventId] GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get event' },
      { status: 500 }
    )
  }
}
