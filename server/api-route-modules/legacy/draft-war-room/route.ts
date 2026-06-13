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

const QuerySchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
  draftId: z.string().min(1),
  overallPick: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
  includeSimulation: z.string().optional(),
  includePredictedPicksAhead: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const requestId = `req_${Date.now()}_draft`
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = QuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          'draft_war_room',
          buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: true, requestId }),
          'VALIDATION_ERROR',
          'leagueId, userId, draftId, overallPick, and round are required',
        ),
        { status: 400 },
      )
    }

    const { leagueId, userId, overallPick } = parsed.data
    const draftInput: DraftWarRoomInput = {
      pick_number: overallPick,
      pick_label: `Pick ${overallPick}`,
      available_players: [],
      likely_taken_before_pick: [],
    }

    const ctx = await loadLegacyTabContext({ leagueId, userId, draftInput })

    if (!overallPick || !ctx.enrichedContext?.currentRosters?.length) {
      return NextResponse.json(
        insufficientDataResponse(
          'draft_war_room',
          buildLegacyMeta({ confidence: 0.35, usedLiveNewsOverlay: ctx.usedLiveNewsOverlay, usedSimulation: true, requestId }),
          ['draft_order', 'user_roster', 'league_scoring'],
          'Draft War Room requires draft order, user roster, and league scoring settings.',
        ),
        { status: 422 },
      )
    }

    const data = buildDraftWarRoomData({
      leagueId,
      userId,
      offseason: ctx.offseason,
      draftInput,
    })

    return NextResponse.json(
      okResponse(
        'draft_war_room',
        data,
        buildLegacyMeta({
          confidence: 0.81,
          usedLiveNewsOverlay: ctx.usedLiveNewsOverlay,
          usedSimulation: true,
          needsRefreshMinutes: 1,
          requestId,
        }),
      ),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build draft war room'
    return NextResponse.json(
      errorResponse(
        'draft_war_room',
        buildLegacyMeta({ confidence: 0.2, usedLiveNewsOverlay: false, usedSimulation: true, requestId }),
        'INTERNAL_ERROR',
        message,
      ),
      { status: 500 },
    )
  }
}
