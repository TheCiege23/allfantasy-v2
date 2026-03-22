import { NextResponse } from 'next/server'
import { openaiChatText } from '@/lib/openai-client'
import { buildAIRelationshipContext } from '@/lib/relationship-insights'
import { normalizeOptionalSportForRelationship } from '@/lib/relationship-insights/SportRelationshipResolver'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const seasonCandidate =
      typeof body?.season === 'number'
        ? body.season
        : typeof body?.season === 'string'
          ? parseInt(body.season, 10)
          : NaN
    const season =
      Number.isFinite(seasonCandidate) && !Number.isNaN(seasonCandidate) ? seasonCandidate : null
    const sport = normalizeOptionalSportForRelationship(body?.sport ?? null)

    const context = await buildAIRelationshipContext({
      leagueId,
      sport,
      season,
      focusManagerId:
        typeof body?.focusManagerId === 'string' ? body.focusManagerId.trim() : undefined,
      focusRivalryId:
        typeof body?.focusRivalryId === 'string' ? body.focusRivalryId.trim() : undefined,
      focusDramaEventId:
        typeof body?.focusDramaEventId === 'string' ? body.focusDramaEventId.trim() : undefined,
    })

    const fallback = (() => {
      const payload = context.payload as Record<string, unknown>
      const sportLabel = String(payload.sportLabel ?? payload.sport ?? 'league')
      const storylines = Array.isArray(payload.storylines)
        ? (payload.storylines as Array<{ headline?: string; storylineScore?: number }>)
        : []
      const top = storylines[0]
      if (top?.headline) {
        return `${top.headline} currently leads the ${sportLabel} storyline board, and the relationship graph suggests this thread is likely to stay active over the next slate.`
      }
      return `Relationship and storyline signals are synchronized for this ${sportLabel} league, with rivalry, behavior, graph, and drama data aligned for downstream AI explanation.`
    })()

    const ai = await openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are a fantasy league relationship analyst. Write a concise 3-5 sentence explanation that blends graph structure, rivalry intensity, manager behavior profile context, and drama timeline signals. Keep it factual and specific.',
        },
        {
          role: 'user',
          content: context.promptContext,
        },
      ],
      temperature: 0.45,
      maxTokens: 320,
    }).catch(() => null)

    return NextResponse.json({
      narrative: ai?.ok && ai.text?.trim() ? ai.text.trim() : fallback,
      source: ai?.ok && ai.text?.trim() ? 'ai' : 'template',
      context: context.payload,
    })
  } catch (e) {
    console.error('[relationship-insights/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain relationship insights' },
      { status: 500 }
    )
  }
}
