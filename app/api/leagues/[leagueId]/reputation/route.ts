import { NextResponse } from 'next/server'
import { listReputationsByLeague } from '@/lib/reputation-engine/ManagerTrustQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/reputation
 * Query: managerId (single), sport, tier, limit.
 * If managerId: return single reputation or null. Else: list by league with filters.
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
    const sport = url.searchParams.get('sport') ?? undefined
    const tier = url.searchParams.get('tier') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    if (managerId) {
      const { getReputationByLeagueAndManager } = await import('@/lib/reputation-engine/ManagerTrustQueryService')
      const profile = await getReputationByLeagueAndManager(leagueId, managerId)
      return NextResponse.json({ leagueId, reputation: profile ?? null })
    }

    const list = await listReputationsByLeague(leagueId, { sport, tier, limit })
    return NextResponse.json({ leagueId, reputations: list })
  } catch (e) {
    console.error('[reputation GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list reputation' },
      { status: 500 }
    )
  }
}
