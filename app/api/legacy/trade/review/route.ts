import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildLegacyMeta,
  buildTradeReviewData,
  errorResponse,
  okResponse,
  type TradeAsset,
} from '@/lib/legacy-tool/tab-api'

const TradeAssetSchema = z.object({
  assetType: z.enum(['player', 'pick']),
  assetId: z.string().min(1),
  name: z.string().min(1),
  position: z.string().optional(),
  team: z.string().optional(),
  season: z.number().optional(),
  round: z.number().optional(),
  originalOwnerTeamId: z.string().optional(),
})

const BodySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  tradeId: z.string().optional(),
  mode: z.enum(['incoming', 'sent', 'manual']),
  currentTeamDirection: z.enum(['all_in_contender', 'contender', 'retool', 'soft_rebuild', 'full_rebuild']).optional(),
  includeCounterSuggestions: z.boolean().optional(),
  includeRenegotiationAdvice: z.boolean().optional(),
  trade: z
    .object({
      fromTeamId: z.string().min(1),
      toTeamId: z.string().min(1),
      send: z.array(TradeAssetSchema),
      receive: z.array(TradeAssetSchema),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_trade_review`
  try {
    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'trade_review',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          'VALIDATION_ERROR',
          'leagueId, userId, mode, and either tradeId or trade payload are required',
        ),
        { status: 400 },
      )
    }

    const payload = parsed.data
    if (!payload.tradeId && !payload.trade) {
      return NextResponse.json(
        errorResponse(
          'trade_review',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          'VALIDATION_ERROR',
          'Either tradeId or trade must be supplied',
        ),
        { status: 400 },
      )
    }

    const data = await buildTradeReviewData({
      tradeId: payload.tradeId,
      trade: payload.trade
        ? {
            fromTeamId: payload.trade.fromTeamId,
            toTeamId: payload.trade.toTeamId,
            send: payload.trade.send as TradeAsset[],
            receive: payload.trade.receive as TradeAsset[],
          }
        : undefined,
      includeCounterSuggestions: payload.includeCounterSuggestions,
      includeRenegotiationAdvice: payload.includeRenegotiationAdvice,
    })

    return NextResponse.json(
      okResponse(
        'trade_review',
        data,
        buildLegacyMeta({
          confidence: data.review.confidence,
          usedLiveNewsOverlay: true,
          usedSimulation: false,
          needsRefreshMinutes: 2,
          requestId,
        }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to review trade'
    return NextResponse.json(
      errorResponse(
        'trade_review',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
