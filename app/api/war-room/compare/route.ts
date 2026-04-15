import { NextRequest, NextResponse } from 'next/server'
import { requireUserId, requireLeagueWarRoom } from '@/lib/war-room/war-room-api'
import { comparePlayersDeterministic } from '@/lib/war-room/war-room-deterministic'
import { logAiRecommendation } from '@/lib/war-room/war-room-persist'

export const dynamic = 'force-dynamic'

/**
 * POST /api/war-room/compare — deterministic A vs B (pairs with Player Decision / Chimmy).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const gate = await requireLeagueWarRoom(leagueId, auth.userId, 'compare')
  if (!gate.ok) return gate.response

  const a = body.a as Record<string, unknown> | undefined
  const b = body.b as Record<string, unknown> | undefined
  if (!a?.name || !b?.name || typeof a.name !== 'string' || typeof b.name !== 'string') {
    return NextResponse.json({ error: 'a.name and b.name are required' }, { status: 400 })
  }

  const result = comparePlayersDeterministic({
    sport: gate.ctx.sport,
    a: {
      name: a.name,
      position: typeof a.position === 'string' ? a.position : 'UNK',
      adp: typeof a.adp === 'number' ? a.adp : null,
    },
    b: {
      name: b.name,
      position: typeof b.position === 'string' ? b.position : 'UNK',
      adp: typeof b.adp === 'number' ? b.adp : null,
    },
  })

  const log = await logAiRecommendation({
    userId: auth.userId,
    leagueId: gate.ctx.leagueId,
    feature: 'war_room_compare',
    inputJson: body as object,
    outputJson: result as object,
    providerSummary: 'deterministic_compare',
  })

  return NextResponse.json({
    ok: true,
    result,
    logId: log.id,
    chimmyLink: `/tools/player-decision?leagueId=${encodeURIComponent(gate.ctx.leagueId)}&sport=${gate.ctx.sport}`,
  })
}
