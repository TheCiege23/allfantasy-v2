/**
 * GIFIntegrationResolver — detect if GIF search is configured and provide paste-URL fallback.
 * Graceful fallback when TENOR_API_KEY / GIPHY_API_KEY are not set.
 */

/** Client-safe: only NEXT_PUBLIC_* are available in browser. */
function getTenorKey(): string {
  if (typeof process === "undefined") return ""
  return process.env.NEXT_PUBLIC_TENOR_API_KEY ?? ""
}
function getGiphyKey(): string {
  if (typeof process === "undefined") return ""
  return process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ""
}

export function isGifSearchConfigured(): boolean {
  return Boolean(getTenorKey() || getGiphyKey())
}

export function getGifProviderName(): "tenor" | "giphy" | null {
  if (getTenorKey()) return "tenor"
  if (getGiphyKey()) return "giphy"
  return null
}

/** Base URL for Tenor search (client-side). */
export function getTenorSearchUrl(query: string, limit = 12): string {
  const key = getTenorKey()
  if (!key) return ""
  const params = new URLSearchParams({ q: query, key, limit: String(limit), media_filter: "gif" })
  return `https://tenor.googleapis.com/v2/search?${params.toString()}`
}

/** Base URL for Giphy search (client-side). */
export function getGiphySearchUrl(query: string, limit = 12): string {
  const key = getGiphyKey()
  if (!key) return ""
  const params = new URLSearchParams({ q: query, api_key: key, limit: String(limit) })
  return `https://api.giphy.com/v1/gifs/search?${params.toString()}`
}

/** Validate that a string looks like a GIF/image URL for paste-URL flow. */
export function isValidGifOrImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === "https:" || u.protocol === "http:"
  } catch {
    return false
  }
}
