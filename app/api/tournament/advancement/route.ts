import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { executeAdvancement, identifyQualifiers } from '@/lib/tournament/advancementEngine'
import { resolveBubble } from '@/lib/tournament/bubbleEngine'
import { assertTournamentCommissioner } from '@/lib/tournament/shellAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    tournamentId?: string
    action?: string
    roundId?: string
    fromRoundNumber?: number
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
    if (body.action === 'calculate_qualifiers') {
      if (!body.roundId) return NextResponse.json({ error: 'roundId required' }, { status: 400 })
      const result = await identifyQualifiers(tournamentId, body.roundId)
      return NextResponse.json({ ok: true, result })
    }
    if (body.action === 'execute_advancement') {
      if (body.fromRoundNumber == null) return NextResponse.json({ error: 'fromRoundNumber required' }, { status: 400 })
      await executeAdvancement(tournamentId, body.fromRoundNumber)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'resolve_bubble') {
      await resolveBubble(tournamentId)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Advancement failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim()
  const roundId = req.nextUrl.searchParams.get('roundId')?.trim()
  if (!tournamentId || !roundId) {
    return NextResponse.json({ error: 'tournamentId and roundId required' }, { status: 400 })
  }

  try {
    await assertTournamentCommissioner(tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tls = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId },
    select: { id: true },
  })
  const leagueIds = tls.map((t) => t.id)

  const qualified = await prisma.tournamentLeagueParticipant.findMany({
    where: { tournamentLeagueId: { in: leagueIds }, advancementStatus: 'qualified' },
    select: { participantId: true, userId: true },
  })
  const wild = await prisma.tournamentLeagueParticipant.findMany({
    where: { tournamentLeagueId: { in: leagueIds }, advancementStatus: 'wildcard_eligible' },
    select: { participantId: true, userId: true },
  })
  const bubble = await prisma.tournamentLeagueParticipant.findMany({
    where: { tournamentLeagueId: { in: leagueIds }, advancementStatus: 'bubble' },
    select: { participantId: true, userId: true },
  })
  const eliminated = await prisma.tournamentLeagueParticipant.findMany({
    where: { tournamentLeagueId: { in: leagueIds }, advancementStatus: 'eliminated' },
    select: { participantId: true, userId: true },
  })

  return NextResponse.json({ qualified, wildcards: wild, bubble, eliminated })
}
