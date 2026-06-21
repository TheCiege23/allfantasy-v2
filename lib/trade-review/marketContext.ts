/**
 * T4 Market Context V1 — pure summary over T3 trade-market events only. No value changes, no adaptive
 * pricing. Just deterministic counts/averages to give a commissioner reference context.
 */

import type { MarketContext } from './types'

export interface MarketEventLite {
  eventType: string
  fairnessScore: number | null
  createdAt: string | Date
}

const RECENT_WINDOW_DAYS = 30
const MIN_SAMPLE = 3

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2)
}

/**
 * Summarize market history. `events` should be the league's (optionally sport-scoped) market events.
 * Fairness is averaged over `proposal_created` events that carried a snapshot fairness score, so each
 * proposal contributes once.
 */
export function summarizeMarketContext(events: MarketEventLite[]): MarketContext {
  const created = events.filter((e) => e.eventType === 'proposal_created')
  const fairnessValues = created
    .map((e) => e.fairnessScore)
    .filter((v): v is number => typeof v === 'number')

  const sampleSize = fairnessValues.length
  if (sampleSize < MIN_SAMPLE) {
    return { sampleSize, message: 'Not enough AllFantasy market history yet' }
  }

  const acceptedCount = events.filter((e) => e.eventType === 'proposal_accepted').length
  const vetoedCount = events.filter(
    (e) => e.eventType === 'commissioner_vetoed' || e.eventType === 'proposal_vetoed',
  ).length

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const recentCount = created.filter((e) => new Date(e.createdAt).getTime() >= cutoff).length

  const averageFairness = Math.round(fairnessValues.reduce((s, v) => s + v, 0) / sampleSize)

  return {
    sampleSize,
    averageFairness,
    medianFairness: median(fairnessValues),
    acceptedCount,
    vetoedCount,
    recentCount,
  }
}
