import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildLeagueInviteUrl } from '@/lib/viral-loop'
import crypto from 'crypto'

/** Commissioner-only: list all leagues with invite links; POST to regenerate invite for a league. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, name: true },
  })
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId },
    include: {
      league: {
        include: {
          _count: { select: { rosters: true } },
        },
      },
      conference: { select: { id: true, name: true } },
    },
    orderBy: [{ conferenceId: 'asc' }, { orderInConference: 'asc' }],
  })

  const list = leagues.map((tl) => {
    const settings = (tl.league.settings as Record<string, unknown>) ?? {}
    const inviteCode = (settings.inviteCode as string) ?? null
    const joinUrl = inviteCode
      ? buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'tournament_invite' } })
      : null
    const rosterCount = (tl.league as { _count?: { rosters: number } })._count?.rosters ?? 0
    const leagueSize = tl.league.leagueSize ?? 12
    return {
      tournamentLeagueId: tl.id,
      leagueId: tl.leagueId,
      leagueName: tl.league.name,
      conferenceName: tl.conference.name,
      roundIndex: tl.roundIndex,
      phase: tl.phase,
      inviteCode,
      joinUrl,
      leagueSize,
      rosterCount,
      fillStatus: rosterCount >= leagueSize ? 'full' : rosterCount > 0 ? 'partial' : 'empty',
    }
  })

  return NextResponse.json({
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    leagues: list,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!tournament || tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { leagueId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const leagueId = body.leagueId
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  const tl = await prisma.tournamentLeague.findFirst({
    where: { tournamentId, leagueId },
    include: { league: { select: { id: true, settings: true } } },
  })
  if (!tl) {
    return NextResponse.json({ error: 'League not in this tournament' }, { status: 404 })
  }

  const settings = (tl.league.settings as Record<string, unknown>) ?? {}
  const inviteCode = crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const joinUrl = buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'tournament_invite' } })
  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: { ...settings, inviteCode, inviteLink: joinUrl },
    },
  })

  return NextResponse.json({ leagueId, inviteCode, joinUrl })
}
