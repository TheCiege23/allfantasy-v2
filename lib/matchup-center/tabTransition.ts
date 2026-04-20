import type { TabDef } from '@/app/league/[leagueId]/LeagueTabs'

/** Lifecycle states where the primary game tab should be Matchup (in-season command center), not Draft. */
const MATCHUP_PRIMARY_LIFECYCLES = new Set([
  'post_draft',
  'in_season',
  'playoffs',
  'completed',
  'archived',
])

/**
 * When true, the first-column tab should be `matchup` instead of `draft` (NFL-style tab strips)
 * or inserted before roster/squad (basketball/soccer).
 */
export function shouldUseMatchupInsteadOfDraft(lifecycleState: string | null | undefined): boolean {
  const s = String(lifecycleState ?? '').trim()
  return MATCHUP_PRIMARY_LIFECYCLES.has(s)
}

/**
 * Replace leading `draft` with `matchup`, or insert `matchup` before roster/squad/leaderboard when
 * there is no draft tab (e.g. basketball / soccer).
 */
export function applyMatchupPrimaryTab(tabDefs: TabDef[], useMatchup: boolean): TabDef[] {
  if (!useMatchup) return tabDefs

  const draftIdx = tabDefs.findIndex((t) => t.id === 'draft')
  if (draftIdx >= 0) {
    const next = [...tabDefs]
    next[draftIdx] = { id: 'matchup', label: 'Matchup' }
    return next
  }

  const insertBefore = tabDefs.findIndex((t) => t.id === 'roster' || t.id === 'squad' || t.id === 'leaderboard')
  if (insertBefore >= 0) {
    const m: TabDef = { id: 'matchup', label: 'Matchup' }
    return [...tabDefs.slice(0, insertBefore), m, ...tabDefs.slice(insertBefore)]
  }

  return [{ id: 'matchup', label: 'Matchup' }, ...tabDefs]
}
