import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildMatchupCenterPayload } from '@/server/services/matchupCenterService'
import { assertValidMatchupPayload } from '@/lib/matchup-center/validateMatchupPayload'
import { dedupeLeagueRequest } from '@/lib/league-engine-performance/leagueRequestDedupe'
import { withLeagueEngineTimedOperation } from '@/lib/league-engine-performance/jobRunner'
import { DEFAULT_SLOW_ROUTE_MS } from '@/lib/league-engine-performance/observability'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user!.id
  const { leagueId } = await params
  const sp = req.nextUrl.searchParams
  const season = sp.get('season') ? Number(sp.get('season')) : undefined
  const week = sp.get('week') ? Number(sp.get('week')) : undefined
  const seasonKey = Number.isFinite(season!) ? String(season) : 'current'
  const weekKey = Number.isFinite(week!) ? String(week) : 'current'

  const out = await dedupeLeagueRequest(
    {
      leagueId,
      surface: 'matchup_center',
      fragments: [userId, seasonKey, weekKey],
    },
    () =>
      withLeagueEngineTimedOperation(
        {
          subsystem: 'matchup',
          action: 'matchup_center_get',
          leagueId,
          slowThresholdMs: DEFAULT_SLOW_ROUTE_MS,
        },
        () =>
          buildMatchupCenterPayload({
            leagueId,
            viewerUserId: userId,
            season: Number.isFinite(season!) ? season : undefined,
            week: Number.isFinite(week!) ? week : undefined,
          }),
      ),
  )

  if ('error' in out) {
    return NextResponse.json({ error: out.error }, { status: out.status })
  }

  const v = assertValidMatchupPayload(out)
  if (!v.ok) {
    console.warn('[matchup-center] payload validation', v.errors)
  }

  return NextResponse.json({ payload: out, validation: v })
}
