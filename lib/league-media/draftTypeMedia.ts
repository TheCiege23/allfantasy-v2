import type { DraftTypeId } from '@/lib/league-creation-wizard/types'

export type DraftTypeMedia = {
  selectionVideo: string
  thumbnail: string
  thumbnailFallback: string
}

const FALLBACK = '/af-crest.png'

/** Short preview clips for each draft type; reuse league-type assets where we do not have dedicated draft footage yet. */
const DRAFT_TYPE_MEDIA_MAP: Record<string, Omit<DraftTypeMedia, never>> = {
  snake: {
    selectionVideo: '/league-type-redraft-intro.mp4',
    thumbnail: '/league-type-dynasty.png',
    thumbnailFallback: FALLBACK,
  },
  linear: {
    selectionVideo: '/league-type-keeper-intro.mp4',
    thumbnail: '/league-type-keeper.png',
    thumbnailFallback: FALLBACK,
  },
  auction: {
    selectionVideo: '/league-type-salary-cap-intro.mp4',
    thumbnail: '/league-type-salary-cap.png',
    thumbnailFallback: FALLBACK,
  },
  slow_draft: {
    selectionVideo: '/league-type-best-ball-intro.mp4',
    thumbnail: '/league-type-best-ball.png',
    thumbnailFallback: FALLBACK,
  },
  mock_draft: {
    selectionVideo: '/Football.mp4',
    thumbnail: '/league-type-dynasty.png',
    thumbnailFallback: FALLBACK,
  },
  devy_snake: {
    selectionVideo: '/league-type-devy-intro.mp4',
    thumbnail: '/league-type-devy.png',
    thumbnailFallback: FALLBACK,
  },
  devy_auction: {
    selectionVideo: '/league-type-devy.mp4',
    thumbnail: '/league-type-devy.png',
    thumbnailFallback: FALLBACK,
  },
  c2c_snake: {
    selectionVideo: '/league-type-c2c-intro.mp4',
    thumbnail: '/league-type-c2c.png',
    thumbnailFallback: FALLBACK,
  },
  c2c_auction: {
    selectionVideo: '/league-type-c2c.mp4',
    thumbnail: '/league-type-c2c.png',
    thumbnailFallback: FALLBACK,
  },
}

export function getDraftTypeMedia(id: DraftTypeId): DraftTypeMedia {
  const row = DRAFT_TYPE_MEDIA_MAP[id] ?? DRAFT_TYPE_MEDIA_MAP.snake!
  return { ...row, thumbnailFallback: row.thumbnailFallback ?? FALLBACK }
}
