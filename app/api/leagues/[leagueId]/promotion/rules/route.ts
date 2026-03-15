import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { PromotionRuleView } from '@/lib/promotion-relegation/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/promotion/rules
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const rules = await prisma.promotionRule.findMany({
      where: { leagueId },
      orderBy: [{ fromTierLevel: 'asc' }, { toTierLevel: 'asc' }],
    })

    const list: PromotionRuleView[] = rules.map((r) => ({
      ruleId: r.id,
      leagueId: r.leagueId,
      fromTierLevel: r.fromTierLevel,
      toTierLevel: r.toTierLevel,
      promoteCount: r.promoteCount,
      relegateCount: r.relegateCount,
    }))

    return NextResponse.json({ leagueId, rules: list })
  } catch (e) {
    console.error('[promotion rules GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list rules' },
      { status: 500 }
    )
  }
}
