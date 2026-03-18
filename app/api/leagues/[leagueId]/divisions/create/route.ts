import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/divisions/create
 * Body: { tierLevel: number, sport?: string, name?: string }
 * Commissioner only.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const tierLevel = typeof body.tierLevel === 'number' ? body.tierLevel : 1
    const sport = normalizeToSupportedSport(body.sport ?? null)
    const name = typeof body.name === 'string' ? body.name : null

    const league = await prisma.league.findUnique({ where: { id: leagueId } })
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

    const division = await prisma.leagueDivision.create({
      data: {
        leagueId,
        tierLevel,
        sport,
        name: name || `Tier ${tierLevel}`,
      },
    })

    return NextResponse.json({
      divisionId: division.id,
      leagueId: division.leagueId,
      tierLevel: division.tierLevel,
      sport: division.sport,
      name: division.name,
    })
  } catch (e) {
    console.error('[divisions create POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create division' },
      { status: 500 }
    )
  }
}
