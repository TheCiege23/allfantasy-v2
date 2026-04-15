import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { LeagueTradeBlockPanelItem } from '@/components/league/types'

export const dynamic = 'force-dynamic'

/**
 * Trade hub data for the league Trades tab: trade block entries synced to `TradeBlockEntry`, plus active trade count (future).
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const league = await prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [{ userId: userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: {
      id: true,
      platform: true,
      platformLeagueId: true,
      name: true,
    },
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const sleeperLeagueId =
    league.platform === 'sleeper' && league.platformLeagueId ? league.platformLeagueId : null

  if (!sleeperLeagueId) {
    return NextResponse.json({
      tradeBlock: [] as LeagueTradeBlockPanelItem[],
      activeTrades: [],
      activeCount: 0,
      source: 'native' as const,
    })
  }

  const tradeBlockRows = await prisma.tradeBlockEntry
    .findMany({
      where: {
        sleeperLeagueId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 48,
    })
    .catch(() => [])

  const tradeBlock: LeagueTradeBlockPanelItem[] = tradeBlockRows.map((row) => ({
    id: row.id,
    playerId: row.playerId,
    name: row.playerName,
    position: (row.position ?? 'FLEX').trim() || 'FLEX',
    team: row.team?.trim() || null,
    ownerName: row.createdByUsername?.trim() || 'Manager',
  }))

  return NextResponse.json({
    tradeBlock,
    activeTrades: [] as unknown[],
    activeCount: 0,
    source: 'sleeper' as const,
    leagueName: league.name ?? 'League',
  })
}
