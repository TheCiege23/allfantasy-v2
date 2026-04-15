/**
 * [UPDATED] app/api/tournament/[tournamentId]/control/route.ts
 * GET: Commissioner dashboard data (all leagues with fill status + invite links).
 * POST: Regenerate invite for a specific league.
 * Supports Legacy tournaments.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInviteCode } from '@/lib/tournament-mode/LeagueNamingService'
import { buildLeagueInviteUrl } from '@/lib/viral-loop'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Commissioner access required' }, { status: 403 })
  }

  const tournamentLeagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId },
    include: {
      league: { select: { id: true, name: true, leagueSize: true } },
      conference: { select: { id: true, name: true } },
    },
    orderBy: [{ roundIndex: 'asc' }, { conferenceId: 'asc' }, { orderInConference: 'asc' }],
  })

  const leagues = await Promise.all(
    tournamentLeagues.map(async (tl) => {
      const rosterCount = await prisma.roster.count({ where: { leagueId: tl.leagueId } })
      const leagueSize = tl.league.leagueSize ?? 12
      const fillStatus = rosterCount >= leagueSize ? 'full' : rosterCount > 0 ? 'partial' : 'empty'

      // Get invite code from league settings
      const leagueSettings = await prisma.league.findUnique({
        where: { id: tl.leagueId },
        select: { settings: true },
      })
      const settings = (leagueSettings?.settings as Record<string, unknown>) ?? {}
      const inviteCode = (settings.tournamentInviteCode as string) ?? null
      const joinUrl = inviteCode ? buildLeagueInviteUrl(inviteCode) : null

      return {
        tournamentLeagueId: tl.id,
        leagueId: tl.leagueId,
        leagueName: tl.league.name ?? `League ${tl.orderInConference + 1}`,
        conferenceName: tl.conference.name,
        roundIndex: tl.roundIndex,
        phase: tl.phase,
        inviteCode,
        joinUrl,
        leagueSize,
        rosterCount,
        fillStatus,
      }
    })
  )

  return NextResponse.json({
    tournamentId,
    tournamentName: tournament.name,
    leagues,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Commissioner access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const leagueId = body.leagueId as string
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  // Verify league belongs to this tournament
  const tl = await prisma.legacyTournamentLeague.findFirst({
    where: { tournamentId, leagueId },
  })
  if (!tl) return NextResponse.json({ error: 'League not in this tournament' }, { status: 400 })

  const newCode = generateInviteCode()
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const currentSettings = (league?.settings as Record<string, unknown>) ?? {}
  await prisma.league.update({
    where: { id: leagueId },
    data: { settings: { ...currentSettings, tournamentInviteCode: newCode } },
  })

  const joinUrl = buildLeagueInviteUrl(newCode)
  return NextResponse.json({ inviteCode: newCode, joinUrl })
}
