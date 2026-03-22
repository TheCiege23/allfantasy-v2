import { NextResponse } from 'next/server'
import { getDramaEventById } from '@/lib/drama-engine/DramaQueryService'
import { buildDramaNarrative } from '@/lib/drama-engine/AIDramaNarrativeAdapter'
import { buildAIRelationshipContext } from '@/lib/relationship-insights'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/drama/tell-story
 * Body: { eventId: string }
 * Returns narrative for "Tell me the story" button.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const eventId = body.eventId
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

    const event = await getDramaEventById(eventId)
    if (!event || event.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Drama event not found' }, { status: 404 })
    }

    const relationshipContext = await buildAIRelationshipContext({
      leagueId,
      sport: event.sport,
      season: event.season,
      focusDramaEventId: event.id,
      focusManagerId: event.relatedManagerIds[0] ?? undefined,
    }).catch(() => null)

    const storylinePreview =
      relationshipContext?.payload &&
      Array.isArray((relationshipContext.payload as { storylines?: unknown[] }).storylines)
        ? (relationshipContext.payload as { storylines?: Array<{ headline?: string }> }).storylines?.[0]
            ?.headline ?? null
        : null

    const enrichedSummary = [event.summary, storylinePreview ? `Linked relationship storyline: ${storylinePreview}` : null]
      .filter(Boolean)
      .join(' ')

    const { narrative, source } = await buildDramaNarrative({
      ...event,
      summary: enrichedSummary || event.summary,
    })
    return NextResponse.json({
      eventId,
      leagueId,
      narrative,
      source,
      headline: event.headline,
      dramaType: event.dramaType,
      relationshipContextUsed: Boolean(relationshipContext),
    })
  } catch (e) {
    console.error('[drama/tell-story POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to build story' },
      { status: 500 }
    )
  }
}
