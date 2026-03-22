import { NextResponse } from 'next/server'
import { getRivalryById } from '@/lib/rivalry-engine/RivalryQueryService'
import { buildTimelineForRivalry } from '@/lib/rivalry-engine/RivalryTimelineBuilder'
import { getRivalryTierLabel } from '@/lib/rivalry-engine/RivalryTierResolver'
import { getRivalrySportLabel } from '@/lib/rivalry-engine/SportRivalryResolver'
import { openaiChatText } from '@/lib/openai-client'
import { listProfilesByLeague } from '@/lib/psychological-profiles/ManagerBehaviorQueryService'
import { listDramaEvents } from '@/lib/drama-engine/DramaQueryService'

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

    const [timeline, profileRows, linkedDrama] = await Promise.all([
      buildTimelineForRivalry(rivalryId),
      listProfilesByLeague(leagueId, {
        sport: rivalry.sport,
        managerAId: rivalry.managerAId,
        managerBId: rivalry.managerBId,
        limit: 4,
      }).catch(() => []),
      listDramaEvents(leagueId, {
        sport: rivalry.sport,
        limit: 50,
      })
        .then((events) =>
          events.filter((event) => {
            const managerHit =
              event.relatedManagerIds.includes(rivalry.managerAId) &&
              event.relatedManagerIds.includes(rivalry.managerBId)
            const teamHit =
              event.relatedTeamIds.includes(rivalry.managerAId) &&
              event.relatedTeamIds.includes(rivalry.managerBId)
            return managerHit || teamHit
          })
        )
        .catch(() => []),
    ])
    const tierLabel = getRivalryTierLabel(rivalry.rivalryTier)
    const sportLabel = getRivalrySportLabel(rivalry.sport)

    const fallbackNarrative = [
      `This is a ${tierLabel.toLowerCase()} rivalry in ${sportLabel}.`,
      `Managers ${rivalry.managerAId} and ${rivalry.managerBId} have a rivalry score of ${rivalry.rivalryScore.toFixed(1)}/100.`,
      rivalry.eventCount && rivalry.eventCount > 0
        ? `The timeline includes ${rivalry.eventCount} recorded events (head-to-head matchups, close games, upsets, trades).`
        : 'History is still being collected for this pair.',
      profileRows.length > 0
        ? `Behavior profile context is available for ${profileRows.length} manager(s) in this rivalry.`
        : 'Behavior profile context is limited for this pair.',
      linkedDrama.length > 0
        ? `${linkedDrama.length} linked drama storyline(s) reinforce this rivalry thread.`
        : 'No linked drama storyline has been recorded yet.',
    ].join(' ')

    const timelinePreview = timeline.slice(0, 10).map((e) => ({
      eventType: e.eventType,
      season: e.season,
      description: e.description,
      createdAt: e.createdAt,
    }))
    const aiNarrative = await openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are a concise fantasy rivalry analyst. In 2-4 sentences, explain why this rivalry matters now and what to watch next. Be specific and factual.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            leagueId,
            rivalryId,
            sport: sportLabel,
            tier: rivalry.rivalryTier,
            score: rivalry.rivalryScore,
            managerAId: rivalry.managerAId,
            managerBId: rivalry.managerBId,
            eventCount: rivalry.eventCount ?? 0,
            profileContext: profileRows.map((p) => ({
              managerId: p.managerId,
              profileLabels: p.profileLabels,
              activityScore: p.activityScore,
              riskToleranceScore: p.riskToleranceScore,
            })),
            linkedDrama: linkedDrama.slice(0, 5).map((d) => ({
              id: d.id,
              dramaType: d.dramaType,
              headline: d.headline,
              dramaScore: d.dramaScore,
            })),
            timelinePreview,
          }),
        },
      ],
      temperature: 0.4,
      maxTokens: 220,
    }).catch(() => null)
    const narrative = aiNarrative?.ok && aiNarrative.text?.trim()
      ? aiNarrative.text.trim()
      : fallbackNarrative

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
