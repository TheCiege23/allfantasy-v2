/**
 * Resolves date range and query options for platform analytics.
 */

const DEFAULT_DAYS = 30
const MAX_DAYS = 365

export interface AnalyticsQueryOptions {
  fromDate: Date
  toDate: Date
  days: number
}

/** Parse "from" and "to" query params (ISO date or YYYY-MM-DD). Defaults to last 30 days. */
export function resolveDateRange(
  from: string | null | undefined,
  to: string | null | undefined
): AnalyticsQueryOptions {
  const now = new Date()
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
  let fromDate: Date
  let toDate: Date
  if (from && to) {
    const f = new Date(from)
    const t = new Date(to)
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime())) {
      fromDate = f
      toDate = t
    } else {
      toDate = endOfToday
      fromDate = new Date(toDate.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000)
    }
  } else {
    toDate = endOfToday
    fromDate = new Date(toDate.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000)
  }
  const days = Math.min(MAX_DAYS, Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))))
  return { fromDate, toDate, days }
}

/** Return start of day UTC for a date. */
export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
