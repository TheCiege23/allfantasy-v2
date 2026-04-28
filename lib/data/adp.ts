import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { DATA_TTLS, isFreshDate, triggerBackgroundRefresh } from '@/lib/data/shared'
import { runAdpImporter } from '@/lib/workers/adp-importer'

type AdpRowLike = {
  id: string
  sport: string
  format: string
  scoring: string
  playerId: string
  playerName: string
  position: string
  team: string
  adp: number
  adpChange: number | null
  week: number
  season: number
  source: string
  createdAt: Date
}

function enrichConsensusMetadata(rows: AdpRowLike[]): AdpRowLike[] {
  if (!rows.length) return rows

  const byGroup = new Map<string, AdpRowLike[]>()
  for (const row of rows) {
    const key = `${row.playerId}:${row.season}:${row.week}:${row.format}:${row.scoring}`
    const bucket = byGroup.get(key) ?? []
    bucket.push(row)
    byGroup.set(key, bucket)
  }

  const enriched = rows.map((row) => ({ ...(row as Record<string, unknown>) })) as Array<Record<string, unknown>>

  for (const row of enriched) {
    if (String(row.source) !== 'consensus') continue
    const key = `${row.playerId}:${row.season}:${row.week}:${row.format}:${row.scoring}`
    const siblings = (byGroup.get(key) ?? []).filter((candidate) => candidate.source !== 'consensus')
    if (!siblings.length) continue

    const values = siblings.map((candidate) => Number(candidate.adp)).filter(Number.isFinite)
    if (!values.length) continue

    const spread = values.length >= 2 ? Math.max(...values) - Math.min(...values) : 0
    const providerBreakdown = Object.fromEntries(siblings.map((candidate) => [candidate.source, Number(candidate.adp.toFixed(2))]))
    const providerCount = Object.keys(providerBreakdown).length
    const confidence = Number(Math.min(0.98, Math.max(0.2, 0.3 + Math.min(providerCount / 4, 1) * 0.55 - Math.min(spread / 60, 1) * 0.25)).toFixed(3))

    if (row.providerCount == null) row.providerCount = providerCount
    if (row.adpSpread == null) row.adpSpread = Number(spread.toFixed(2))
    if (row.confidenceScore == null) row.confidenceScore = confidence
    if (row.providerBreakdown == null) row.providerBreakdown = providerBreakdown
  }

  return enriched as unknown as AdpRowLike[]
}

async function fetchAdpRows(params: {
  sport: string
  format: string
  scoring: string
  position?: string
  take: number
}): Promise<AdpRowLike[]> {
  const baseWhere = {
    sport: params.sport,
    format: params.format,
    scoring: params.scoring,
    ...(params.position ? { position: params.position } : {}),
  }

  const consensusRows = await prisma.adpDataRecord.findMany({
    where: {
      ...baseWhere,
      source: 'consensus',
    },
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
    take: params.take,
  })

  if (consensusRows.length > 0) return enrichConsensusMetadata(consensusRows as unknown as AdpRowLike[])

  const fallbackRows = await prisma.adpDataRecord.findMany({
    where: baseWhere,
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
    take: params.take,
  })
  return enrichConsensusMetadata(fallbackRows as unknown as AdpRowLike[])
}

export async function getADP(sport: string, format: string, scoring: string) {
  const normalizedSport = normalizeToSupportedSport(sport)
  let rows = await fetchAdpRows({
    sport: normalizedSport,
    format,
    scoring,
    take: 250,
  })

  if (rows.length === 0) {
    await runAdpImporter({ sports: [normalizedSport] })
    rows = await fetchAdpRows({
      sport: normalizedSport,
      format,
      scoring,
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
  let rows = await prisma.adpDataRecord.findMany({
    where: { playerId, source: 'consensus' },
    orderBy: [{ season: 'desc' }, { week: 'desc' }],
    take: weeks,
  })

  if (rows.length === 0) {
    rows = await prisma.adpDataRecord.findMany({
      where: { playerId },
      orderBy: [{ season: 'desc' }, { week: 'desc' }],
      take: weeks,
    })
  }

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
      source: 'consensus',
    },
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
    take: 150,
  }) as unknown as AdpRowLike[]

  if (rows.length === 0) {
    rows = await prisma.adpDataRecord.findMany({
      where: {
        sport: normalizedSport,
        position,
      },
      orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
      take: 150,
    }) as unknown as AdpRowLike[]
  }

  rows = enrichConsensusMetadata(rows)

  if (rows.length === 0) {
    await runAdpImporter({ sports: [normalizedSport] })
    rows = await prisma.adpDataRecord.findMany({
      where: {
        sport: normalizedSport,
        position,
        source: 'consensus',
      },
      orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
      take: 150,
    }) as unknown as AdpRowLike[]

    if (rows.length === 0) {
      rows = await prisma.adpDataRecord.findMany({
        where: {
          sport: normalizedSport,
          position,
        },
        orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
        take: 150,
      }) as unknown as AdpRowLike[]
    }

    rows = enrichConsensusMetadata(rows)
  } else if (!isFreshDate(rows[0]?.createdAt, DATA_TTLS.adp)) {
    triggerBackgroundRefresh(`positional-adp:${normalizedSport}:${position}`, () => runAdpImporter({ sports: [normalizedSport] }))
  }

  return rows
}
