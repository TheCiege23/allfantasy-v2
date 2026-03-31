import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { DATA_TTLS, isFreshDate, triggerBackgroundRefresh } from '@/lib/data/shared'
import { runAdpImporter } from '@/lib/workers/adp-importer'

export async function getADP(sport: string, format: string, scoring: string) {
  const normalizedSport = normalizeToSupportedSport(sport)
  let rows = await prisma.adpDataRecord.findMany({
    where: {
      sport: normalizedSport,
      format,
      scoring,
    },
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
    take: 250,
  })

  if (rows.length === 0) {
    await runAdpImporter({ sports: [normalizedSport] })
    rows = await prisma.adpDataRecord.findMany({
      where: { sport: normalizedSport, format, scoring },
      orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
      take: 250,
    })
  } else if (!isFreshDate(rows[0]?.createdAt, DATA_TTLS.adp)) {
    triggerBackgroundRefresh(`adp:${normalizedSport}:${format}:${scoring}`, () =>
      runAdpImporter({ sports: [normalizedSport] })
    )
  }

  return rows
}

export async function getADPTrends(playerId: string, weeks: number = 4) {
  const rows = await prisma.adpDataRecord.findMany({
    where: { playerId },
    orderBy: [{ season: 'desc' }, { week: 'desc' }],
    take: weeks,
  })

  if (rows.length > 0 && !isFreshDate(rows[0]?.createdAt, DATA_TTLS.adp)) {
    triggerBackgroundRefresh(`adp-trends:${playerId}`, () => runAdpImporter())
  }

  return rows
}

export async function getPositionalADP(position: string, sport: string) {
  const normalizedSport = normalizeToSupportedSport(sport)
  let rows = await prisma.adpDataRecord.findMany({
    where: {
      sport: normalizedSport,
      position,
    },
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
    take: 150,
  })

  if (rows.length === 0) {
    await runAdpImporter({ sports: [normalizedSport] })
    rows = await prisma.adpDataRecord.findMany({
      where: {
        sport: normalizedSport,
        position,
      },
      orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
      take: 150,
    })
  } else if (!isFreshDate(rows[0]?.createdAt, DATA_TTLS.adp)) {
    triggerBackgroundRefresh(`positional-adp:${normalizedSport}:${position}`, () => runAdpImporter({ sports: [normalizedSport] }))
  }

  return rows
}
