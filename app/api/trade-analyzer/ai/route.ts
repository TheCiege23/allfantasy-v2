import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { analyzeTradeWithOptionalAI } from '@/lib/trade-analyzer'
import {
  FeatureGateService,
  isFeatureGateAccessError,
} from '@/lib/subscription/FeatureGateService'

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
  sender: SideSchema,
  receiver: SideSchema,
})

export const dynamic = 'force-dynamic'

export const POST = withApiUsage({
  endpoint: '/api/trade-analyzer/ai',
  tool: 'TradeAnalyzerAI',
})(async (request: NextRequest) => {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gate = new FeatureGateService()
    await gate.assertUserHasFeature(session.user.id, 'trade_analyzer')

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
        await assertLeagueMember(parsedInput.leagueId, session.user.id)
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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
    })
  } catch (error) {
    if (isFeatureGateAccessError(error)) {
      return NextResponse.json(
        {
          error: 'Premium feature',
          code: error.code,
          message: error.message,
          requiredPlan: error.requiredPlan,
          upgradePath: error.upgradePath,
        },
        { status: error.statusCode }
      )
    }
    console.error('[trade-analyzer/ai]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate trade' },
      { status: 500 }
    )
  }
})
