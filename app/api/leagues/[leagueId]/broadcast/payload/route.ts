import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { getBroadcastPayload } from '@/lib/broadcast-engine'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

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

    const url = new URL(req.url)
    const sportRaw = url.searchParams.get('sport') ?? undefined
    const sport =
      sportRaw == null || sportRaw.trim().length === 0
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

    const weekParam = url.searchParams.get('week')
    const week =
      weekParam == null || weekParam.trim().length === 0
        ? undefined
        : Number(weekParam)
    if (week !== undefined && (!Number.isInteger(week) || week < 1)) {
      return NextResponse.json({ error: 'Invalid week' }, { status: 400 })
    }

    const payload = await getBroadcastPayload({ leagueId, sport: access.leagueSport, week: week ?? null })
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[broadcast payload GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load broadcast payload' },
      { status: 500 }
    )
  }
}
