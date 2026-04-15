import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/league/import/status — Get import status for the current user.
 * Returns all active and recent legacy (Sleeper bulk) import jobs with
 * per-season progress.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const legacyJobs = await prisma.legacyImportJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      importJobSeasons: {
        orderBy: { season: 'asc' },
      },
    },
  }).catch(() => [])

  const legacyStatusJobs = legacyJobs.map((job) => {
    const jobSeasons = job.importJobSeasons ?? []
    const totalSeasons = jobSeasons.length
    const completedSeasons = jobSeasons.filter((s) => s.status === 'complete').length
    const progress = totalSeasons > 0 ? Math.round((completedSeasons / totalSeasons) * 100) : 0

    return {
      id: job.id,
      provider: 'sleeper' as const,
      status: job.status,
      progress,
      totalSeasons,
      completedSeasons,
      sleeperUsername: null as string | null,
      leagueCount: job.totalLeaguesSaved,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      seasons: jobSeasons.map((s) => ({
        season: s.season,
        status: s.status,
        leagueCount: s.leagueCount,
        wins: s.wins,
        losses: s.losses,
      })),
    }
  })

  const jobs = legacyStatusJobs.slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return NextResponse.json({ jobs })
}
