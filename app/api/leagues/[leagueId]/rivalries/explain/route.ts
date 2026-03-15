import { NextResponse } from 'next/server'
import { getRivalryById } from '@/lib/rivalry-engine/RivalryQueryService'
import { buildTimelineForRivalry } from '@/lib/rivalry-engine/RivalryTimelineBuilder'
import { getRivalryTierLabel } from '@/lib/rivalry-engine/RivalryTierResolver'
import { getRivalrySportLabel } from '@/lib/rivalry-engine/SportRivalryResolver'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/rivalries/explain
 * Body: { rivalryId: string }
 * Returns a short narrative explanation of the rivalry (for "Explain this rivalry" UI).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    let body: { rivalryId?: string } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const rivalryId = body.rivalryId
    if (!rivalryId) return NextResponse.json({ error: 'Missing rivalryId' }, { status: 400 })

    const rivalry = await getRivalryById(rivalryId)
    if (!rivalry || rivalry.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Rivalry not found' }, { status: 404 })
    }

    const timeline = await buildTimelineForRivalry(rivalryId)
    const tierLabel = getRivalryTierLabel(rivalry.rivalryTier)
    const sportLabel = getRivalrySportLabel(rivalry.sport)

    const narrative = [
      `This is a ${tierLabel.toLowerCase()} rivalry in ${sportLabel}.`,
      `Managers ${rivalry.managerAId} and ${rivalry.managerBId} have a rivalry score of ${rivalry.rivalryScore.toFixed(1)}/100.`,
      rivalry.eventCount && rivalry.eventCount > 0
        ? `The timeline includes ${rivalry.eventCount} recorded events (head-to-head matchups, close games, upsets, trades).`
        : 'History is still being collected for this pair.',
    ].join(' ')

    return NextResponse.json({
      rivalryId,
      leagueId,
      narrative,
      tier: rivalry.rivalryTier,
      score: rivalry.rivalryScore,
      eventCount: rivalry.eventCount,
      timelinePreview: timeline.slice(0, 5),
    })
  } catch (e) {
    console.error('[rivalries/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain rivalry' },
      { status: 500 }
    )
  }
}
