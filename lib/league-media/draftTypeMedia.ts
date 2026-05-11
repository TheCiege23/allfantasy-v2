import type { DraftTypeId } from '@/lib/league-creation-wizard/types'
import { resolveDraftIntroStemFromWizardId, resolveDraftIntroVideoUrl } from '@/lib/draft/draft-intro-video'

export type DraftTypeMedia = {
  selectionVideo: string
  thumbnail: string
  thumbnailFallback: string
  /** Default imagery for draft-type previews / room chrome */
  defaultDraftImageUrl: string
}

const FALLBACK = '/af-crest.png'

/** Posters and defaults per wizard draft id; selection video comes from draft-intros resolver only. */
const DRAFT_TYPE_MEDIA_MAP: Record<string, Omit<DraftTypeMedia, 'selectionVideo'>> = {
  snake: {
    thumbnail: '/images/draft-types/snake-draft.png',
    defaultDraftImageUrl: '/images/draft-types/snake-draft.png',
    thumbnailFallback: FALLBACK,
  },
  linear: {
    thumbnail: '/league-type-keeper.png',
    defaultDraftImageUrl: '/league-type-keeper.png',
    thumbnailFallback: FALLBACK,
  },
  auction: {
    thumbnail: '/league-type-salary-cap.png',
    defaultDraftImageUrl: '/league-type-salary-cap.png',
    thumbnailFallback: FALLBACK,
  },
  slow_draft: {
    thumbnail: '/league-type-best-ball.png',
    defaultDraftImageUrl: '/league-type-best-ball.png',
    thumbnailFallback: FALLBACK,
  },
  mock_draft: {
    thumbnail: '/league-type-dynasty.png',
    defaultDraftImageUrl: '/league-type-dynasty.png',
    thumbnailFallback: FALLBACK,
  },
  devy_snake: {
    thumbnail: '/league-type-devy.png',
    defaultDraftImageUrl: '/league-type-devy.png',
    thumbnailFallback: FALLBACK,
  },
  devy_linear: {
    thumbnail: '/league-type-devy.png',
    defaultDraftImageUrl: '/league-type-devy.png',
    thumbnailFallback: FALLBACK,
  },
  devy_auction: {
    thumbnail: '/league-type-devy.png',
    defaultDraftImageUrl: '/league-type-devy.png',
    thumbnailFallback: FALLBACK,
  },
  c2c_snake: {
    thumbnail: '/league-type-c2c.png',
    defaultDraftImageUrl: '/league-type-c2c.png',
    thumbnailFallback: FALLBACK,
  },
  c2c_linear: {
    thumbnail: '/league-type-c2c.png',
    defaultDraftImageUrl: '/league-type-c2c.png',
    thumbnailFallback: FALLBACK,
  },
  c2c_auction: {
    thumbnail: '/league-type-c2c.png',
    defaultDraftImageUrl: '/league-type-c2c.png',
    thumbnailFallback: FALLBACK,
  },
}

export function getDraftTypeMedia(id: DraftTypeId): DraftTypeMedia {
  const stem = resolveDraftIntroStemFromWizardId(id)
  const selectionVideo = stem ? resolveDraftIntroVideoUrl(stem) ?? '' : ''
  const row = DRAFT_TYPE_MEDIA_MAP[id] ?? DRAFT_TYPE_MEDIA_MAP.snake!
  return {
    ...row,
    selectionVideo,
    thumbnailFallback: row.thumbnailFallback ?? FALLBACK,
  }
}
