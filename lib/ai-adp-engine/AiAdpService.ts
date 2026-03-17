/**
 * AI ADP service: run aggregation + computation, persist snapshots, and read for draft room.
 */

import { prisma } from '@/lib/prisma'
import { aggregateLiveDraftPicks, aggregateMockDraftResults, mergeSegmentPicks } from './aggregate-draft-picks'
import { computeAdpFromPicks, buildSnapshotDataAndMeta } from './compute-adp'
import type { AiAdpPlayerEntry } from './types'
import { LOW_SAMPLE_THRESHOLD_DEFAULT } from './types'

export interface RunAiAdpJobResult {
  segmentsUpdated: number
  totalPicksProcessed: number
  errors: string[]
}

/**
 * Run the full AI ADP job: aggregate picks from live + mock, compute ADP per segment, upsert AiAdpSnapshot.
 * Call from cron daily.
 */
export async function runAiAdpJob(
  since?: Date,
  lowSampleThreshold: number = LOW_SAMPLE_THRESHOLD_DEFAULT
): Promise<RunAiAdpJobResult> {
  const errors: string[] = []
  let totalPicksProcessed = 0
  const cutoff = since ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // default last 90 days

  let live: Awaited<ReturnType<typeof aggregateLiveDraftPicks>> = []
  let mock: Awaited<ReturnType<typeof aggregateMockDraftResults>> = []
  try {
    ;[live, mock] = await Promise.all([
      aggregateLiveDraftPicks(cutoff),
      aggregateMockDraftResults(cutoff),
    ])
  } catch (e) {
    errors.push((e as Error).message)
    return { segmentsUpdated: 0, totalPicksProcessed: 0, errors }
  }

  const merged = mergeSegmentPicks(live, mock)
  const computed = computeAdpFromPicks(merged, { lowSampleThreshold })
  let segmentsUpdated = 0

  for (const [, { segment, entries }] of computed) {
    const segData = merged.find(
      (s) =>
        s.segment.sport === segment.sport &&
        s.segment.leagueType === segment.leagueType &&
        s.segment.formatKey === segment.formatKey
    )
    const totalPicks = segData?.picks.length ?? 0
    const totalDrafts = segData?.draftCount ?? 0
    if (entries.length === 0) continue
    totalPicksProcessed += totalPicks
    const { snapshotData, meta } = buildSnapshotDataAndMeta(
      entries,
      totalDrafts,
      totalPicks,
      lowSampleThreshold
    )
    try {
      await prisma.aiAdpSnapshot.upsert({
        where: {
          sport_leagueType_formatKey: {
            sport: segment.sport,
            leagueType: segment.leagueType,
            formatKey: segment.formatKey,
          },
        },
        create: {
          sport: segment.sport,
          leagueType: segment.leagueType,
          formatKey: segment.formatKey,
          snapshotData: snapshotData as any,
          totalDrafts,
          totalPicks,
          meta: meta as any,
        },
        update: {
          snapshotData: snapshotData as any,
          totalDrafts,
          totalPicks,
          meta: meta as any,
          computedAt: new Date(),
        },
      })
      segmentsUpdated++
    } catch (e) {
      errors.push(`Segment ${segment.sport}/${segment.leagueType}/${segment.formatKey}: ${(e as Error).message}`)
    }
  }

  return { segmentsUpdated, totalPicksProcessed, errors }
}

/**
 * Get AI ADP for a segment. Returns entries with lowSample flag; null if no snapshot.
 */
export async function getAiAdp(
  sport: string,
  leagueType: string = 'redraft',
  formatKey: string = 'default'
): Promise<{
  entries: AiAdpPlayerEntry[]
  totalDrafts: number
  totalPicks: number
  computedAt: Date | null
  lowSampleThreshold?: number
} | null> {
  const snapshot = await prisma.aiAdpSnapshot.findUnique({
    where: {
      sport_leagueType_formatKey: {
        sport: sport.toUpperCase(),
        leagueType: leagueType.toLowerCase(),
        formatKey: formatKey.toLowerCase(),
      },
    },
  })
  if (!snapshot) return null
  const data = (snapshot.snapshotData as unknown as AiAdpPlayerEntry[]) ?? []
  const meta = (snapshot.meta as Record<string, unknown>) ?? {}
  return {
    entries: data,
    totalDrafts: snapshot.totalDrafts,
    totalPicks: snapshot.totalPicks,
    computedAt: snapshot.computedAt,
    lowSampleThreshold: meta.lowSampleThreshold as number | undefined,
  }
}

/**
 * Get best-matching AI ADP for a league (sport, isDynasty, format from settings).
 * Falls back to sport + redraft + default if exact segment missing.
 */
export async function getAiAdpForLeague(
  sport: string,
  isDynasty: boolean,
  formatKey?: string
): Promise<{
  entries: AiAdpPlayerEntry[]
  totalDrafts: number
  totalPicks: number
  computedAt: Date | null
  segment: { sport: string; leagueType: string; formatKey: string }
  lowSampleThreshold?: number
} | null> {
  const leagueType = isDynasty ? 'dynasty' : 'redraft'
  const fmt = formatKey ?? 'default'
  let result = await getAiAdp(sport, leagueType, fmt)
  if (result) {
    return {
      ...result,
      segment: { sport: sport.toUpperCase(), leagueType, formatKey: fmt },
    }
  }
  result = await getAiAdp(sport, leagueType, 'default')
  if (result) {
    return {
      ...result,
      segment: { sport: sport.toUpperCase(), leagueType, formatKey: 'default' },
    }
  }
  result = await getAiAdp(sport, 'redraft', 'default')
  if (result) {
    return {
      ...result,
      segment: { sport: sport.toUpperCase(), leagueType: 'redraft', formatKey: 'default' },
    }
  }
  return null
}
