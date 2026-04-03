import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  if (!seasonId || !rosterId) {
    return NextResponse.json({ error: 'seasonId and rosterId required' }, { status: 400 })
  }

  const season = await prisma.redraftSeason.findFirst({ where: { id: seasonId } })
  if (!season) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(season.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const claims = await prisma.redraftWaiverClaim.findMany({
    where: { seasonId, rosterId },
    orderBy: { submittedAt: 'desc' },
  })

  return NextResponse.json({ claims })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    rosterId?: string
    seasonId?: string
    leagueId?: string
    addPlayerId?: string
    addPlayerName?: string
    dropPlayerId?: string
    dropPlayerName?: string
    bidAmount?: number
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rosterId = body.rosterId?.trim()
  const seasonId = body.seasonId?.trim()
  const leagueId = body.leagueId?.trim()
  const addPlayerId = body.addPlayerId?.trim()
  const addPlayerName = body.addPlayerName?.trim() ?? 'Player'

  if (!rosterId || !seasonId || !leagueId || !addPlayerId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const claim = await prisma.redraftWaiverClaim.create({
    data: {
      seasonId,
      leagueId,
      rosterId,
      addPlayerId,
      addPlayerName,
      dropPlayerId: body.dropPlayerId ?? null,
      dropPlayerName: body.dropPlayerName ?? null,
      bidAmount: body.bidAmount ?? null,
    },
  })

  return NextResponse.json({ claim })
}

export async function DELETE(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { claimId?: string; rosterId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const claimId = body.claimId?.trim()
  const rosterId = body.rosterId?.trim()
  if (!claimId || !rosterId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const c = await prisma.redraftWaiverClaim.findFirst({ where: { id: claimId, rosterId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.redraftWaiverClaim.update({
    where: { id: claimId },
    data: { status: 'cancelled' },
  })

  return NextResponse.json({ ok: true })
}
