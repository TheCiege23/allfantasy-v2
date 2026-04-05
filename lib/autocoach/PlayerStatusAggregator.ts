import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  isSwapEligibleStatus,
  normalizeStatusToken,
} from '@/lib/autocoach/AutoCoachEngine'
import { fetchBleacherReportInjuries } from '@/lib/autocoach/status-sources/BleacherReportAdapter'
import { fetchInjuryNewsArticles } from '@/lib/autocoach/status-sources/NewsApiAdapter'
import { fetchOfficialStatuses } from '@/lib/autocoach/status-sources/OfficialApiAdapter'
import { fetchSleeperStatuses } from '@/lib/autocoach/status-sources/SleeperStatusAdapter'
import { searchXForInjuryNews } from '@/lib/autocoach/status-sources/XGrokAdapter'
import type { NormalizedStatusHit } from '@/lib/autocoach/status-sources/types'

export type AggregatedPlayerStatus = {
  externalId: string
  playerName: string
  sport: string
  teamAbbrev: string | null
  newStatus: string
  statusReason: string | null
  confirmedBy: string[]
  confidence: number
  gameDate: Date | null
  rawSources: { source: string; rawText: string; sourceUrl?: string }[]
  eventId: string
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[m]![n]!
}

async function resolveExternalId(
  sport: string,
  hit: NormalizedStatusHit
): Promise<{ externalId: string; playerName: string; teamAbbrev: string | null } | null> {
  const sk = sport.toUpperCase()
  if (hit.externalId) {
    const row = await prisma.sportsPlayer.findFirst({
      where: { sport: sk, externalId: hit.externalId },
      select: { externalId: true, name: true, team: true },
    })
    if (row) {
      return { externalId: row.externalId, playerName: row.name, teamAbbrev: row.team }
    }
    return {
      externalId: hit.externalId,
      playerName: hit.playerName || hit.externalId,
      teamAbbrev: hit.teamAbbrev ?? null,
    }
  }

  const name = hit.playerName.trim()
  if (name.length < 2) return null
  const parts = name.split(/\s+/).filter(Boolean)
  const last = parts[parts.length - 1]
  const rows = await prisma.sportsPlayer.findMany({
    where: {
      sport: sk,
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        ...(last
          ? [{ name: { contains: last, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    take: 25,
    select: { externalId: true, name: true, team: true },
  })

  const lower = name.toLowerCase()
  const exact = rows.find((r) => r.name.toLowerCase() === lower)
  if (exact) return { externalId: exact.externalId, playerName: exact.name, teamAbbrev: exact.team }

  let best = rows[0] ?? null
  let bestD = 999
  for (const r of rows) {
    const d = levenshtein(r.name.toLowerCase(), lower)
    if (d < bestD) {
      bestD = d
      best = r
    }
  }
  if (best && bestD <= 2) {
    return { externalId: best.externalId, playerName: best.name, teamAbbrev: best.team }
  }
  return null
}

function mapOfficialRows(rows: Awaited<ReturnType<typeof fetchOfficialStatuses>>): NormalizedStatusHit[] {
  return rows.map((r) => ({
    externalId: r.playerId,
    playerName: r.playerName,
    sport: r.sport.toUpperCase(),
    status: r.status,
    teamAbbrev: r.teamAbbrev,
    source: 'official_api',
    confidence: 1.0,
    rawText: r.status,
    gameDate: r.gameDate ? r.gameDate.toISOString().slice(0, 10) : null,
  }))
}

/**
 * Pulls multi-source status signals, dedupes, persists `PlayerStatusEvent` + `SportsPlayer.status`.
 */
export async function aggregatePlayerStatuses(sport: string, gameDate: string): Promise<AggregatedPlayerStatus[]> {
  const sk = sport.toUpperCase()
  const gameDateObj = gameDate ? new Date(`${gameDate}T12:00:00.000Z`) : null

  const settled = await Promise.allSettled([
    fetchOfficialStatuses(sk),
    sk === 'NFL' || sk === 'NBA'
      ? fetchSleeperStatuses(sk === 'NFL' ? 'nfl' : 'nba')
      : Promise.resolve(new Map<string, string>()),
    searchXForInjuryNews(sk, gameDate),
    fetchInjuryNewsArticles(sk, gameDate),
    fetchBleacherReportInjuries(sk, gameDate),
  ])

  const hits: NormalizedStatusHit[] = []

  if (settled[0]?.status === 'fulfilled') {
    hits.push(...mapOfficialRows(settled[0].value))
  } else if (settled[0]?.status === 'rejected') {
    console.warn('[PlayerStatusAggregator] official_api failed:', settled[0].reason)
  }

  if (settled[1]?.status === 'fulfilled' && (sk === 'NFL' || sk === 'NBA')) {
    const map = settled[1].value
    const ids = [...map.keys()].slice(0, 12_000)
    const metaRows =
      ids.length > 0
        ? await prisma.sportsPlayer.findMany({
            where: { sport: sk, externalId: { in: ids } },
            select: { externalId: true, name: true, team: true },
          })
        : []
    const meta = new Map(metaRows.map((r) => [r.externalId, r]))
    for (const [externalId, status] of map) {
      const m = meta.get(externalId)
      hits.push({
        externalId,
        playerName: m?.name ?? '',
        sport: sk,
        status,
        teamAbbrev: m?.team ?? null,
        source: 'sleeper_api',
        confidence: 0.95,
        rawText: status,
        gameDate,
      })
    }
  } else if (settled[1]?.status === 'rejected') {
    console.warn('[PlayerStatusAggregator] sleeper failed:', settled[1].reason)
  }

  if (settled[2]?.status === 'fulfilled') {
    hits.push(...settled[2].value)
  } else if (settled[2]?.status === 'rejected') {
    console.warn('[PlayerStatusAggregator] x_grok failed:', settled[2].reason)
  }

  if (settled[3]?.status === 'fulfilled') {
    hits.push(...settled[3].value)
  } else if (settled[3]?.status === 'rejected') {
    console.warn('[PlayerStatusAggregator] news_api failed:', settled[3].reason)
  }

  if (settled[4]?.status === 'fulfilled') {
    hits.push(...settled[4].value)
  } else if (settled[4]?.status === 'rejected') {
    console.warn('[PlayerStatusAggregator] bleacher_report failed:', settled[4].reason)
  }

  const resolved: NormalizedStatusHit[] = []
  for (const h of hits) {
    if (!isSwapEligibleStatus(h.status)) continue
    const r = await resolveExternalId(sk, h)
    if (!r) continue
    resolved.push({
      ...h,
      externalId: r.externalId,
      playerName: r.playerName,
      teamAbbrev: h.teamAbbrev ?? r.teamAbbrev,
    })
  }

  const groupMap = new Map<
    string,
    {
      hits: NormalizedStatusHit[]
      externalId: string
      playerName: string
      teamAbbrev: string | null
      canonical: string
    }
  >()

  for (const h of resolved) {
    const canonical = normalizeStatusToken(h.status)
    const key = `${h.externalId}|${canonical}`
    const g = groupMap.get(key)
    if (!g) {
      groupMap.set(key, {
        hits: [h],
        externalId: h.externalId!,
        playerName: h.playerName,
        teamAbbrev: h.teamAbbrev ?? null,
        canonical,
      })
    } else {
      g.hits.push(h)
    }
  }

  const results: AggregatedPlayerStatus[] = []
  const since = new Date(Date.now() - 30 * 60 * 1000)

  for (const g of groupMap.values()) {
    const dup = await prisma.playerStatusEvent.findFirst({
      where: {
        externalId: g.externalId,
        newStatus: g.canonical,
        detectedAt: { gte: since },
      },
    })
    if (dup) continue

    const sources = Array.from(new Set(g.hits.map((x) => x.source)))
    const avgConf = g.hits.reduce((s, x) => s + x.confidence, 0) / Math.max(1, g.hits.length)

    const prevRows = await prisma.sportsPlayer.findMany({
      where: { sport: sk, externalId: g.externalId },
      select: { status: true },
      take: 1,
    })
    const previousStatus = prevRows[0]?.status ?? null

    const event = await prisma.playerStatusEvent.create({
      data: {
        externalId: g.externalId,
        playerName: g.playerName,
        sport: sk,
        teamAbbrev: g.teamAbbrev,
        newStatus: g.canonical,
        previousStatus,
        statusReason: null,
        source: sources.join('+'),
        sourceUrl: g.hits.find((x) => x.sourceUrl)?.sourceUrl ?? null,
        sourceRawText: g.hits.map((x) => x.rawText ?? x.status).filter(Boolean).join(' | ').slice(0, 8000),
        confidence: avgConf,
        gameDate: gameDateObj && !Number.isNaN(gameDateObj.getTime()) ? gameDateObj : null,
      },
    })

    await prisma.sportsPlayer.updateMany({
      where: { sport: sk, externalId: g.externalId },
      data: { status: g.canonical },
    })

    results.push({
      externalId: g.externalId,
      playerName: g.playerName,
      sport: sk,
      teamAbbrev: g.teamAbbrev,
      newStatus: g.canonical,
      statusReason: null,
      confirmedBy: sources,
      confidence: avgConf,
      gameDate: gameDateObj && !Number.isNaN(gameDateObj.getTime()) ? gameDateObj : null,
      rawSources: g.hits.map((x) => ({
        source: x.source,
        rawText: x.rawText ?? x.status,
        sourceUrl: x.sourceUrl ?? undefined,
      })),
      eventId: event.id,
    })
  }

  return results
}
