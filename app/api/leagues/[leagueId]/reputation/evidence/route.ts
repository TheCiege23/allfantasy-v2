import { NextResponse } from 'next/server'
import { listEvidenceForManager } from '@/lib/reputation-engine/ManagerTrustQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/reputation/evidence
 * Query: managerId (required), sport?, limit?.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId')
    if (!managerId) return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })

    const sport = url.searchParams.get('sport') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    const evidence = await listEvidenceForManager(leagueId, managerId, { sport, limit })
    return NextResponse.json({ leagueId, managerId, evidence })
  } catch (e) {
    console.error('[reputation/evidence GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list evidence' },
      { status: 500 }
    )
  }
}
