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

export type GifSearchResult = {
  id: string
  url: string
  previewUrl?: string
  provider: "tenor" | "giphy"
}

function normalizeTenorResults(payload: unknown): GifSearchResult[] {
  const list = Array.isArray((payload as { results?: unknown[] })?.results)
    ? ((payload as { results: unknown[] }).results)
    : []
  const normalized: GifSearchResult[] = []
  for (const entry of list) {
      const obj = entry as Record<string, unknown>
      const id = typeof obj.id === "string" ? obj.id : ""
      const mediaFormats = (obj.media_formats || {}) as Record<string, Record<string, unknown>>
      const gif = mediaFormats.gif
      const tiny = mediaFormats.tinygif
      const url = typeof gif?.url === "string" ? gif.url : ""
      const previewUrl = typeof tiny?.url === "string" ? tiny.url : url
      if (!id || !url) continue
      normalized.push({ id, url, previewUrl, provider: "tenor" })
  }
  return normalized
}

function normalizeGiphyResults(payload: unknown): GifSearchResult[] {
  const list = Array.isArray((payload as { data?: unknown[] })?.data)
    ? ((payload as { data: unknown[] }).data)
    : []
  const normalized: GifSearchResult[] = []
  for (const entry of list) {
      const obj = entry as Record<string, unknown>
      const id = typeof obj.id === "string" ? obj.id : ""
      const images = (obj.images || {}) as Record<string, Record<string, unknown>>
      const original = images.original
      const preview = images.preview_gif || images.fixed_width_small || original
      const url = typeof original?.url === "string" ? original.url : ""
      const previewUrl = typeof preview?.url === "string" ? preview.url : url
      if (!id || !url) continue
      normalized.push({ id, url, previewUrl, provider: "giphy" })
  }
  return normalized
}

export async function searchGifs(query: string, limit = 12): Promise<GifSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const provider = getGifProviderName()
  if (!provider) return []

  const url = provider === "tenor" ? getTenorSearchUrl(trimmed, limit) : getGiphySearchUrl(trimmed, limit)
  if (!url) return []

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json().catch(() => ({}))
    return provider === "tenor" ? normalizeTenorResults(data) : normalizeGiphyResults(data)
  } catch {
    return []
  }
}
