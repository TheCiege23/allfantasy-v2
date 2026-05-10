const DRAFT_INTRO_VIDEO_BY_KEY: Record<string, string> = {
  snake: '/videos/drafts/snake-draft-intro.mp4',
  linear: '/videos/drafts/linear-draft-intro.mp4',
  auction: '/videos/drafts/auction-draft-intro.mp4',
  slow: '/videos/drafts/slow-draft-intro.mp4',
  rookie: '/videos/drafts/rookie-draft-intro.mp4',
  startup: '/videos/drafts/startup-draft-intro.mp4',
  offline: '/videos/drafts/offline-draft-intro.mp4',
  auto: '/videos/drafts/auto-draft-intro.mp4',
  lottery: '/videos/drafts/lottery-draft-intro.mp4',
  weighted_lottery: '/videos/drafts/weighted-lottery-draft-intro.mp4',
}

export function normalizeDraftTypeKey(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

export function resolveDraftIntroVideoUrl(draftTypeKey: unknown): string | null {
  const normalized = normalizeDraftTypeKey(draftTypeKey)
  if (!normalized) return null
  return DRAFT_INTRO_VIDEO_BY_KEY[normalized] ?? null
}
