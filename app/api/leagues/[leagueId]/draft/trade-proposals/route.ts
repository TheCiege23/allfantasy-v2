/**
 * GET: List draft pick trade proposals for this session (pending for current user as receiver, or all for commissioner).
 * POST: Create a draft pick trade proposal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { getDraftSessionByLeague } from '@/lib/live-draft-engine/DraftSessionService'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { prisma } from '@/lib/prisma'
import { isDraftPickTradingAllowedForLeague } from '@/lib/tournament-mode/safety'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
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
  if (!draftSession) return NextResponse.json({ proposals: [] })

  const myRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const commissioner = await isCommissioner(leagueId, userId)

  const where: { sessionId: string; status?: string; receiverRosterId?: string } = { sessionId: draftSession.id }
  if (!commissioner) {
    where.status = 'pending'
    if (myRosterId) where.receiverRosterId = myRosterId
    else {
      const empty = await (prisma as any).draftPickTradeProposal.findMany({ where: { sessionId: draftSession.id, status: 'pending' }, take: 0 })
      return NextResponse.json({ proposals: [] })
    }
  }

  const list = await (prisma as any).draftPickTradeProposal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({
    proposals: list.map((p: any) => ({
      id: p.id,
      sessionId: p.sessionId,
      proposerRosterId: p.proposerRosterId,
      receiverRosterId: p.receiverRosterId,
      giveRound: p.giveRound,
      giveSlot: p.giveSlot,
      giveOriginalRosterId: p.giveOriginalRosterId,
      receiveRound: p.receiveRound,
      receiveSlot: p.receiveSlot,
      receiveOriginalRosterId: p.receiveOriginalRosterId,
      proposerName: p.proposerName,
      receiverName: p.receiverName,
      status: p.status,
      respondedAt: p.respondedAt?.toISOString?.() ?? null,
      responsePayload: p.responsePayload,
      createdAt: p.createdAt.toISOString(),
    })),
  })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const myRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  if (!myRosterId) return NextResponse.json({ error: 'You do not have a roster in this league' }, { status: 403 })

  const draftPickTradingAllowed = await isDraftPickTradingAllowedForLeague(leagueId)
  if (!draftPickTradingAllowed) {
    return NextResponse.json({ error: 'Draft pick trading is disabled in Tournament Mode leagues.' }, { status: 403 })
  }

  const draftSession = await getDraftSessionByLeague(leagueId)
  if (!draftSession || draftSession.status !== 'in_progress') {
    return NextResponse.json({ error: 'No draft in progress' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const giveRound = Math.max(1, Number(body.giveRound) || 1)
  const giveSlot = Math.max(1, Number(body.giveSlot) || 1)
  const receiveRound = Math.max(1, Number(body.receiveRound) || 1)
  const receiveSlot = Math.max(1, Number(body.receiveSlot) || 1)
  const receiverRosterId = body.receiverRosterId ?? body.receiver_roster_id
  const receiverName = body.receiverName ?? body.receiver_name ?? ''

  if (!receiverRosterId) return NextResponse.json({ error: 'receiverRosterId required' }, { status: 400 })

  const slotOrder = (draftSession.slotOrder as { slot: number; rosterId: string; displayName: string }[]) ?? []
  const giveSlotEntry = slotOrder.find((e: any) => e.slot === giveSlot)
  const receiveSlotEntry = slotOrder.find((e: any) => e.slot === receiveSlot)
  if (!giveSlotEntry || giveSlotEntry.rosterId !== myRosterId) {
    return NextResponse.json({ error: 'You can only offer a pick you own (give slot must be your slot)' }, { status: 400 })
  }
  if (!receiveSlotEntry || receiveSlotEntry.rosterId !== receiverRosterId) {
    return NextResponse.json({ error: 'Receive slot must belong to the receiver' }, { status: 400 })
  }

  const proposerName = giveSlotEntry.displayName ?? ''

  const created = await (prisma as any).draftPickTradeProposal.create({
    data: {
      sessionId: draftSession.id,
      proposerRosterId: myRosterId,
      receiverRosterId,
      giveRound,
      giveSlot,
      giveOriginalRosterId: myRosterId,
      receiveRound,
      receiveSlot,
      receiveOriginalRosterId: receiverRosterId,
      proposerName,
      receiverName: receiverName || receiveSlotEntry.displayName || null,
      status: 'pending',
    },
  })

  const { createDraftNotification, getAppUserIdForRoster } = await import('@/lib/draft-notifications')
  const receiverUserId = await getAppUserIdForRoster(receiverRosterId)
  if (receiverUserId) {
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
    void createDraftNotification(receiverUserId, 'draft_trade_offer_received', {
      leagueId,
      leagueName: league?.name ?? undefined,
      tradeProposalId: created.id,
    })
  }

  return NextResponse.json({
    ok: true,
    proposal: {
      id: created.id,
      giveRound: created.giveRound,
      giveSlot: created.giveSlot,
      receiveRound: created.receiveRound,
      receiveSlot: created.receiveSlot,
      receiverRosterId: created.receiverRosterId,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    },
  })
}
