/**
 * Resolves share URLs for social clips (Prompt 116).
 */

export function getClipPageUrl(clipId: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/clips/${encodeURIComponent(clipId)}`
}

export function getTwitterShareUrl(clipPageUrl: string, text: string): string {
  const params = new URLSearchParams({
    url: clipPageUrl,
    text: text.slice(0, 200),
  })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function getFacebookShareUrl(clipPageUrl: string): string {
  const params = new URLSearchParams({ u: clipPageUrl })
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

export function getCopyLinkPayload(clipPageUrl: string, title: string): string {
  return `${title}\n${clipPageUrl}`
}
