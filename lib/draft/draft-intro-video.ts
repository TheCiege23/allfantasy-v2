/**
 * Draft intro videos ship under `/public/media/draft-intros/{stem}-draft-intro.mp4`.
 * Only stems listed in `VERIFIED_DRAFT_INTRO_STEMS` resolve to a URL; everything else
 * fails closed (null) so callers never point at missing `/videos/drafts` paths.
 */

/** Stems that currently exist under `public/media/draft-intros/`. */
const VERIFIED_DRAFT_INTRO_STEMS = new Set(['snake'])

/** Poster / card / board imagery keyed by normalized draft type */
const DRAFT_TYPE_IMAGE_BY_KEY: Record<string, string> = {
  snake: '/images/draft-types/snake-draft.png',
}

export function normalizeDraftTypeKey(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

/**
 * Maps wizard ids (`devy_snake`, `slow_draft`, …) to the filename stem used under
 * `/media/draft-intros/{stem}-draft-intro.mp4`.
 */
export function resolveDraftIntroStemFromWizardId(raw: unknown): string {
  const s = normalizeDraftTypeKey(raw)
  if (!s) return ''
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

export function resolveDraftIntroVideoUrl(draftTypeKey: unknown): string | null {
  const stem = resolveDraftIntroStemFromWizardId(draftTypeKey)
  if (!stem) return null
  if (!VERIFIED_DRAFT_INTRO_STEMS.has(stem)) return null
  return `/media/draft-intros/${stem}-draft-intro.mp4`
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
