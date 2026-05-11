/**
 * Draft intro / selection clips for Create League + draft rooms.
 * Uses shipped assets under `/public/media/create-league/drafts/` and `/public/media/draft-intros/`.
 * Unknown stems fail closed (empty / null) so callers never crash on missing files.
 */

/** Poster / card / board imagery keyed by normalized draft type */
const DRAFT_TYPE_IMAGE_BY_KEY: Record<string, string> = {
  snake: '/images/draft-types/snake-draft.png',
}

/**
 * Ordered clip URLs per format stem — first URL is the canonical primary hero clip.
 */
export const DRAFT_SELECTION_VIDEO_BY_STEM: Record<string, readonly string[]> = {
  snake: [
    '/media/create-league/drafts/videos/Snake Draft.mp4',
    '/media/draft-intros/Snake Draft Intro.mp4',
    '/media/create-league/drafts/videos/Snake Draft Intro.mp4',
    '/media/draft-intros/Snake Draft.mp4',
    '/media/draft-intros/snake-draft-intro.mp4',
  ],
  linear: [
    '/media/create-league/drafts/videos/Linear Draft.mp4',
    '/media/draft-intros/Linear Draft Intro_1080p_caption.mp4',
    '/media/league-intros/videos/Linear Draft Intro_1080p_caption.mp4',
  ],
  auction: ['/media/create-league/drafts/videos/Auction Draft.mp4'],
}

export function normalizeDraftTypeKey(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

/**
 * Maps wizard ids (`devy_snake`, `slow_draft`, …) to a draft-format stem for media lookup.
 */
export function resolveDraftIntroStemFromWizardId(raw: unknown): string {
  const s = normalizeDraftTypeKey(raw)
  if (!s) return ''
  if (s === 'third_round_reversal' || s === 'third-round-reversal') return 'snake'
  if (s.includes('snake')) return 'snake'
  if (s.includes('linear')) return 'linear'
  if (s.includes('auction')) return 'auction'
  if (s === 'slow_draft' || s === 'slow') return 'slow'
  if (s === 'mock_draft' || s === 'mock') return 'mock'
  if (s === 'offline') return 'offline'
  if (s === 'auto') return 'auto'
  if (s.includes('rookie')) return 'rookie'
  if (s.includes('startup')) return 'startup'
  if (s.includes('weighted') && s.includes('lottery')) return 'weighted_lottery'
  if (s.includes('lottery')) return 'lottery'
  return s
}

/** Primary hero/list selection video for a wizard draft id (non-empty when shipped). */
export function resolveDraftSelectionVideoUrl(raw: unknown): string {
  const stem = resolveDraftIntroStemFromWizardId(raw)
  if (!stem) return ''
  const list = DRAFT_SELECTION_VIDEO_BY_STEM[stem]
  return list?.[0] ?? ''
}

export function resolveDraftIntroVideoUrl(draftTypeKey: unknown): string | null {
  const url = resolveDraftSelectionVideoUrl(draftTypeKey)
  return url || null
}

export function resolveDraftIntroPosterUrl(draftTypeKey: unknown): string | null {
  const normalized = normalizeDraftTypeKey(draftTypeKey)
  if (!normalized) return null
  return DRAFT_TYPE_IMAGE_BY_KEY[normalized] ?? null
}

/** Room/board default artwork when no custom asset exists */
export function resolveDraftBoardImageUrl(draftTypeKey: unknown): string | null {
  return resolveDraftIntroPosterUrl(draftTypeKey)
}
