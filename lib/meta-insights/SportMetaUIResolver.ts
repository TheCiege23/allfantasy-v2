/**
 * SportMetaUIResolver – sport list and normalization for Meta Insights UI.
 * UI filters and AI summaries always respect the selected sport context.
 */

export const META_UI_SPORTS = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAF',
  'NCAAB',
  'SOCCER',
] as const

export type MetaUISport = (typeof META_UI_SPORTS)[number]

export function resolveSportForMetaUI(sport: string | null | undefined): MetaUISport {
  const s = (sport || 'NFL').toUpperCase().trim()
  return META_UI_SPORTS.includes(s as MetaUISport) ? (s as MetaUISport) : 'NFL'
}

export function getSportOptionsForUI(): Array<{ value: string; label: string }> {
  return META_UI_SPORTS.map((s) => ({ value: s, label: s }))
}
