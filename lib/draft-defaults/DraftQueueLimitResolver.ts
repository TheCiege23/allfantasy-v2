export const DEFAULT_DRAFT_QUEUE_SIZE_LIMIT = 50
export const MAX_DRAFT_QUEUE_SIZE_LIMIT = 200

export function normalizeDraftQueueSizeLimit(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_DRAFT_QUEUE_SIZE_LIMIT
  }

  return Math.max(1, Math.min(MAX_DRAFT_QUEUE_SIZE_LIMIT, Math.round(value)))
}

export function trimDraftQueue<T>(queue: T[], limit: number | null | undefined): T[] {
  return queue.slice(0, normalizeDraftQueueSizeLimit(limit))
}