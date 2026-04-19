import 'server-only'

/** Single source of truth for “now” on the server. */
export function getServerNowUTC(): Date {
  return new Date()
}

export function getServerNowISO(): string {
  return getServerNowUTC().toISOString()
}
