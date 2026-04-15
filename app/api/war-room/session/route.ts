import { NextRequest, NextResponse } from 'next/server'
import type { LeagueSport } from '@prisma/client'
import { requireUserId, requireLeagueWarRoom } from '@/lib/war-room/war-room-api'
import { createWarRoomSnapshot } from '@/lib/war-room/war-room-persist'
import { loadWarRoomSessionPayload } from '@/lib/war-room/war-room-session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/war-room/session — resolve `draft_sessions` row, league + user snapshot (create session when requested).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : undefined
  const createIfMissing = body.createIfMissing === true
  const snapshotKind = typeof body.snapshotKind === 'string' ? body.snapshotKind : 'in_draft'
  const season = typeof body.season === 'number' ? body.season : undefined
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : undefined
  const saveSnapshot = body.saveSnapshot === true

  const gate = await requireLeagueWarRoom(leagueId, auth.userId, 'core')
  if (!gate.ok) return gate.response

  const sessionPayload = await loadWarRoomSessionPayload(gate.ctx.leagueId, auth.userId, createIfMissing)
  if (!sessionPayload) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  let snapshotId: string | undefined
  if (saveSnapshot && payload) {
    const snap = await createWarRoomSnapshot({
      leagueId: gate.ctx.leagueId,
      userId: auth.userId,
      draftSessionId: sessionPayload.draftSession?.id ?? null,
      sport: gate.ctx.sport as unknown as LeagueSport,
      season: season ?? null,
      snapshotKind,
      payload,
    })
    snapshotId = snap.id
  }

  return NextResponse.json({
    ok: true,
    draftSessionId: sessionPayload.draftSession?.id ?? null,
    draftSessionStatus: sessionPayload.draftSession?.status ?? null,
    leagueSnapshot: sessionPayload.leagueSnapshot,
    userPrefs: sessionPayload.userPrefs,
    defaultStrategyMode: sessionPayload.defaultStrategyMode,
    snapshotId,
  })
}
