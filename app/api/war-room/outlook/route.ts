import { NextRequest, NextResponse } from 'next/server'
import type { LeagueSport } from '@prisma/client'
import { requireUserId, requireLeagueWarRoom } from '@/lib/war-room/war-room-api'
import { buildOutlookStub } from '@/lib/war-room/war-room-deterministic'
import { logAiRecommendation, upsertPlayerOutlook } from '@/lib/war-room/war-room-persist'

export const dynamic = 'force-dynamic'

/**
 * POST /api/war-room/outlook — player outlook blurb (stub + DB row for Waiver / Chimmy follow-ups).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const gate = await requireLeagueWarRoom(leagueId, auth.userId, 'outlook')
  if (!gate.ok) return gate.response

  const playerId = typeof body.playerId === 'string' ? body.playerId : ''
  const playerName = typeof body.playerName === 'string' ? body.playerName : ''
  if (!playerId || !playerName) {
    return NextResponse.json({ error: 'playerId and playerName are required' }, { status: 400 })
  }

  const position = typeof body.position === 'string' ? body.position : 'UNK'
  const team = typeof body.team === 'string' ? body.team : null
  const season = typeof body.season === 'number' ? body.season : undefined

  const stub = buildOutlookStub({
    playerName,
    position,
    team,
    sport: gate.ctx.sport,
  })

  const row = await upsertPlayerOutlook({
    userId: auth.userId,
    leagueId: gate.ctx.leagueId,
    sport: gate.ctx.sport as unknown as LeagueSport,
    season: season ?? null,
    playerId,
    playerName,
    position,
    team,
    summary: stub.summary,
    confidence: stub.confidence,
  })

  const log = await logAiRecommendation({
    userId: auth.userId,
    leagueId: gate.ctx.leagueId,
    feature: 'war_room_outlook',
    inputJson: body as object,
    outputJson: { ...stub, outlookId: row.id } as object,
    providerSummary: 'outlook_stub',
  })

  return NextResponse.json({
    ok: true,
    summary: stub.summary,
    confidence: stub.confidence,
    outlookId: row.id,
    logId: log.id,
    waiverLink: `/waiver-ai?leagueId=${encodeURIComponent(gate.ctx.leagueId)}`,
  })
}
