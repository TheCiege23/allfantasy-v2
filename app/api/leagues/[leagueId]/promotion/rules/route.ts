import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
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
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
