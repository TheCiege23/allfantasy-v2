import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { deactivateTradeBlockItem, resolveCallerContext, TradeBlockValidationError } from '@/lib/trade-block/redraftTradeBlockService'
import { recordRedraftTradeSignalEvent } from '@/lib/trade-market/redraftTradeMarketEvents'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ itemId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await ctx.params
  const item = await prisma.redraftTradeBlockItem.findUnique({ where: { id: itemId } })
  if (!item) return NextResponse.json({ error: 'Trade block item not found' }, { status: 404 })

  const gate = await assertLeagueMember(item.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const caller = await resolveCallerContext(item.leagueId, userId)
  if (!caller.rosterId) return NextResponse.json({ error: 'You do not have a roster in this league' }, { status: 403 })

  try {
    await deactivateTradeBlockItem(itemId, caller.rosterId)
    if (caller.seasonId) {
      await recordRedraftTradeSignalEvent({
        leagueId: item.leagueId,
        seasonId: caller.seasonId,
        refId: itemId,
        eventType: 'trade_block_removed',
        actorUserId: userId,
        payload: { playerId: item.playerId },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof TradeBlockValidationError) return NextResponse.json({ error: e.message }, { status: 403 })
    return NextResponse.json({ error: 'Failed to remove trade block item' }, { status: 400 })
  }
}
