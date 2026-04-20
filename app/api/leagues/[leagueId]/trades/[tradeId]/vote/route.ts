import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { castAfTradeVetoVote } from '@/lib/league-trade-engine/tradeService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string; tradeId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, tradeId } = await ctx.params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const body = (await req.json().catch(() => ({}))) as {
    voterRosterId?: string
    vote?: 'veto' | 'allow'
  }
  if (!body.voterRosterId || !body.vote) {
    return NextResponse.json({ error: 'voterRosterId and vote required' }, { status: 400 })
  }

  try {
    await castAfTradeVetoVote({
      tradeId,
      leagueId,
      userId,
      voterRosterId: body.voterRosterId,
      vote: body.vote,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
