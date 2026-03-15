import { NextResponse } from 'next/server'
import { getReputationByLeagueAndManager } from '@/lib/reputation-engine/ManagerTrustQueryService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/reputation/explain
 * Body: { managerId }. Returns a short narrative explaining the manager's reputation (for AI "Explain" button).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId
    if (!managerId) return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })

    const reputation = await getReputationByLeagueAndManager(leagueId, managerId)
    if (!reputation) {
      return NextResponse.json({
        leagueId,
        managerId,
        narrative: 'No reputation record yet. Run the reputation engine in league settings to generate trust scores.',
        source: 'none',
      })
    }

    const parts: string[] = []
    parts.push(`Overall trust: ${reputation.tier} (${reputation.overallScore.toFixed(0)}/100).`)
    parts.push(`Reliability: ${reputation.reliabilityScore.toFixed(0)}. Activity: ${reputation.activityScore.toFixed(0)}. Trade fairness: ${reputation.tradeFairnessScore.toFixed(0)}.`)
    parts.push(`Sportsmanship: ${reputation.sportsmanshipScore.toFixed(0)}. Commissioner trust: ${reputation.commissionerTrustScore.toFixed(0)}. Toxicity risk: ${reputation.toxicityRiskScore.toFixed(0)}.`)
    const narrative = parts.join(' ')

    return NextResponse.json({
      leagueId,
      managerId,
      narrative,
      source: 'reputation_engine',
      tier: reputation.tier,
      overallScore: reputation.overallScore,
    })
  } catch (e) {
    console.error('[reputation/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain reputation' },
      { status: 500 }
    )
  }
}
