import { formatDistance } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

/** Convert wall-clock date + time in an IANA zone to UTC. */
export function toUtc(localDateStr: string, localTimeStr: string, tz: string): Date {
  const [y, m, d] = localDateStr.split('-').map((x) => parseInt(x, 10))
  const timeParts = localTimeStr.split(':').map((x) => parseInt(x, 10))
  const h = timeParts[0] ?? 0
  const min = timeParts[1] ?? 0
  const sec = timeParts[2] ?? 0
  const localWall = new Date(y, m - 1, d, h, min, sec)
  return fromZonedTime(localWall, tz)
}

export function formatInTz(utcDate: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(utcDate)
}

export function formatDistanceUtc(utcDate: Date, base: Date = new Date()): string {
  return formatDistance(utcDate, base, { addSuffix: true })
}

export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Toronto', label: 'Eastern Canada (ET)' },
  { value: 'America/Vancouver', label: 'Pacific Canada (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
] as const

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    const supported =
      typeof Intl !== 'undefined' &&
      'supportedValuesOf' in Intl &&
      typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf ===
        'function'
      ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone')
      : null
    if (supported?.includes(tz)) return true
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}
