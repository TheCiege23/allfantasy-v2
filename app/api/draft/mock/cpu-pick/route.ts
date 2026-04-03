import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSessionKey } from '@/lib/draft/session-key'
import { slotIndexForOverallPick } from '@/lib/draft/snake'
import { executeDraftPick } from '@/lib/draft/execute-pick'

export const dynamic = 'force-dynamic'

async function pickNextCpuPlayer(roomId: string | null, leagueId: string | null) {
  const where = roomId ? { roomId } : { leagueId: leagueId! }
  const taken = await prisma.draftRoomPickRecord.findMany({
    where,
    select: { playerId: true },
  })
  const takenIds = new Set(taken.map((t) => t.playerId).filter(Boolean) as string[])

  const pool = await prisma.sportsPlayer.findMany({
    where: { sport: 'NFL' },
    select: {
      externalId: true,
      name: true,
      position: true,
      team: true,
    },
    take: 500,
    orderBy: { name: 'asc' },
  })

  for (const p of pool) {
    if (takenIds.has(p.externalId)) continue
    return {
      playerId: p.externalId,
      playerName: p.name,
      position: p.position ?? 'UNK',
      team: p.team ?? null,
    }
  }
  return null
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  let parsed: { mode: 'mock' | 'live'; id: string }
  try {
    parsed = parseSessionKey(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  const state = await prisma.draftRoomStateRow.findUnique({ where: { id: sessionId } })
  if (!state || state.status === 'complete') {
    return NextResponse.json({ error: 'Draft not active' }, { status: 400 })
  }

  const pickOrder = state.pickOrder as Array<{ id: string }> | null
  if (!pickOrder?.length) {
    return NextResponse.json({ error: 'No pick order' }, { status: 500 })
  }

  const whereCount = parsed.mode === 'mock' ? { roomId: parsed.id } : { leagueId: parsed.id }
  const existing = await prisma.draftRoomPickRecord.count({ where: whereCount })
  const overallPick = existing + 1
  const slot = slotIndexForOverallPick(overallPick, state.numTeams)
  const onClock = pickOrder[slot]?.id
  if (!onClock?.startsWith('cpu-')) {
    return NextResponse.json({ error: 'Not CPU turn' }, { status: 400 })
  }

  const roomId = parsed.mode === 'mock' ? parsed.id : null
  const leagueId = parsed.mode === 'live' ? parsed.id : null
  const player = await pickNextCpuPlayer(roomId, leagueId)
  if (!player) {
    return NextResponse.json({ error: 'No players available' }, { status: 500 })
  }

  const result = await executeDraftPick({
    sessionId,
    userId,
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    team: player.team,
    autopicked: true,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
  }

  return NextResponse.json({ success: true, player })
}
