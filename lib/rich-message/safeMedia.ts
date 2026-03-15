/**
 * Safe media URL resolution for chat messages — only allow https or relative URLs.
 */

export function getSafeMessageMediaUrl(body: string): string | null {
  const trimmed = (body || "").trim()
  if (!trimmed) return null
  try {
    if (trimmed.startsWith("/")) return trimmed
    const u = new URL(trimmed)
    if (u.protocol === "https:") return trimmed
    if (u.protocol === "http:" && (typeof window === "undefined" || window.location?.hostname === "localhost"))
      return trimmed
    return null
  } catch {
    return null
  }
}

export function isSafeToRenderMedia(url: string): boolean {
  return getSafeMessageMediaUrl(url) !== null
}
