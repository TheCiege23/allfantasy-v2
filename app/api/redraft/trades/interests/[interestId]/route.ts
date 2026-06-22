import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { deactivateInterest, resolveCallerContext, TradeBlockValidationError } from '@/lib/trade-block/redraftTradeBlockService'
import { recordRedraftTradeSignalEvent } from '@/lib/trade-market/redraftTradeMarketEvents'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ interestId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { interestId } = await ctx.params
  const interest = await prisma.redraftTradeInterest.findUnique({ where: { id: interestId } })
  if (!interest) return NextResponse.json({ error: 'Interest not found' }, { status: 404 })

  const gate = await assertLeagueMember(interest.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const caller = await resolveCallerContext(interest.leagueId, userId)
  if (!caller.rosterId) return NextResponse.json({ error: 'You do not have a roster in this league' }, { status: 403 })

  try {
    await deactivateInterest(interestId, caller.rosterId)
    if (caller.seasonId) {
      await recordRedraftTradeSignalEvent({
        leagueId: interest.leagueId,
        seasonId: caller.seasonId,
        refId: interestId,
        eventType: 'trade_interest_removed',
        actorUserId: userId,
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof TradeBlockValidationError) return NextResponse.json({ error: e.message }, { status: 403 })
    return NextResponse.json({ error: 'Failed to remove interest' }, { status: 400 })
  }
}
