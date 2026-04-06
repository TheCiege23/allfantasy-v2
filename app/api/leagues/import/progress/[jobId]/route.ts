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
    include: {
      importJobSeasons: {
        orderBy: { season: 'asc' },
      },
    },
  })

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const seasons = job.importJobSeasons.map((s) => ({
    season: s.season,
    status: s.status,
    leagueCount: s.leagueCount,
    wins: s.wins,
    losses: s.losses,
    rankAfter: s.rankAfter,
    levelAfter: s.levelAfter,
  }))

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    currentSeason: job.currentSeason,
    seasonsCompleted: job.seasonsCompleted,
    totalSeasons: job.totalSeasons,
    totalLeaguesSaved: job.totalLeaguesSaved,
    lastRankTier: job.lastRankTier,
    lastRankLevel: job.lastRankLevel,
    lastXpTotal: job.lastXpTotal,
    seasons,
  })
}
