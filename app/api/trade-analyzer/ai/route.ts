import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { analyzeTradeWithOptionalAI } from '@/lib/trade-analyzer'
import { requireFeatureEntitlement } from '@/lib/subscription/entitlement-middleware'
import { TokenSpendService } from '@/lib/tokens/TokenSpendService'

const AssetSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  type: z.enum(['player', 'pick', 'faab']).optional(),
})

const SideSchema = z.object({
  managerName: z.string().min(1),
  gives: z.array(AssetSchema).min(1),
})

const TradeAnalyzerAIRequestSchema = z.object({
  sport: z.string().optional(),
  leagueFormat: z.string().optional(),
  leagueId: z.string().optional(),
  includeAI: z.boolean().optional().default(false),
  confirmTokenSpend: z.boolean().optional().default(false),
  sender: SideSchema,
  receiver: SideSchema,
})

export const dynamic = 'force-dynamic'

export const POST = withApiUsage({
  endpoint: '/api/trade-analyzer/ai',
  tool: 'TradeAnalyzerAI',
})(async (request: NextRequest, _ctx?: unknown) => {
  let userId: string | null = null
  let tokenFallbackLedgerId: string | null = null
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    userId = session?.user?.id ?? null
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let parsedInput: z.infer<typeof TradeAnalyzerAIRequestSchema>
    try {
      const body = await request.json()
      parsedInput = TradeAnalyzerAIRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request format', details: error.errors },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (parsedInput.leagueId) {
      try {
        await assertLeagueMember(parsedInput.leagueId, userId)
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const gate = await requireFeatureEntitlement({
      userId,
      featureId: 'trade_analyzer',
      allowTokenFallback: true,
      confirmTokenSpend: Boolean(parsedInput.confirmTokenSpend),
      tokenRuleCode: 'ai_trade_analyzer_full_review',
      tokenSourceType: 'trade_analyzer_ai',
      tokenSourceId: `${parsedInput.leagueId ?? 'trade'}:${Date.now()}`,
      tokenDescription: 'Trade analyzer full review',
      tokenMetadata: {
        leagueId: parsedInput.leagueId ?? null,
        sport: parsedInput.sport ?? null,
        includeAI: parsedInput.includeAI,
      },
    })
    if (!gate.ok) return gate.response
    if (gate.tokenSpend) tokenFallbackLedgerId = gate.tokenSpend.id

    const analysis = await analyzeTradeWithOptionalAI({
      sport: parsedInput.sport,
      leagueFormat: parsedInput.leagueFormat,
      includeAI: parsedInput.includeAI,
      sender: parsedInput.sender,
      receiver: parsedInput.receiver,
    })

    return NextResponse.json({
      success: true,
      analysis,
      tokenSpend: gate.tokenSpend
        ? {
            ruleCode: gate.tokenPreview?.ruleCode ?? 'ai_trade_analyzer_full_review',
            tokenCost: gate.tokenPreview?.tokenCost ?? null,
            balanceAfter: gate.tokenSpend.balanceAfter,
            ledgerId: gate.tokenSpend.id,
          }
        : null,
    })
  } catch (error) {
    if (tokenFallbackLedgerId && userId) {
      await new TokenSpendService()
        .refundSpendByLedger({
          userId,
          spendLedgerId: tokenFallbackLedgerId,
          refundRuleCode: 'feature_execution_failed',
          sourceType: 'trade_analyzer_ai_refund',
          sourceId: tokenFallbackLedgerId,
          idempotencyKey: `refund:trade_analyzer_ai:${tokenFallbackLedgerId}`,
          description: 'Auto refund after failed trade analyzer request.',
          metadata: {},
        })
        .catch(() => null)
    }
    console.error('[trade-analyzer/ai]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate trade' },
      { status: 500 }
    )
  }
})
