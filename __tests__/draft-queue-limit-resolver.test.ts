import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DRAFT_QUEUE_SIZE_LIMIT,
  MAX_DRAFT_QUEUE_SIZE_LIMIT,
  normalizeDraftQueueSizeLimit,
  trimDraftQueue,
} from '@/lib/draft-defaults/DraftQueueLimitResolver'

describe('DraftQueueLimitResolver', () => {
  it('falls back to the default limit when the input is missing or invalid', () => {
    expect(normalizeDraftQueueSizeLimit(undefined)).toBe(DEFAULT_DRAFT_QUEUE_SIZE_LIMIT)
    expect(normalizeDraftQueueSizeLimit(null)).toBe(DEFAULT_DRAFT_QUEUE_SIZE_LIMIT)
    expect(normalizeDraftQueueSizeLimit(Number.NaN)).toBe(DEFAULT_DRAFT_QUEUE_SIZE_LIMIT)
  })

  it('keeps valid queue limits within bounds', () => {
    expect(normalizeDraftQueueSizeLimit(60)).toBe(60)
    expect(normalizeDraftQueueSizeLimit(70)).toBe(70)
  })

  it('clamps queue limits to the supported range', () => {
    expect(normalizeDraftQueueSizeLimit(0)).toBe(1)
    expect(normalizeDraftQueueSizeLimit(999)).toBe(MAX_DRAFT_QUEUE_SIZE_LIMIT)
  })

  it('trims the queue to the normalized queue size limit', () => {
    const queue = Array.from({ length: 80 }, (_, index) => ({
      playerName: `Player ${index + 1}`,
      position: 'RB',
      team: null,
    }))

    expect(trimDraftQueue(queue, 60)).toHaveLength(60)
    expect(trimDraftQueue(queue, 70)).toHaveLength(70)
    expect(trimDraftQueue(queue, undefined)).toHaveLength(DEFAULT_DRAFT_QUEUE_SIZE_LIMIT)
  })
})