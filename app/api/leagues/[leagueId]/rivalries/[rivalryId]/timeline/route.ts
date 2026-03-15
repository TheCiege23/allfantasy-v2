import { NextResponse } from 'next/server'
import { buildTimelineForRivalry } from '@/lib/rivalry-engine/RivalryTimelineBuilder'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/rivalries/[rivalryId]/timeline
 * Get timeline events for a rivalry.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; rivalryId: string }> }
) {
  try {
    const { leagueId, rivalryId } = await ctx.params
    if (!rivalryId) return NextResponse.json({ error: 'Missing rivalryId' }, { status: 400 })

    const rivalry = await prisma.rivalryRecord.findFirst({
      where: { id: rivalryId, leagueId },
    })
    if (!rivalry) return NextResponse.json({ error: 'Rivalry not found' }, { status: 404 })

    const timeline = await buildTimelineForRivalry(rivalryId)
    return NextResponse.json({ rivalryId, leagueId, timeline })
  } catch (e) {
    console.error('[rivalries/[rivalryId]/timeline GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get timeline' },
      { status: 500 }
    )
  }
}
