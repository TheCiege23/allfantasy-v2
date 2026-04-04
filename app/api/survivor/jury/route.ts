import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueCommissioner, assertLeagueMember } from '@/lib/league/league-access'
import {
  openFinale,
  openJuryPhase,
  openJuryVoting,
  revealWinner,
  tallyJuryVotes,
} from '@/lib/survivor/juryEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    intent?: string
    leagueId?: string
    finalistUserIds?: string[]
    deadline?: string
    finalistUserId?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  if (body.intent === 'open_jury') {
    const gate = await assertLeagueCommissioner(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await openJuryPhase(body.leagueId)
    return NextResponse.json({ ok: true })
  }

  if (body.intent === 'open_finale' && body.finalistUserIds?.length) {
    const gate = await assertLeagueCommissioner(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await openFinale(body.leagueId, body.finalistUserIds)
    return NextResponse.json({ ok: true })
  }

  if (body.intent === 'open_voting' && body.deadline) {
    const gate = await assertLeagueCommissioner(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await openJuryVoting(body.leagueId, new Date(body.deadline))
    return NextResponse.json({ ok: true })
  }

  if (body.intent === 'jury_vote' && body.finalistUserId) {
    const gate = await assertLeagueMember(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const sessionRow = await prisma.jurySession.findUnique({ where: { leagueId: body.leagueId } })
    if (!sessionRow) return NextResponse.json({ error: 'No jury session' }, { status: 400 })
    await prisma.juryVote.upsert({
      where: {
        sessionId_jurorUserId: { sessionId: sessionRow.id, jurorUserId: userId },
      },
      create: {
        sessionId: sessionRow.id,
        jurorUserId: userId,
        finalistUserId: body.finalistUserId,
      },
      update: { finalistUserId: body.finalistUserId },
    })
    return NextResponse.json({ ok: true })
  }

  if (body.intent === 'reveal') {
    const gate = await assertLeagueCommissioner(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const winner = await tallyJuryVotes(body.leagueId)
    await revealWinner(body.leagueId)
    return NextResponse.json({ winnerId: winner })
  }

  return NextResponse.json({ error: 'Invalid intent' }, { status: 400 })
}
