import type { TimeframeId } from './types'

const DAYS_BY_TIMEFRAME: Record<TimeframeId, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
}

export function normalizeTimeframe(value: string | null | undefined): TimeframeId | undefined {
  if (!value) return undefined
  if (value === '24h' || value === '7d' || value === '30d') return value
  return undefined
}

export function resolveSinceFromTimeframe(value: string | null | undefined): Date | undefined {
  const timeframe = normalizeTimeframe(value)
  if (!timeframe) return undefined
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - DAYS_BY_TIMEFRAME[timeframe])
  return since
}

export function resolveSinceFromWeekOrTimeframe(input: {
  weekOrPeriod?: number
  timeframe?: string | null
}): Date | undefined {
  const since = resolveSinceFromTimeframe(input.timeframe)
  if (since) return since
  if (input.weekOrPeriod == null) return undefined
  const weekSince = new Date()
  weekSince.setUTCDate(weekSince.getUTCDate() - 7)
  return weekSince
}

export function resolveSeasonBounds(season: string | undefined): { start?: Date; end?: Date } {
  if (!season) return {}
  const parsed = Number.parseInt(season, 10)
  if (!Number.isFinite(parsed)) return {}
  const start = new Date(Date.UTC(parsed, 0, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(parsed + 1, 0, 1, 0, 0, 0, 0))
  return { start, end }
}
