/**
 * leagueTabGroups — slice 2B of the Broadcast Deck league redesign.
 *
 * Pure mapping that folds the league page's flat tab strip (15+ ids across
 * sports/variants) into five ordered groups: Decide · Draft · Roster · League ·
 * Legacy · Commish. Presentation-only: every existing tab id survives as a
 * sub-tab (same ids, same deep links, same testids), so no view is orphaned —
 * an unknown/new tab id simply lands in the League group instead of vanishing.
 */

export type LeagueTabGroupId = 'decide' | 'draft' | 'roster' | 'league' | 'legacy' | 'commish'

export const LEAGUE_TAB_GROUP_ORDER: { id: LeagueTabGroupId; label: string }[] = [
  { id: 'decide', label: 'Decide' },
  { id: 'draft', label: 'Draft' },
  { id: 'roster', label: 'Roster' },
  { id: 'league', label: 'League' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'commish', label: 'Commish' },
]

const GROUP_BY_TAB: Record<string, LeagueTabGroupId> = {
  // Decide — the brain-first surfaces
  decide: 'decide',
  ai_coaching: 'decide',

  // Draft — live drafts + draft-adjacent views
  draft: 'draft',
  redraft: 'draft',

  // Roster — my team + roster construction
  team: 'roster',
  roster: 'roster',
  squad: 'roster',
  keeper: 'roster',
  dynasty: 'roster',
  dynasty_taxi: 'roster',
  dynasty_picks: 'roster',
  'my-picks': 'roster',

  // Legacy — history + the AF Legacy product surface
  legacy: 'legacy',
  history: 'legacy',
  war_room: 'legacy',
  bb_history: 'legacy',

  // Commish — permissioned controls
  commissioner: 'commish',
  settings: 'commish',
  survivor_command: 'commish',
  bb_command: 'commish',
  finance: 'commish',
}

export function groupForLeagueTab(tabId: string): LeagueTabGroupId {
  return GROUP_BY_TAB[tabId] ?? 'league'
}

export type LeagueTabLike = { id: string; label: string }

export type LeagueTabGroup<T extends LeagueTabLike> = {
  id: LeagueTabGroupId
  label: string
  tabs: T[]
}

/** Fold an ordered tab list into ordered, non-empty groups (tab order preserved within each). */
export function buildLeagueTabGroups<T extends LeagueTabLike>(tabs: T[]): LeagueTabGroup<T>[] {
  const buckets = new Map<LeagueTabGroupId, T[]>()
  for (const tab of tabs) {
    const gid = groupForLeagueTab(tab.id)
    const list = buckets.get(gid)
    if (list) list.push(tab)
    else buckets.set(gid, [tab])
  }
  return LEAGUE_TAB_GROUP_ORDER.filter((g) => buckets.has(g.id)).map((g) => ({
    id: g.id,
    label: g.label,
    tabs: buckets.get(g.id) as T[],
  }))
}
