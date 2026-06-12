/**
 * GET /api/leagues/[leagueId]/survivor/idols
 * Returns idol inventory for the requesting user.
 * - Own idols: always visible (status, power, play window).
 * - Other players' idols: hidden unless commissioner or revealed (played/used).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status ?? 403 })

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
  const isCommissioner = league?.userId === userId

  if (isCommissioner) {
    const allIdols = await prisma.survivorIdol.findMany({ where: { leagueId } })
    return NextResponse.json({ idols: allIdols, isCommissioner: true })
  }

  // Non-commissioner: own + publicly revealed (played/expired)
  const visible = await prisma.survivorIdol.findMany({
    where: {
      leagueId,
      OR: [
        { currentOwnerUserId: userId },
        { status: { in: ['played', 'expired', 'revealed'] } },
      ],
    },
    select: {
      id: true,
      powerType: true,
      status: true,
      foundWeek: true,
      playedWeek: true,
      currentOwnerUserId: true,
    },
  })
  return NextResponse.json({ idols: visible, isCommissioner: false })
}
