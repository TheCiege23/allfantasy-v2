import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, context: { params: Promise<{ jobId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUserId = session.user.id
  const { jobId } = await context.params

  const job = await prisma.legacyImportJob.findFirst({
    where: { id: jobId, appUserId },
  })

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const seasonRows = await prisma.importJobSeason.findMany({
    where: { jobId },
    orderBy: { season: 'asc' },
  })

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    currentSeason: job.currentSeason,
    seasonsCompleted: job.seasonsCompleted ?? 0,
    totalSeasons: job.totalSeasons ?? 0,
    totalLeaguesSaved: job.totalLeaguesSaved ?? 0,
    lastRankTier: job.lastRankTier,
    lastRankLevel: job.lastRankLevel,
    lastXpTotal: job.lastXpTotal ?? 0,
    completedAt: job.completedAt,
    seasons: seasonRows.map((s) => ({
      season: s.season,
      status: s.status,
      leagueCount: s.leagueCount ?? 0,
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
      championships: s.championships ?? 0,
      rankAfter: s.rankAfter,
      levelAfter: s.levelAfter,
      xpEarned: s.xpEarned ?? 0,
    })),
  })
}
