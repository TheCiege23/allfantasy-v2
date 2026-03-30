import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { answerAICommissionerQuestion } from '@/lib/ai-commissioner'
import { requireFeatureEntitlement } from '@/lib/subscription/entitlement-middleware'
import { TokenSpendService } from '@/lib/tokens/TokenSpendService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertLeagueMember(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    question: string
    sport: string
    season: number | string
    confirmTokenSpend: boolean
  }>
  const question = String(body.question ?? '').trim()
  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }
  const confirmTokenSpend = body.confirmTokenSpend === true

  const seasonCandidate =
    typeof body.season === 'number'
      ? body.season
      : typeof body.season === 'string'
        ? Number.parseInt(body.season, 10)
        : NaN
  const season = Number.isFinite(seasonCandidate) ? seasonCandidate : null

  const gate = await requireFeatureEntitlement({
    userId,
    featureId: 'commissioner_automation',
    allowTokenFallback: true,
    confirmTokenSpend,
    tokenRuleCode: 'commissioner_ai_chat_question',
    tokenSourceType: 'commissioner_ai_chat',
    tokenSourceId: `${leagueId}:${Date.now()}`,
    tokenDescription: 'AI Commissioner question',
    tokenMetadata: {
      leagueId,
      sport: body.sport ?? null,
      season,
    },
  })
  if (!gate.ok) return gate.response

  const spendService = new TokenSpendService()
  const spendLedgerId = gate.tokenSpend?.id ?? null
  try {
    const result = await answerAICommissionerQuestion({
      leagueId,
      question,
      sport: body.sport ?? null,
      season,
    })

    return NextResponse.json({
      ...result,
      tokenSpend: gate.tokenSpend
        ? {
            ruleCode: gate.tokenPreview?.ruleCode ?? 'commissioner_ai_chat_question',
            tokenCost: gate.tokenPreview?.tokenCost ?? null,
            balanceAfter: gate.tokenSpend.balanceAfter,
            ledgerId: gate.tokenSpend.id,
          }
        : null,
    })
  } catch (error) {
    if (spendLedgerId) {
      await spendService
        .refundSpendByLedger({
          userId,
          spendLedgerId,
          refundRuleCode: 'feature_execution_failed',
          sourceType: 'commissioner_ai_chat_refund',
          sourceId: spendLedgerId,
          idempotencyKey: `refund:commissioner_ai_chat:${spendLedgerId}`,
          description: 'Auto refund after failed AI Commissioner question.',
          metadata: { leagueId },
        })
        .catch(() => null)
    }

    console.error('[ai-commissioner/chat POST]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to reach AI Commissioner' }, { status: 500 })
  }
}
