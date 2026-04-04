import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scheduleRoundDraft } from '@/lib/tournament/redraftScheduler'
import { assertTournamentCommissioner } from '@/lib/tournament/shellAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tournamentId?: string; roundNumber?: number; draftDateTime?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.tournamentId || body.roundNumber == null || !body.draftDateTime) {
    return NextResponse.json({ error: 'tournamentId, roundNumber, draftDateTime required' }, { status: 400 })
  }

  try {
    await assertTournamentCommissioner(body.tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dt = new Date(body.draftDateTime)
  if (Number.isNaN(dt.getTime())) {
    return NextResponse.json({ error: 'Invalid draftDateTime' }, { status: 400 })
  }

  try {
    await scheduleRoundDraft(body.tournamentId, body.roundNumber, dt)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Schedule failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim()
  const roundNumber = req.nextUrl.searchParams.get('roundNumber')
  if (!tournamentId || !roundNumber) {
    return NextResponse.json({ error: 'tournamentId and roundNumber required' }, { status: 400 })
  }

  const rn = parseInt(roundNumber, 10)
  if (!Number.isFinite(rn)) return NextResponse.json({ error: 'Bad roundNumber' }, { status: 400 })

  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (shell.commissionerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const round = await prisma.tournamentRound.findFirst({ where: { tournamentId, roundNumber: rn } })
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId: round.id },
    select: {
      id: true,
      name: true,
      draftScheduledAt: true,
      draftSessionId: true,
      leagueId: true,
    },
  })

  return NextResponse.json({ roundNumber: rn, leagues })
}
