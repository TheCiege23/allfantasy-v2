import { NextResponse } from 'next/server'
import { generateCommentary } from '@/lib/commentary-engine'
import type { CommentaryContext } from '@/lib/commentary-engine/types'

export const dynamic = 'force-dynamic'

const VALID_EVENT_TYPES = ['matchup_commentary', 'trade_reaction', 'waiver_reaction', 'playoff_drama'] as const

/**
 * POST /api/leagues/[leagueId]/commentary/generate
 * Body: eventType + context fields per type. Optional: skipStats, persist.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const eventType = body.eventType as string
    if (!VALID_EVENT_TYPES.includes(eventType as any)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }

    const base = {
      leagueId,
      sport: body.sport ?? 'NFL',
      leagueName: body.leagueName ?? undefined,
      eventType,
    }

    let context: CommentaryContext
    if (eventType === 'matchup_commentary') {
      context = {
        ...base,
        eventType: 'matchup_commentary',
        teamAName: String(body.teamAName ?? 'Team A'),
        teamBName: String(body.teamBName ?? 'Team B'),
        scoreA: Number(body.scoreA) || 0,
        scoreB: Number(body.scoreB) || 0,
        week: body.week != null ? Number(body.week) : undefined,
        season: body.season != null ? Number(body.season) : undefined,
        situation: body.situation,
      }
    } else if (eventType === 'trade_reaction') {
      context = {
        ...base,
        eventType: 'trade_reaction',
        managerA: String(body.managerA ?? 'Manager A'),
        managerB: String(body.managerB ?? 'Manager B'),
        summary: String(body.summary ?? 'Trade completed'),
        tradeType: body.tradeType,
      }
    } else if (eventType === 'waiver_reaction') {
      context = {
        ...base,
        eventType: 'waiver_reaction',
        managerName: String(body.managerName ?? 'Manager'),
        playerName: String(body.playerName ?? 'Player'),
        action: body.action === 'drop' ? 'drop' : body.action === 'claim' ? 'claim' : 'add',
        position: body.position,
        faabSpent: body.faabSpent != null ? Number(body.faabSpent) : undefined,
      }
    } else {
      context = {
        ...base,
        eventType: 'playoff_drama',
        headline: String(body.headline ?? 'Playoff moment'),
        summary: String(body.summary ?? ''),
        dramaType: body.dramaType,
      }
    }

    const result = await generateCommentary(context, {
      skipStatisticalContext: !!body.skipStats,
      persist: body.persist !== false,
    })

    if (!result) return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[commentary generate POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate commentary' },
      { status: 500 }
    )
  }
}
