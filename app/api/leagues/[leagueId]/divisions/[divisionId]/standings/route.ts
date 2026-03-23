import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { getStandingsWithZones, getStandingsForDivision } from '@/lib/promotion-relegation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/divisions/[divisionId]/standings
 * Returns standings for the division; if a promotion rule exists for this tier, includes promotion/relegation zone flags.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; divisionId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, divisionId } = await ctx.params
    if (!leagueId || !divisionId) {
      return NextResponse.json({ error: 'Missing leagueId or divisionId' }, { status: 400 })
    }
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const division = await prisma.leagueDivision.findFirst({
      where: { id: divisionId, leagueId },
    })
    if (!division) return NextResponse.json({ error: 'Division not found' }, { status: 404 })

    const rule = await prisma.promotionRule.findFirst({
      where: {
        leagueId,
        OR: [
          { fromTierLevel: division.tierLevel },
          { toTierLevel: division.tierLevel },
        ],
      },
    })

    const promoteCount = rule
      ? rule.toTierLevel === division.tierLevel
        ? rule.promoteCount
        : 0
      : 0
    const relegateCount = rule
      ? rule.fromTierLevel === division.tierLevel
        ? rule.relegateCount
        : 0
      : 0

    const standings =
      promoteCount > 0 || relegateCount > 0
        ? await getStandingsWithZones({
            divisionId,
            promoteCount,
            relegateCount,
          })
        : await getStandingsForDivision(divisionId)

    return NextResponse.json({
      leagueId,
      divisionId,
      divisionName: division.name,
      tierLevel: division.tierLevel,
      standings,
    })
  } catch (e) {
    console.error('[division standings GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load standings' },
      { status: 500 }
    )
  }
}
