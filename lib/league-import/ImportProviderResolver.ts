/**
 * Resolves platform identifiers (e.g. from API or UI) to canonical ImportProvider.
 */

import type { ImportProvider } from './types'

const PROVIDER_ALIASES: Record<string, ImportProvider> = {
  sleeper: 'sleeper',
  espn: 'espn',
  yahoo: 'yahoo',
  fantrax: 'fantrax',
  mfl: 'mfl',
  myfantasyleague: 'mfl',
  'my-fantasy-league': 'mfl',
  fleaflicker: 'fleaflicker',
  'fleaflicker.com': 'fleaflicker',
}

export function resolveProvider(platform: string): ImportProvider | null {
  const normalized = platform?.toLowerCase().trim()
  if (!normalized) return null
  return PROVIDER_ALIASES[normalized] ?? null
}

export function isSupportedProvider(platform: string): boolean {
  return resolveProvider(platform) !== null
}
