import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/league/import/status — Get import status for the current user.
 * Returns all active and recent import jobs with progress.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get legacy import jobs (Sleeper bulk)
  const legacyJobs = await prisma.legacyImportJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      seasons: {
        orderBy: { season: 'asc' },
      },
    },
  }).catch(() => [])

  // Get generic import jobs
  const genericJobs = await prisma.importJob?.findMany?.({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  }).catch(() => []) ?? []

  // Calculate progress for each job
  const legacyStatusJobs = legacyJobs.map((job) => {
    const totalSeasons = job.seasons.length
    const completedSeasons = job.seasons.filter((s) => s.status === 'complete').length
    const progress = totalSeasons > 0 ? Math.round((completedSeasons / totalSeasons) * 100) : 0

    return {
      id: job.id,
      provider: 'sleeper',
      status: job.status,
      progress,
      totalSeasons,
      completedSeasons,
      sleeperUsername: job.sleeperUsername,
      leagueCount: job.leagueCount,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      seasons: job.seasons.map((s) => ({
        season: s.season,
        status: s.status,
        leagueCount: s.leagueCount,
        wins: s.wins,
        losses: s.losses,
      })),
    }
  })

  const genericStatusJobs = (genericJobs as Array<{
    id?: string
    provider?: string | null
    status?: string | null
    progress?: number | null
    totalSeasons?: number | null
    seasonsCompleted?: number | null
    sleeperUsername?: string | null
    sourceUsername?: string | null
    leagueCount?: number | null
    createdAt?: Date | string | null
    updatedAt?: Date | string | null
  }>).map((job) => {
    const createdAt = job.createdAt ? new Date(job.createdAt) : new Date()
    const updatedAt = job.updatedAt ? new Date(job.updatedAt) : createdAt
    const totalSeasons = Number(job.totalSeasons ?? 0)
    const completedSeasons = Number(job.seasonsCompleted ?? 0)
    const progress =
      Number.isFinite(Number(job.progress)) && Number(job.progress) >= 0
        ? Number(job.progress)
        : totalSeasons > 0
          ? Math.round((completedSeasons / totalSeasons) * 100)
          : 0

    return {
      id: job.id ?? crypto.randomUUID(),
      provider: (job.provider ?? 'import').toLowerCase(),
      status: job.status ?? 'queued',
      progress,
      totalSeasons,
      completedSeasons,
      sleeperUsername: job.sleeperUsername ?? job.sourceUsername ?? null,
      leagueCount: Number.isFinite(Number(job.leagueCount)) ? Number(job.leagueCount) : null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      seasons: [],
    }
  })

  const jobs = [...legacyStatusJobs, ...genericStatusJobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return NextResponse.json({ jobs })
}
