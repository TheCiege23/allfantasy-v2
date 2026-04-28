import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

async function main() {
  const lastRun = await prisma.adpRefreshRun.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  const latestConsensusRows = await prisma.adpDataRecord.findMany({
    where: { source: 'consensus' },
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { createdAt: 'desc' }],
    take: 5000,
    select: {
      sport: true,
      format: true,
      scoring: true,
      providerCount: true,
      season: true,
      week: true,
      createdAt: true,
    },
  })

  const currentSeason = latestConsensusRows[0]?.season ?? null
  const currentWeek = latestConsensusRows[0]?.week ?? null
  const currentRows = latestConsensusRows.filter(
    (row) => row.season === currentSeason && row.week === currentWeek
  )

  const providerBuckets = new Map<number, number>()
  for (const row of currentRows) {
    const providerCount = Math.max(1, row.providerCount ?? 1)
    providerBuckets.set(providerCount, (providerBuckets.get(providerCount) ?? 0) + 1)
  }

  const duplicateGroups = await prisma.adpDataRecord.groupBy({
    by: ['sport', 'format', 'scoring', 'playerId', 'week', 'season', 'source'],
    where: {
      source: 'consensus',
      ...(currentSeason != null ? { season: currentSeason } : {}),
      ...(currentWeek != null ? { week: currentWeek } : {}),
    },
    _count: { _all: true },
  })

  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const staleSegments = currentRows.filter((row) => row.createdAt < staleCutoff)
  const sportsPresent = new Set(currentRows.map((row) => row.sport))
  const missingSports = SUPPORTED_SPORTS.filter((sport) => !sportsPresent.has(sport))
  const providerCountDistribution = [...providerBuckets.entries()].sort((a, b) => a[0] - b[0])

  console.log('ADP refresh audit')
  console.log(`last refresh run id: ${lastRun?.id ?? 'none'}`)
  console.log(`last refresh status: ${lastRun?.status ?? 'none'}`)
  console.log(`last refresh created at: ${lastRun?.createdAt?.toISOString?.() ?? 'none'}`)
  console.log(`current consensus row count: ${currentRows.length}`)
  console.log(`current season/week: ${currentSeason ?? 'n/a'}/${currentWeek ?? 'n/a'}`)
  console.log(`provider_count distribution: ${JSON.stringify(providerCountDistribution.map(([providerCount, count]) => ({ providerCount, count })))}`)
  console.log(`missing sports: ${missingSports.join(', ') || 'none'}`)
  console.log(`stale segments older than 24 hours: ${staleSegments.length}`)
  console.log(`duplicate groups: ${duplicateGroups.filter((row) => row._count._all > 1).length}`)

  const qualitySummary = (lastRun?.qualitySummary ?? null) as Record<string, unknown> | null
  const topWarnings = Array.isArray(qualitySummary?.topWarnings)
    ? qualitySummary?.topWarnings
    : []
  if (topWarnings.length > 0) {
    console.log(`top warnings: ${topWarnings.join(' | ')}`)
  }
}

main().catch((error) => {
  console.error('[adp:audit] failed', error)
  process.exit(1)
})
