import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildLegacyMeta,
  buildOffseasonDashboardData,
  errorResponse,
  insufficientDataResponse,
  loadLegacyTabContext,
  okResponse,
} from '@/lib/legacy-tool/tab-api'

const QuerySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  includeLiveNews: z.string().optional(),
  includeMarketBoard: z.string().optional(),
  includeWatchlists: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const requestId = `req_${Date.now()}_offseason`
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = QuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'offseason_dashboard',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          'VALIDATION_ERROR',
          'leagueId and userId are required',
        ),
        { status: 400 },
      )
    }

    const { leagueId, userId } = parsed.data
    const ctx = await loadLegacyTabContext({ leagueId, userId })
    const data = buildOffseasonDashboardData({
      leagueId,
      userId,
      snapshot: ctx.snapshot,
      enrichedContext: ctx.enrichedContext,
      offseason: ctx.offseason,
    })

    return NextResponse.json(
      okResponse(
        'offseason_dashboard',
        data,
        buildLegacyMeta({
          confidence: 0.82,
          usedLiveNewsOverlay: ctx.usedLiveNewsOverlay,
          usedSimulation: false,
          needsRefreshMinutes: 5,
          requestId,
        }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build offseason dashboard'
    if (message === 'LEGACY_USER_NOT_FOUND') {
      return NextResponse.json(
        insufficientDataResponse(
          'offseason_dashboard',
          buildLegacyMeta({ confidence: 0.25, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
          ['userId', 'leagueId'],
          'Legacy import not found for supplied user/league.',
        ),
        { status: 404 },
      )
    }
    return NextResponse.json(
      errorResponse(
        'offseason_dashboard',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: false, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
