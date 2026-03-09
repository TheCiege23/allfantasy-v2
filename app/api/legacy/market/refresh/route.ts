import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildLegacyMeta,
  buildOffseasonDashboardData,
  buildTradeCommandCenterData,
  errorResponse,
  loadLegacyTabContext,
  okResponse,
} from '@/lib/legacy-tool/tab-api'

const BodySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  scope: z.enum(['full', 'watchlists', 'trade_targets', 'waivers']),
  forceLiveNewsRefresh: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_market_refresh`
  try {
    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'market_refresh',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          'VALIDATION_ERROR',
          'leagueId, userId, and scope are required',
        ),
        { status: 400 },
      )
    }

    const payload = parsed.data
    const ctx = await loadLegacyTabContext({ leagueId: payload.leagueId, userId: payload.userId })
    const dashboard = buildOffseasonDashboardData({
      leagueId: payload.leagueId,
      userId: payload.userId,
      snapshot: ctx.snapshot,
      enrichedContext: ctx.enrichedContext,
      offseason: ctx.offseason,
    })
    const tradeCenter = buildTradeCommandCenterData({
      leagueId: payload.leagueId,
      userId: payload.userId,
      offseason: ctx.offseason,
    })

    const data = {
      ...(payload.scope === 'full' || payload.scope === 'watchlists' ? { playerWatchlists: dashboard.playerWatchlists } : {}),
      ...(payload.scope === 'full' || payload.scope === 'trade_targets' || payload.scope === 'waivers'
        ? { marketOpportunities: dashboard.marketOpportunities }
        : {}),
      ...(payload.scope === 'full' || payload.scope === 'trade_targets' ? { marketSignals: tradeCenter.marketSignals } : {}),
      alerts: dashboard.alerts,
      coachingSummary: dashboard.coachingSummary,
    }

    return NextResponse.json(
      okResponse(
        'market_refresh',
        data,
        buildLegacyMeta({ confidence: 0.8, usedLiveNewsOverlay: true, usedSimulation: false, needsRefreshMinutes: 5, requestId }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to refresh market board'
    return NextResponse.json(
      errorResponse(
        'market_refresh',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
