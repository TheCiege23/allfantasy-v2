/**
 * [UPDATED] POST: Rebalance leagues — redistribute rosters across feeder leagues for even sizes.
 * Only works before tournament is locked.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({ where: { id: tournamentId }, select: { creatorId: true, settings: true } })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  if (settings.locked) return NextResponse.json({ error: 'Tournament is locked — cannot rebalance' }, { status: 400 })

  const feederLeagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex: 0 },
    include: { league: { select: { id: true, name: true, leagueSize: true } }, conference: { select: { id: true, name: true } } },
    orderBy: [{ conferenceId: 'asc' }, { orderInConference: 'asc' }],
  })

  const fillStatus = await Promise.all(feederLeagues.map(async (tl) => {
    const rosterCount = await prisma.roster.count({ where: { leagueId: tl.leagueId } })
    return {
      leagueId: tl.leagueId,
      leagueName: tl.league.name,
      conferenceName: tl.conference.name,
      targetSize: tl.league.leagueSize ?? 12,
      currentSize: rosterCount,
      delta: (tl.league.leagueSize ?? 12) - rosterCount,
    }
  }))

  // Rebalance within each conference
  const byConference = new Map<string, typeof fillStatus>()
  for (const fs of fillStatus) {
    const list = byConference.get(fs.conferenceName) ?? []
    list.push(fs)
    byConference.set(fs.conferenceName, list)
  }

  let moved = 0
  for (const [, confLeagues] of byConference) {
    confLeagues.sort((a, b) => a.currentSize - b.currentSize)
    let lo = 0, hi = confLeagues.length - 1
    while (lo < hi) {
      const under = confLeagues[lo]!
      const over = confLeagues[hi]!
      if (over.currentSize <= over.targetSize || under.currentSize >= under.targetSize) break
      const rosterToMove = await prisma.roster.findFirst({
        where: { leagueId: over.leagueId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (!rosterToMove) break
      await prisma.roster.update({ where: { id: rosterToMove.id }, data: { leagueId: under.leagueId } })
      over.currentSize--
      under.currentSize++
      moved++
      if (under.currentSize >= under.targetSize) lo++
      if (over.currentSize <= over.targetSize) hi--
    }
  }

  await logTournamentAudit(tournamentId, 'rebalance', { actorId: userId, metadata: { moved, fillStatus } })
  return NextResponse.json({ ok: true, moved, fillStatus })
}
