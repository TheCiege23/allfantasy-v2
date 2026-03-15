import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/promotion/rules/create
 * Body: { fromTierLevel: number, toTierLevel: number, promoteCount: number, relegateCount: number }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const fromTierLevel = typeof body.fromTierLevel === 'number' ? body.fromTierLevel : 1
    const toTierLevel = typeof body.toTierLevel === 'number' ? body.toTierLevel : 2
    const promoteCount = Math.max(0, typeof body.promoteCount === 'number' ? body.promoteCount : 1)
    const relegateCount = Math.max(0, typeof body.relegateCount === 'number' ? body.relegateCount : 1)

    const rule = await prisma.promotionRule.upsert({
      where: {
        leagueId_fromTierLevel_toTierLevel: {
          leagueId,
          fromTierLevel,
          toTierLevel,
        },
      },
      create: {
        leagueId,
        fromTierLevel,
        toTierLevel,
        promoteCount,
        relegateCount,
      },
      update: { promoteCount, relegateCount },
    })

    return NextResponse.json({
      ruleId: rule.id,
      leagueId: rule.leagueId,
      fromTierLevel: rule.fromTierLevel,
      toTierLevel: rule.toTierLevel,
      promoteCount: rule.promoteCount,
      relegateCount: rule.relegateCount,
    })
  } catch (e) {
    console.error('[promotion rules create POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create rule' },
      { status: 500 }
    )
  }
}
