import { NextResponse } from 'next/server'
import { listProfilesByLeague, getProfileByLeagueAndManager } from '@/lib/psychological-profiles/ManagerBehaviorQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/psychological-profiles
 * List behavior profiles for the league. Query: sport, managerId (single), limit.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId') ?? undefined
    if (managerId) {
      const profile = await getProfileByLeagueAndManager(leagueId, managerId)
      return NextResponse.json({ leagueId, profile: profile ?? null })
    }

    const sport = url.searchParams.get('sport') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    const profiles = await listProfilesByLeague(leagueId, { sport, limit })
    return NextResponse.json({ leagueId, profiles })
  } catch (e) {
    console.error('[psychological-profiles GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list profiles' },
      { status: 500 }
    )
  }
}
