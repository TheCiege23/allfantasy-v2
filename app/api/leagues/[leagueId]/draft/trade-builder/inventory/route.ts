/**
 * GET: Upcoming draft picks each roster still owns (respects tradedPicks + board).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { getDraftSessionByLeague } from '@/lib/live-draft-engine/DraftSessionService'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'
import type { TradedPickRecord } from '@/lib/live-draft-engine/types'
import { computeUpcomingOwnedPicks } from '@/lib/live-draft-engine/draftPickTradeInventory'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const draftSession = await getDraftSessionByLeague(leagueId)
  if (!draftSession || draftSession.status !== 'in_progress') {
    return NextResponse.json({
      draftInProgress: false,
      mine: [],
      byRosterId: {},
    })
  }

  const myRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)

  const rawSlotOrder = (draftSession as { slotOrder?: unknown }).slotOrder
  const slotOrder = (Array.isArray(rawSlotOrder) ? rawSlotOrder : []) as unknown as SlotOrderEntry[]
  const rawTradedPicks = (draftSession as { tradedPicks?: unknown }).tradedPicks
  const tradedPicks = (Array.isArray(rawTradedPicks) ? rawTradedPicks : []) as unknown as TradedPickRecord[]
  const picks = ((draftSession as { picks?: { overall: number }[] }).picks ?? []) as { overall: number }[]
  const pickedOverall = new Set(picks.map((p) => p.overall))
  const teamCount = Number((draftSession as { teamCount?: number }).teamCount ?? 12)
  const rounds = Number((draftSession as { rounds?: number }).rounds ?? 15)
  const totalPicks = Math.max(1, teamCount * rounds)
  const draftType = ((draftSession as { draftType?: string }).draftType ?? 'snake') as 'snake' | 'linear' | 'auction'
  const thirdRoundReversal = Boolean((draftSession as { thirdRoundReversal?: boolean }).thirdRoundReversal)

  const baseParams = {
    totalPicks,
    pickedOverall,
    teamCount,
    draftType,
    thirdRoundReversal,
    slotOrder,
    tradedPicks,
  }

  const byRosterId: Record<string, ReturnType<typeof computeUpcomingOwnedPicks>> = {}
  const rosterIds = [...new Set(slotOrder.map((s) => s.rosterId))]
  for (const rosterId of rosterIds) {
    byRosterId[rosterId] = computeUpcomingOwnedPicks({
      ...baseParams,
      ownerRosterId: rosterId,
    })
  }

  return NextResponse.json({
    draftInProgress: true,
    draftType,
    rounds,
    teamCount,
    thirdRoundReversal,
    myRosterId,
    mine: myRosterId ? byRosterId[myRosterId] ?? [] : [],
    byRosterId,
  })
}
