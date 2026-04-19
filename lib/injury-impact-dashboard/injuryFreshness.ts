import type { InjuryPlayerIntelRow } from './types'

function parseMs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

/** Deterministic freshness copy — no invented timelines. */
export function formatInjuryFreshnessNote(row: Pick<InjuryPlayerIntelRow, 'reportDate' | 'lastUpdated' | 'source'>): string {
  const primary = parseMs(row.reportDate) ?? parseMs(row.lastUpdated)
  if (primary == null) return 'No report timestamp on file — treat status as uncertain until kickoff.'
  const ageMs = Date.now() - primary
  const hours = ageMs / (60 * 60 * 1000)
  if (hours < 1) return 'Report/recency: within the last hour (feed freshness varies by provider).'
  if (hours < 24) return `Report/recency: ~${Math.round(hours)}h ago — re-check closer to lock.`
  const days = hours / 24
  if (days < 7) return `Report/recency: ~${Math.round(days)}d ago — confirm designation before lineup submit.`
  return `Report/recency: ~${Math.round(days)}d ago — stale for same-week decisions; verify current status.`
}

/**
 * Confidence 0–100 from recency + source (deterministic, not clinical severity).
 */
export function computeInjuryConfidence(row: Pick<InjuryPlayerIntelRow, 'reportDate' | 'lastUpdated' | 'source'>): number {
  const primary = parseMs(row.reportDate) ?? parseMs(row.lastUpdated)
  let base = 55
  if (primary != null) {
    const hours = (Date.now() - primary) / (60 * 60 * 1000)
    if (hours < 6) base = 86
    else if (hours < 24) base = 78
    else if (hours < 72) base = 68
    else if (hours < 168) base = 58
    else base = 48
  }
  if (row.source === 'injury_report') base = Math.min(100, base + 8)
  if (row.source === 'sports_player_record') base = Math.max(35, base - 6)
  return Math.round(base)
}
