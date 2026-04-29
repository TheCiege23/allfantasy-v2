import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMemberWithCode } from '@/lib/league/league-access'
import {
  fetchSleeperDraftPicksJson,
  fetchSleeperLeagueDraftChain,
} from '@/lib/sleeper/sync/sleeperHostedDraftHistory'

export const dynamic = 'force-dynamic'

/**
 * GET — Sleeper draft picks for the synced draft id shown in league settings.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; draftId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, draftId } = await ctx.params
  if (!leagueId?.trim() || !draftId?.trim()) {
    return NextResponse.json({ error: 'Missing leagueId or draftId' }, { status: 400 })
  }

  const access = await assertLeagueMemberWithCode(leagueId.trim(), userId)
  if (!access.ok) {
    return NextResponse.json({ error: 'Forbidden', code: access.code }, { status: access.httpStatus })
  }

  const league = access.league
  if (String(league.platform).toLowerCase() !== 'sleeper') {
    return NextResponse.json({ error: 'Not a Sleeper-hosted league' }, { status: 400 })
  }
  const platformLeagueId = league.platformLeagueId?.trim()
  if (!platformLeagueId) {
    return NextResponse.json({ error: 'Missing platform league id' }, { status: 400 })
  }

  try {
    const trimmedDraftId = draftId.trim()
    const draftRows = await fetchSleeperLeagueDraftChain(platformLeagueId)
    const draftBelongsToLeague = draftRows.some((row) => row.draftId === trimmedDraftId)
    if (!draftBelongsToLeague) {
      return NextResponse.json({ error: 'Draft not found for league' }, { status: 404 })
    }

    const picks = await fetchSleeperDraftPicksJson(trimmedDraftId)
    return NextResponse.json({ picks })
  } catch (e) {
    console.error('[sleeper-hosted-draft picks]', e)
    return NextResponse.json({ error: 'Failed to load draft picks' }, { status: 502 })
  }
}
