/**
 * GET /api/leagues/[leagueId]/prestige-context
 * Returns unified prestige and governance context for AI and commissioner dashboards.
 * Query: sport (optional). If user is commissioner, includes commissionerTrustContext.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { buildAIPrestigeContext } from '@/lib/prestige-governance/AIPrestigeContextResolver'
import { buildCommissionerTrustContext } from '@/lib/prestige-governance/CommissionerTrustBridge'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const sport = url.searchParams.get('sport') ?? undefined

    const [aiContext, isComm] = await Promise.all([
      buildAIPrestigeContext(leagueId, sport),
      isCommissioner(leagueId, userId),
    ])

    const commissionerContext = isComm
      ? await buildCommissionerTrustContext(leagueId, { sport })
      : null

    return NextResponse.json({
      leagueId,
      sport: aiContext.sport,
      aiContext: {
        governanceSummary: aiContext.governanceSummary,
        reputationSummary: aiContext.reputationSummary,
        legacySummary: aiContext.legacySummary,
        hallOfFameSummary: aiContext.hallOfFameSummary,
        combinedHint: aiContext.combinedHint,
      },
      commissionerContext: commissionerContext ?? undefined,
    })
  } catch (e) {
    console.error('[prestige-context GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load prestige context' },
      { status: 500 }
    )
  }
}
