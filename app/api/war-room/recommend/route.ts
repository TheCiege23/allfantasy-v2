import { NextRequest, NextResponse } from 'next/server'
import type { LiveDraftBrainInput } from '@/lib/live-draft-brain'
import { runWarRoomDraftIntelligence } from '@/lib/war-room/draft-intelligence-engine'
import { buildWarRoomNarrativeLayer } from '@/lib/war-room/war-room-narrative'
import { requireUserId, requireLeagueWarRoom } from '@/lib/war-room/war-room-api'
import { logAiRecommendation } from '@/lib/war-room/war-room-persist'

export const dynamic = 'force-dynamic'

/**
 * POST /api/war-room/recommend — live pick intelligence (deterministic brain + tiers, scarcity, stacks, contingencies).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const gate = await requireLeagueWarRoom(leagueId, auth.userId, 'core')
  if (!gate.ok) return gate.response

  const strategyMode = typeof body.strategyMode === 'string' ? body.strategyMode : undefined
  const includeNarrative = body.includeNarrative === true

  try {
    const { strategyMode: _sm, includeNarrative: _in, ...rest } = body as Record<string, unknown>
    const intel = runWarRoomDraftIntelligence(rest as unknown as LiveDraftBrainInput, {
      strategyMode: strategyMode ?? null,
    })

    const narrative = includeNarrative
      ? await buildWarRoomNarrativeLayer({
          intelligence: intel,
          leagueName: null,
          sport: gate.ctx.sport,
        })
      : undefined

    const log = await logAiRecommendation({
      userId: auth.userId,
      leagueId: gate.ctx.leagueId,
      draftSessionId: typeof body.draftSessionId === 'string' ? body.draftSessionId : null,
      feature: 'war_room_recommend',
      recommendationType: 'war_room_pick',
      inputJson: body as object,
      outputJson: {
        version: intel.version,
        confidencePct: intel.confidencePct,
        pickNow: intel.pickNow.playerName,
        strategyMode: intel.strategyMode,
        narrative: narrative ?? null,
      } as object,
      providerSummary: `war_room_intel confidence=${intel.confidencePct}`,
      confidencePct: intel.confidencePct,
    })

    return NextResponse.json({
      ok: true,
      intelligence: intel,
      narrative: narrative ?? null,
      leagueContext: gate.ctx,
      logId: log.id,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid payload'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
