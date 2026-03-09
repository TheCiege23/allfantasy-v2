import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildDraftWarRoomData,
  buildLegacyMeta,
  errorResponse,
  insufficientDataResponse,
  loadLegacyTabContext,
  okResponse,
} from '@/lib/legacy-tool/tab-api'
import type { DraftWarRoomInput } from '@/lib/legacy-tool/offseason'

const BodySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  draftId: z.string().min(1),
  overallPick: z.number().int().positive(),
  round: z.number().int().positive(),
  recentSelections: z.array(z.object({ teamId: z.string(), playerId: z.string(), overallPick: z.number().int().positive() })).default([]),
  includeSimulation: z.boolean().optional(),
  forceLiveNewsRefresh: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_draft_refresh`
  try {
    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'draft_recommendation_refresh',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: true, requestId }),
          'VALIDATION_ERROR',
          'leagueId, userId, draftId, overallPick, and round are required',
        ),
        { status: 400 },
      )
    }

    const payload = parsed.data
    const draftInput: DraftWarRoomInput = {
      pick_number: payload.overallPick,
      pick_label: `Pick ${payload.overallPick}`,
      available_players: [],
      likely_taken_before_pick: [],
    }

    const ctx = await loadLegacyTabContext({ leagueId: payload.leagueId, userId: payload.userId, draftInput })
    if (!ctx.enrichedContext?.currentRosters?.length) {
      return NextResponse.json(
        insufficientDataResponse(
          'draft_recommendation_refresh',
          buildLegacyMeta({ confidence: 0.35, usedLiveNewsOverlay: ctx.usedLiveNewsOverlay, usedSimulation: true, requestId }),
          ['user_roster', 'league_scoring'],
          'Draft recommendation refresh requires roster and scoring context.',
        ),
        { status: 422 },
      )
    }

    const data = buildDraftWarRoomData({
      leagueId: payload.leagueId,
      userId: payload.userId,
      offseason: ctx.offseason,
      draftInput,
    })

    return NextResponse.json(
      okResponse(
        'draft_recommendation_refresh',
        data,
        buildLegacyMeta({ confidence: 0.8, usedLiveNewsOverlay: true, usedSimulation: true, needsRefreshMinutes: 1, requestId }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to refresh draft recommendations'
    return NextResponse.json(
      errorResponse(
        'draft_recommendation_refresh',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: true, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
