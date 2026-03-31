import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { DATA_TTLS, isFreshDate, triggerBackgroundRefresh } from '@/lib/data/shared'
import { runNewsImporter } from '@/lib/workers/news-importer'

export async function getLatestNews(sport: string, limit: number = 25) {
  const normalizedSport = normalizeToSupportedSport(sport)
  let rows = await prisma.playerNewsRecord.findMany({
    where: { sport: normalizedSport },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  if (rows.length === 0) {
    await runNewsImporter({ sports: [normalizedSport] })
    rows = await prisma.playerNewsRecord.findMany({
      where: { sport: normalizedSport },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })
  } else if (!isFreshDate(rows[0]?.publishedAt, DATA_TTLS.news)) {
    triggerBackgroundRefresh(`latest-news:${normalizedSport}`, () => runNewsImporter({ sports: [normalizedSport] }))
  }

  return rows
}

export async function getPlayerNews(playerId: string) {
  let rows = await prisma.playerNewsRecord.findMany({
    where: {
      OR: [{ playerId }, { playerName: { contains: playerId, mode: 'insensitive' } }],
    },
    orderBy: { publishedAt: 'desc' },
    take: 25,
  })

  if (rows.length === 0) {
    await runNewsImporter()
    rows = await prisma.playerNewsRecord.findMany({
      where: {
        OR: [{ playerId }, { playerName: { contains: playerId, mode: 'insensitive' } }],
      },
      orderBy: { publishedAt: 'desc' },
      take: 25,
    })
  } else if (!isFreshDate(rows[0]?.publishedAt, DATA_TTLS.news)) {
    triggerBackgroundRefresh(`news-player:${playerId}`, () => runNewsImporter())
  }

  return rows
}

export async function getHighImpactNews(sport: string) {
  const normalizedSport = normalizeToSupportedSport(sport)
  let rows = await prisma.playerNewsRecord.findMany({
    where: {
      sport: normalizedSport,
      impact: 'high',
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  if (rows.length === 0) {
    await runNewsImporter({ sports: [normalizedSport] })
    rows = await prisma.playerNewsRecord.findMany({
      where: {
        sport: normalizedSport,
        impact: 'high',
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    })
  } else if (!isFreshDate(rows[0]?.publishedAt, DATA_TTLS.news)) {
    triggerBackgroundRefresh(`high-impact-news:${normalizedSport}`, () => runNewsImporter({ sports: [normalizedSport] }))
  }

  return rows
}
