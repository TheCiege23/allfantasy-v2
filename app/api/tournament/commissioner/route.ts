import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertTournamentCommissioner } from '@/lib/tournament/shellAccess'
import { handleRoundTransition } from '@/lib/tournament/redraftScheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    tournamentId?: string
    action?: string
    participantId?: string
    toLeagueId?: string
    roundId?: string
    reason?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const tournamentId = body.tournamentId?.trim()
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  try {
    await assertTournamentCommissioner(tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (body.action === 'override_advancement') {
      if (!body.participantId || !body.toLeagueId) {
        return NextResponse.json({ error: 'participantId and toLeagueId required' }, { status: 400 })
      }
      await prisma.tournamentParticipant.update({
        where: { id: body.participantId },
        data: { currentLeagueId: body.toLeagueId, status: 'active' },
      })
      await prisma.tournamentShellAuditLog.create({
        data: {
          tournamentId,
          action: 'commissioner_override',
          actorType: 'commissioner',
          actorId: userId,
          targetType: 'participant',
          targetId: body.participantId,
          data: { toLeagueId: body.toLeagueId, reason: body.reason },
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'skip_bubble') {
      await prisma.tournamentShell.update({
        where: { id: tournamentId },
        data: { bubbleEnabled: false, status: 'advancing' },
      })
      await prisma.tournamentShellAuditLog.create({
        data: {
          tournamentId,
          action: 'bubble_skipped',
          actorType: 'commissioner',
          actorId: userId,
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'force_round_complete') {
      if (!body.roundId) return NextResponse.json({ error: 'roundId required' }, { status: 400 })
      const round = await prisma.tournamentRound.findFirst({
        where: { id: body.roundId, tournamentId },
      })
      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
      await handleRoundTransition(tournamentId, round.roundNumber)
      await prisma.tournamentShellAuditLog.create({
        data: {
          tournamentId,
          roundNumber: round.roundNumber,
          action: 'force_round_complete',
          actorType: 'commissioner',
          actorId: userId,
          targetType: 'round',
          targetId: body.roundId,
          data: { reason: body.reason },
        },
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Action failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim()
  const type = req.nextUrl.searchParams.get('type')
  if (!tournamentId || type !== 'audit') {
    return NextResponse.json({ error: 'tournamentId and type=audit required' }, { status: 400 })
  }

  try {
    await assertTournamentCommissioner(tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const logs = await prisma.tournamentShellAuditLog.findMany({
    where: { tournamentId },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json({ logs })
}
