import { createHash } from 'crypto'

/**
 * Stable cache key for AI context blobs (outlooks, draft intel, league profiles).
 * Deterministic: same logical input → same key.
 */
export function getCacheKeyForAiContext(parts: Record<string, unknown>): string {
  const normalized = stableStringify(parts)
  return createHash('sha256').update(normalized).digest('hex').slice(0, 48)
}

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  const sorted: Record<string, unknown> = {}
  for (const k of keys) {
    const v = obj[k]
    sorted[k] = v && typeof v === 'object' && !Array.isArray(v) && v !== null
      ? sortNested(v as Record<string, unknown>)
      : v
  }
  return JSON.stringify(sorted)
}

function sortNested(o: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(o).sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    const v = o[k]
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && v !== null
        ? sortNested(v as Record<string, unknown>)
        : v
  }
  return out
}
