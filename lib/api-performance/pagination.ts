/**
 * Standard pagination for list endpoints: cursor- and offset-based.
 */

import type { NextRequest } from 'next/server'

export type CursorPageParams = {
  limit: number
  cursor: string | null
  /** For cursor: sort field used (e.g. createdAt, id). */
  sortKey?: string
}

export type OffsetPageParams = {
  page: number
  limit: number
  skip: number
}

export type PageMeta<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  /** Only set when total count is available (offset mode). */
  total?: number
  page?: number
  limit: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * Parse cursor and limit from request query.
 * Query: ?limit=20&cursor=opaque (cursor is optional).
 */
export function parseCursorPageParams(req: NextRequest, maxLimit = MAX_LIMIT): CursorPageParams {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(maxLimit, Math.max(1, parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT))
  const cursor = sp.get('cursor')?.trim() || null
  return { limit, cursor, sortKey: 'createdAt' }
}

/**
 * Parse offset pagination from request query.
 * Query: ?page=1&limit=20.
 */
export function parseOffsetPageParams(req: NextRequest, maxLimit = MAX_LIMIT): OffsetPageParams {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(maxLimit, Math.max(1, parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT))
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/**
 * Encode cursor from a record (e.g. last item's createdAt or id).
 * Use base64 or a simple delimiter to avoid leaking internals.
 */
export function encodeCursor(value: string | number | Date): string {
  const s = value instanceof Date ? value.toISOString() : String(value)
  return Buffer.from(s, 'utf8').toString('base64url')
}

/**
 * Decode cursor back to string (e.g. for Prisma where: { createdAt: { lt: decoded } }).
 */
export function decodeCursor(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/**
 * Build standard page response with optional total for offset mode.
 */
export function buildPageResponse<T>(args: {
  items: T[]
  limit: number
  nextCursor?: string | null
  hasMore?: boolean
  total?: number
  page?: number
}): PageMeta<T> {
  const hasMore = args.hasMore ?? (args.nextCursor != null)
  return {
    items: args.items,
    nextCursor: args.nextCursor ?? null,
    hasMore,
    total: args.total,
    page: args.page,
    limit: args.limit,
  }
}
