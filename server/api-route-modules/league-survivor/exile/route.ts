/**
 * GET /api/leagues/[leagueId]/survivor/exile
 * Returns exile island status for the league.
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

  const exileIsland = await prisma.exileIsland.findFirst({ where: { leagueId } })
  const myPlayer = await prisma.survivorPlayer.findFirst({ where: { leagueId, userId } })

  return NextResponse.json({
    exileIsland,
    isExiled: myPlayer?.playerState === 'exile',
    automationStatus: exileIsland?.isActive ? 'active' : 'pending',
  })
}
