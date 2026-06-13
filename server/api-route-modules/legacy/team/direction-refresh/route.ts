import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildLegacyMeta,
  buildOffseasonDashboardData,
  errorResponse,
  loadLegacyTabContext,
  okResponse,
} from '@/lib/legacy-tool/tab-api'

const BodySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  trigger: z.enum(['manual', 'trade_completed', 'draft_pick_made', 'injury_update', 'market_shift', 'roster_change']),
  includeActionPlan: z.boolean().optional(),
  includeMarketTargets: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_direction_refresh`
  try {
    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'team_direction_refresh',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          'VALIDATION_ERROR',
          'leagueId, userId, and trigger are required',
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

    const data = {
      teamDirection: dashboard.teamContext.teamDirection,
      teamSnapshot: dashboard.teamSnapshot,
      needsByPriority: dashboard.needsByPriority,
      ...(payload.includeActionPlan ? { actionPlan: dashboard.actionPlan } : {}),
      coachingSummary: dashboard.coachingSummary,
    }

    return NextResponse.json(
      okResponse(
        'team_direction_refresh',
        data,
        buildLegacyMeta({ confidence: 0.81, usedLiveNewsOverlay: ctx.usedLiveNewsOverlay, usedSimulation: false, needsRefreshMinutes: 5, requestId }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to refresh team direction'
    return NextResponse.json(
      errorResponse(
        'team_direction_refresh',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
