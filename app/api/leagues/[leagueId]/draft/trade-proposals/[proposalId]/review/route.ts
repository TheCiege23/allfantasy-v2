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
import { buildDraftTradeAiReview } from '@/lib/live-draft-engine/DraftTradeAiReviewService'
import { openaiChatText } from '@/lib/openai-client'
import { getProviderStatus } from '@/lib/provider-config'
import { sendPrivateTradeAIDM } from '@/lib/trade-ai-dm/TradeAIDMService'
import {
  buildDraftExecutionMetadata,
  evaluateAIInvocationPolicy,
  withTimeout,
} from '@/lib/draft-automation-policy'

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
  const body = await req.json().catch(() => ({}))
  const includeAiExplanation = Boolean(
    body?.includeAiExplanation ?? body?.include_ai_explanation ?? false
  )

  const review = buildDraftTradeAiReview({
    giveRound: proposal.giveRound,
    giveSlot: proposal.giveSlot,
    receiveRound: proposal.receiveRound,
    receiveSlot: proposal.receiveSlot,
    teamCount: proposal.session?.teamCount ?? 12,
  })

  const invocation = evaluateAIInvocationPolicy({
    feature: 'private_trade_review',
    scopeId: leagueId,
    requestAI: includeAiExplanation,
    aiEnabled: true,
    providerAvailable: getProviderStatus().anyAi,
  })

  let summary = review.summary
  let aiUsed = false
  let reasonCode = invocation.reasonCode

  if (invocation.decision === 'allow_ai') {
    const aiResult = await withTimeout(
      openaiChatText({
        messages: [
          {
            role: 'system',
            content:
              'You explain draft-pick trades in concise language for a private fantasy manager review. Keep facts unchanged and do not invent context.',
          },
          {
            role: 'user',
            content: [
              `Give pick: round ${proposal.giveRound}, slot ${proposal.giveSlot}`,
              `Receive pick: round ${proposal.receiveRound}, slot ${proposal.receiveSlot}`,
              `Team count: ${proposal.session?.teamCount ?? 12}`,
              `Deterministic verdict: ${review.verdict}`,
              `Deterministic reasons: ${review.reasons.join('; ')}`,
              `Counter reasons: ${review.counterReasons.join('; ')}`,
              `Decline reasons: ${review.declineReasons.join('; ')}`,
              `Suggested counter package: ${review.suggestedCounterPackage ?? 'none'}`,
              `Rewrite as a concise private review summary in 2-3 sentences.`,
            ].join('\n'),
          },
        ],
        temperature: 0.35,
        maxTokens: 180,
      }),
      invocation.maxLatencyMs
    )

    if (aiResult.ok && aiResult.value.ok && aiResult.value.text.trim().length > 0) {
      summary = aiResult.value.text.trim()
      aiUsed = true
      reasonCode = 'ai_private_trade_summary'
    } else if (!aiResult.ok) {
      reasonCode = 'ai_timeout_deterministic_fallback'
    } else {
      reasonCode = 'ai_error_deterministic_fallback'
    }
  }

  const privateAiDm = await sendPrivateTradeAIDM({
    receiverUserId: userId,
    leagueId,
    proposalId,
    review: {
      verdict: review.verdict,
      summary,
      reasons: review.reasons,
      counterReasons: review.counterReasons,
      declineReasons: review.declineReasons,
      suggestedCounterPackage: review.suggestedCounterPackage,
    },
    trigger: 'review_requested',
  })

  return NextResponse.json({
    ok: true,
    verdict: review.verdict,
    reasons: review.reasons,
    declineReasons: review.declineReasons,
    counterReasons: review.counterReasons,
    summary,
    suggestedCounterPackage: review.suggestedCounterPackage,
    privateAiDmSent: privateAiDm.sent,
    privateAiDmCounterSuggestion: privateAiDm.counterSuggestion,
    private: true,
    execution: buildDraftExecutionMetadata({
      feature: 'private_trade_review',
      aiUsed,
      aiEligible: invocation.canShowAIButton,
      reasonCode,
      fallbackToDeterministic: includeAiExplanation && !aiUsed && invocation.decision !== 'deny_dead_button',
    }),
  })
}
