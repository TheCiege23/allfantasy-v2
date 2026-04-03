import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSessionKey, sessionKeyLive } from '@/lib/draft/session-key'
import { canAccessLeague } from '@/lib/draft/access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId')?.trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  let parsed: { mode: 'mock' | 'live'; id: string }
  try {
    parsed = parseSessionKey(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  if (parsed.mode === 'live') {
    const ok = await canAccessLeague(parsed.id, userId)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let state = await prisma.draftRoomStateRow.findUnique({ where: { id: sessionId } })

  if (!state && parsed.mode === 'live' && sessionId === sessionKeyLive(parsed.id)) {
    const league = await prisma.league.findUnique({
      where: { id: parsed.id },
      select: { leagueSize: true },
    })
    const teams = await prisma.leagueTeam.findMany({
      where: { leagueId: parsed.id },
      orderBy: { teamName: 'asc' },
    })
    const numTeams = Math.max(teams.length, league?.leagueSize ?? 12)
    const pickOrder =
      teams.length > 0
        ? teams.map((t) => ({ id: t.id, label: t.teamName }))
        : [{ id: `placeholder-${userId}`, label: 'Your team' }]
    const ends = new Date(Date.now() + 90 * 1000)
    state = await prisma.draftRoomStateRow.create({
      data: {
        id: sessionKeyLive(parsed.id),
        mode: 'live',
        status: 'waiting',
        leagueId: parsed.id,
        numTeams,
        numRounds: 15,
        timerSeconds: 90,
        currentPick: 1,
        currentRound: 1,
        currentTeamIndex: 0,
        timerEndsAt: ends,
        pickOrder: pickOrder as object,
      },
    })
  }

  if (!state) {
    return NextResponse.json({ error: 'State not found' }, { status: 404 })
  }

  const wherePicks =
    parsed.mode === 'mock' ? { roomId: parsed.id } : { leagueId: parsed.id }

  const picks = await prisma.draftRoomPickRecord.findMany({
    where: wherePicks,
    orderBy: { overallPick: 'asc' },
  })

  return NextResponse.json({ state, picks })
}
