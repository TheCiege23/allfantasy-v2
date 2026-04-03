import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionKeyLive } from '@/lib/draft/session-key'
import { executeDraftPick } from '@/lib/draft/execute-pick'

export const dynamic = 'force-dynamic'

/**
 * POST { draftId: DraftSession.id OR legacy league id, playerId, playerName?, position?, team? }
 * Resolves `draftRoomStateRow` session key (`live:{leagueId}`) and records a pick.
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const draftId = typeof body?.draftId === 'string' ? body.draftId.trim() : ''
  const playerId = typeof body?.playerId === 'string' ? body.playerId : null
  const playerName = typeof body?.playerName === 'string' ? body.playerName : 'Unknown'
  const position = typeof body?.position === 'string' ? body.position : ''
  const team = typeof body?.team === 'string' ? body.team : null

  if (!draftId) {
    return NextResponse.json({ error: 'draftId required' }, { status: 400 })
  }

  let leagueId: string | null = null

  const bySession = await prisma.draftSession.findFirst({
    where: { id: draftId },
    select: { leagueId: true },
  })
  if (bySession) {
    leagueId = bySession.leagueId
  } else {
    const league = await prisma.league.findFirst({ where: { id: draftId }, select: { id: true } })
    if (league) leagueId = league.id
  }

  if (!leagueId) {
    return NextResponse.json({ error: 'Could not resolve league' }, { status: 404 })
  }

  const sessionId = sessionKeyLive(leagueId)
  const result = await executeDraftPick({
    sessionId,
    userId,
    playerId,
    playerName,
    position,
    team,
    autopicked: false,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
  }

  return NextResponse.json({ success: true, overallPick: result.overallPick })
}
