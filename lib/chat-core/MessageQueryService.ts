/**
 * MessageQueryService — pagination, cursor, and limit for chat messages.
 */

export const DEFAULT_PAGE_LIMIT = 50
export const MAX_PAGE_LIMIT = 100

export function clampLimit(limit: number): number {
  return Math.max(1, Math.min(limit, MAX_PAGE_LIMIT))
}

export function parseCursor(cursor: string | null): Date | null {
  if (!cursor || typeof cursor !== "string") return null
  const d = new Date(cursor)
  return isNaN(d.getTime()) ? null : d
}

export interface MessageQueryOptions {
  limit?: number
  before?: string | null
}

export function getMessageQueryOptions(searchParams: URLSearchParams): MessageQueryOptions {
  const limit = clampLimit(Number(searchParams.get("limit") || DEFAULT_PAGE_LIMIT))
  const before = searchParams.get("before") || null
  return { limit, before }
}
