/**
 * POST: Private AI trade review for the receiving manager.
 * Returns suggested verdict (accept | reject | counter), reasons, and optional counter/decline reasons.
 * Does not post to league chat; for private use only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string; proposalId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, proposalId } = await ctx.params
  if (!leagueId || !proposalId) return NextResponse.json({ error: 'Missing leagueId or proposalId' }, { status: 400 })
  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const myRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const proposal = await (prisma as any).draftPickTradeProposal.findFirst({
    where: { id: proposalId },
    include: { session: { select: { leagueId: true, teamCount: true } } },
  })
  if (!proposal || proposal.session?.leagueId !== leagueId) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }
  if (proposal.receiverRosterId !== myRosterId) {
    return NextResponse.json({ error: 'Only the receiver can request AI review' }, { status: 403 })
  }
  if (proposal.status !== 'pending') {
    return NextResponse.json({ error: 'Proposal already responded to' }, { status: 400 })
  }

  // Deterministic suggestion from pick swap: earlier pick generally more valuable; same round is even.
  const teamCount = proposal.session?.teamCount ?? 12
  const giveOverall = (proposal.giveRound - 1) * teamCount + proposal.giveSlot
  const receiveOverall = (proposal.receiveRound - 1) * teamCount + proposal.receiveSlot
  const giveLabel = `${proposal.giveRound}.${String(proposal.giveSlot).padStart(2, '0')}`
  const receiveLabel = `${proposal.receiveRound}.${String(proposal.receiveSlot).padStart(2, '0')}`

  let verdict: 'accept' | 'reject' | 'counter' = 'accept'
  const reasons: string[] = []
  let declineReasons: string[] = []
  let counterReasons: string[] = []

  if (receiveOverall < giveOverall) {
    verdict = 'accept'
    reasons.push(`You would receive an earlier pick (${receiveLabel}) for a later pick (${giveLabel}); typically favorable.`)
  } else if (receiveOverall > giveOverall) {
    verdict = 'counter'
    reasons.push(`You are giving an earlier pick (${giveLabel}) for a later one (${receiveLabel}). Consider countering for additional value.`)
    counterReasons.push('Ask for an extra later-round pick or a player if league allows.')
  } else {
    verdict = 'accept'
    reasons.push('Same-round swap; even value. Accept if it improves your draft position preference.')
  }

  return NextResponse.json({
    ok: true,
    verdict,
    reasons,
    declineReasons,
    counterReasons,
    summary: reasons[0] ?? 'Review the pick values and your roster needs.',
    private: true,
  })
}
