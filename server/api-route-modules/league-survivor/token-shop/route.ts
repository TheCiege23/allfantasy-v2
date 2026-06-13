/**
 * GET /api/leagues/[leagueId]/survivor/token-shop
 * Returns the token shop catalog — what advantages are available for purchase
 * and their costs. Phase 2 advantages are clearly marked pending.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const TOKEN_SHOP_CATALOG = [
  { id: 'buy_clue', label: 'Idol Clue', cost: 2, status: 'available', description: 'Receive a clue to a hidden idol location.' },
  { id: 'buy_extra_vote', label: 'Extra Vote', cost: 4, status: 'pending', description: 'Cast an additional vote at tribal council. (Phase 3)' },
  { id: 'buy_vote_steal', label: 'Vote Steal', cost: 5, status: 'pending', description: 'Take another player\'s vote for one council. (Phase 3)' },
  { id: 'buy_waiver_priority_boost', label: 'Waiver Priority Boost', cost: 3, status: 'pending', description: 'Jump to priority waiver pick for one week. (Phase 3)' },
  { id: 'buy_protection', label: 'Challenge Protection', cost: 6, status: 'pending', description: 'Sit out a challenge without penalty. (Phase 3)' },
]

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

  const player = await prisma.survivorPlayer.findFirst({
    where: { leagueId, userId },
    select: { tokenBalance: true },
  })

  return NextResponse.json({
    catalog: TOKEN_SHOP_CATALOG,
    balance: player?.tokenBalance ?? 0,
    shopStatus: 'pending',
    shopNote: 'Token shop is Phase 2. buy_clue is available; other advantages are Phase 3.',
  })
}
