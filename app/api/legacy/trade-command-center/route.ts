import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildLegacyMeta,
  buildTradeCommandCenterData,
  errorResponse,
  loadLegacyTabContext,
  okResponse,
} from '@/lib/legacy-tool/tab-api'

const QuerySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  includeIncomingOffers: z.string().optional(),
  includeSentOffers: z.string().optional(),
  includeExpiredOffers: z.string().optional(),
  includeOfferBuilder: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const requestId = `req_${Date.now()}_trade_center`
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = QuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'trade_command_center',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          'VALIDATION_ERROR',
          'leagueId and userId are required',
        ),
        { status: 400 },
      )
    }

    const { leagueId, userId } = parsed.data
    const ctx = await loadLegacyTabContext({ leagueId, userId })
    const data = buildTradeCommandCenterData({
      leagueId,
      userId,
      offseason: ctx.offseason,
    })

    return NextResponse.json(
      okResponse(
        'trade_command_center',
        data,
        buildLegacyMeta({
          confidence: 0.8,
          usedLiveNewsOverlay: ctx.usedLiveNewsOverlay,
          usedSimulation: false,
          needsRefreshMinutes: 2,
          requestId,
        }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build trade command center'
    return NextResponse.json(
      errorResponse(
        'trade_command_center',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
