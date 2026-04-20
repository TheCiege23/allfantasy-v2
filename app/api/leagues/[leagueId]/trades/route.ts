import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { createAfLeagueTrade, listAfLeagueTrades } from '@/lib/league-trade-engine/tradeService'
import type { TradeAssetInput } from '@/lib/league-trade-engine/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const trades = await listAfLeagueTrades(leagueId, { take: 100 })
  return NextResponse.json({ trades })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const body = (await req.json().catch(() => ({}))) as {
    proposerRosterId?: string
    receiverRosterId?: string
    assets?: TradeAssetInput[]
    parentTradeId?: string | null
    expiresInHours?: number
    metadata?: Record<string, unknown>
    currentWeek?: number | null
  }

  if (!body.proposerRosterId || !body.receiverRosterId || !Array.isArray(body.assets)) {
    return NextResponse.json({ error: 'proposerRosterId, receiverRosterId, assets required' }, { status: 400 })
  }

  try {
    const { id } = await createAfLeagueTrade({
      leagueId,
      proposedByUserId: userId,
      proposerRosterId: body.proposerRosterId,
      receiverRosterId: body.receiverRosterId,
      assets: body.assets,
      parentTradeId: body.parentTradeId ?? null,
      expiresInHours: body.expiresInHours,
      metadata: body.metadata,
      currentWeek: body.currentWeek ?? null,
    })
    return NextResponse.json({ ok: true, tradeId: id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
