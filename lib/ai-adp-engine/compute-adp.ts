/**
 * Compute ADP from raw picks: average overall per (playerName, position, team).
 * Handles low-sample threshold and min sample size.
 */

import type { RawPick, SegmentPicks } from './aggregate-draft-picks'
import type { AiAdpPlayerEntry } from './types'
import { LOW_SAMPLE_THRESHOLD_DEFAULT, MIN_SAMPLE_SIZE_DEFAULT } from './types'

export interface ComputeAdpOptions {
  lowSampleThreshold?: number
  minSampleSize?: number
}

/**
 * Group picks by player (name + position + team key), then average overall = ADP.
 * Exclude players with fewer than minSampleSize picks.
 */
export function computeAdpFromPicks(
  segmentPicks: SegmentPicks[],
  options: ComputeAdpOptions = {}
): Map<string, { segment: SegmentPicks['segment']; entries: AiAdpPlayerEntry[] }> {
  const lowSampleThreshold = options.lowSampleThreshold ?? LOW_SAMPLE_THRESHOLD_DEFAULT
  const minSampleSize = options.minSampleSize ?? MIN_SAMPLE_SIZE_DEFAULT
  const result = new Map<string, { segment: SegmentPicks['segment']; entries: AiAdpPlayerEntry[] }>()

  for (const seg of segmentPicks) {
    const key = `${seg.segment.sport}|${seg.segment.leagueType}|${seg.segment.formatKey}`
    const byPlayer = new Map<string, { overalls: number[]; first: RawPick }>()
    for (const p of seg.picks) {
      const playerKey = `${(p.playerName || '').trim().toLowerCase()}|${(p.position || '').trim()}|${(p.team || '').trim()}`
      if (!byPlayer.has(playerKey)) byPlayer.set(playerKey, { overalls: [], first: p })
      const rec = byPlayer.get(playerKey)!
      rec.overalls.push(p.overall)
    }
    const entries: AiAdpPlayerEntry[] = []
    for (const [, { overalls, first }] of byPlayer) {
      if (overalls.length < minSampleSize) continue
      const adp = overalls.reduce((a, b) => a + b, 0) / overalls.length
      const sampleSize = overalls.length
      entries.push({
        playerName: first.playerName.trim(),
        position: (first.position || '').trim(),
        team: first.team?.trim() ?? null,
        adp,
        sampleSize,
        lowSample: sampleSize < lowSampleThreshold,
      })
    }
    entries.sort((a, b) => a.adp - b.adp)
    result.set(key, { segment: seg.segment, entries })
  }
  return result
}

/**
 * Build snapshot data array and meta for a single segment (for DB storage).
 */
export function buildSnapshotDataAndMeta(
  entries: AiAdpPlayerEntry[],
  totalDrafts: number,
  totalPicks: number,
  lowSampleThreshold: number,
  minSampleSize: number
): { snapshotData: AiAdpPlayerEntry[]; meta: Record<string, unknown> } {
  const lowSampleCount = entries.filter((e) => e.sampleSize < lowSampleThreshold).length
  return {
    snapshotData: entries.map((e) => ({
      playerName: e.playerName,
      position: e.position,
      team: e.team,
      adp: Math.round(e.adp * 100) / 100,
      sampleSize: e.sampleSize,
      lowSample: e.sampleSize < lowSampleThreshold,
    })),
    meta: {
      minSampleSize,
      lowSampleThreshold,
      totalDrafts,
      totalPicks,
      lowSampleCount,
      highConfidenceCount: Math.max(0, entries.length - lowSampleCount),
    },
  }
}
