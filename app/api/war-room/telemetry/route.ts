import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rememberWarRoomDraftBehavior } from '@/lib/war-room/war-room-memory'
import { requireUserId, requireLeagueWarRoom } from '@/lib/war-room/war-room-api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/war-room/telemetry — follow/ignore on War Room recommendations (updates AiRecommendationLog + war_room_draft memory).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const logId = typeof body.logId === 'string' ? body.logId : ''
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const accepted = typeof body.accepted === 'boolean' ? body.accepted : undefined
  const pickedPlayerName = typeof body.pickedPlayerName === 'string' ? body.pickedPlayerName : undefined

  if (!logId || accepted === undefined) {
    return NextResponse.json({ error: 'logId and accepted are required' }, { status: 400 })
  }

  const gate = await requireLeagueWarRoom(leagueId, auth.userId, 'core')
  if (!gate.ok) return gate.response

  const row = await prisma.aiRecommendationLog.findFirst({
    where: { id: logId, userId: auth.userId, leagueId: gate.ctx.leagueId },
    select: { id: true, feature: true, leagueId: true },
  })
  if (!row) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  await prisma.aiRecommendationLog.update({
    where: { id: logId },
    data: { accepted },
  })

  await rememberWarRoomDraftBehavior({
    userId: auth.userId,
    leagueId: row.leagueId,
    event: accepted ? 'recommendation_followed' : 'recommendation_ignored',
    meta: {
      logId,
      feature: row.feature,
      pickedPlayerName,
    },
  })

  return NextResponse.json({ ok: true })
}
