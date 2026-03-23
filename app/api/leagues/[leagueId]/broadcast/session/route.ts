import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { onMatchupCommentary } from '@/lib/commentary-engine'
import { getBroadcastPayload, startBroadcastSession } from '@/lib/broadcast-engine'
import type { BroadcastMatchupRow } from '@/lib/broadcast-engine/types'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

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
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
    let access
    try {
      access = await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!access.isCommissioner) {
      return NextResponse.json({ error: 'Forbidden: commissioner only' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const sportRaw = typeof body.sport === 'string' ? body.sport.trim() : undefined
    const sport =
      sportRaw == null || sportRaw.length === 0
        ? undefined
        : isSupportedSport(sportRaw)
          ? normalizeToSupportedSport(sportRaw)
          : null
    if (sport === null) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    if (sport && sport !== access.leagueSport) {
      return NextResponse.json({ error: 'Sport does not match league sport' }, { status: 400 })
    }

    const result = await startBroadcastSession(leagueId, {
      sport: access.leagueSport,
      createdBy: session.user.id,
    })
    void emitOpeningMatchupCommentary({
      leagueId,
      sport: access.leagueSport,
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

async function emitOpeningMatchupCommentary(input: { leagueId: string; sport: string }) {
  try {
    const payload = await getBroadcastPayload({
      leagueId: input.leagueId,
      sport: input.sport,
      week: null,
    })
    const featured = pickFeaturedMatchup(payload.matchups)
    if (!featured) return
    await onMatchupCommentary(
      {
        eventType: 'matchup_commentary',
        leagueId: input.leagueId,
        sport: normalizeToSupportedSport(input.sport),
        leagueName: payload.leagueName ?? undefined,
        teamAName: featured.teamAName,
        teamBName: featured.teamBName,
        scoreA: featured.scoreA,
        scoreB: featured.scoreB,
        week: featured.weekOrPeriod,
        season: featured.season ?? undefined,
        situation: deriveSituation(featured.scoreA, featured.scoreB),
      },
      { skipStats: true, persist: true }
    )
  } catch {
    // non-fatal
  }
}

function pickFeaturedMatchup(matchups: BroadcastMatchupRow[]): BroadcastMatchupRow | null {
  if (!Array.isArray(matchups) || matchups.length === 0) return null
  return [...matchups]
    .sort((a, b) => {
      const marginA = Math.abs((a.scoreA ?? 0) - (a.scoreB ?? 0))
      const marginB = Math.abs((b.scoreA ?? 0) - (b.scoreB ?? 0))
      if (marginA !== marginB) return marginA - marginB
      return (b.scoreA ?? 0) + (b.scoreB ?? 0) - ((a.scoreA ?? 0) + (a.scoreB ?? 0))
    })[0] ?? null
}

function deriveSituation(scoreA: number, scoreB: number): string {
  const margin = Math.abs((scoreA ?? 0) - (scoreB ?? 0))
  if (margin <= 5) return 'nail-biter'
  if (margin >= 25) return 'blowout'
  return 'closing in'
}
