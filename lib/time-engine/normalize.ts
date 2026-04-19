import { fromZonedTime } from 'date-fns-tz'

/**
 * Normalize arbitrary API timestamps to UTC `Date`.
 * Assumes numeric ms or ISO strings; if timezone-free local string is passed with `assumeZone`, interprets in that IANA zone.
 */
export function normalizeToUTC(
  input: string | number | Date,
  options?: { assumeZone?: string }
): Date {
  if (input instanceof Date) {
    return new Date(input.getTime())
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    return new Date(input)
  }
  const s = String(input).trim()
  if (!s) return new Date(NaN)
  if (/^\d+$/.test(s)) {
    const n = Number(s)
    return new Date(n < 1e12 ? n * 1000 : n)
  }
  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed)
  }
  if (options?.assumeZone && /^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      return fromZonedTime(new Date(s.replace(' ', 'T')), options.assumeZone)
    } catch {
      return new Date(NaN)
    }
  }
  return new Date(NaN)
}
