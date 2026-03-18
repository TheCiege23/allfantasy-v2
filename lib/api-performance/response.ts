/**
 * Response helpers: cache headers, lean payloads.
 */

export type CacheControlPreset = 'no-store' | 'short' | 'medium' | 'long' | 'public-medium'

/**
 * Standard Cache-Control headers for API responses.
 */
export function cacheControlHeaders(preset: CacheControlPreset): Record<string, string> {
  switch (preset) {
    case 'no-store':
      return { 'Cache-Control': 'no-store, no-cache' }
    case 'short':
      return { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60' }
    case 'medium':
      return { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    case 'long':
      return { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    case 'public-medium':
      return { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    default:
      return {}
  }
}

/**
 * Optional: strip null/undefined from object for smaller payload (shallow).
 */
export function leanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v != null) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/**
 * Pick only listed keys from object (for field selection / smaller response).
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): Pick<T, keyof T> {
  const out = {} as Pick<T, keyof T>
  for (const k of keys) {
    if (k in obj) out[k] = obj[k]
  }
  return out
}
