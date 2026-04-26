/**
 * D.3 — sort model for the Sleeper-style draft pool table.
 *
 * Headers in `SleeperPoolTable` and the legacy toolbar buttons in `PlayerPanel`
 * share this single source of truth. Click handlers on either surface call
 * `nextSortState` to compute the new (key, direction) tuple, then memoize-sort
 * via `applyPoolSort`.
 *
 * Null-handling rule: missing values (em-dash players for a particular stat)
 * always sort LAST, regardless of direction. This way clicking "PTS desc"
 * brings real high-projection players to the top instead of an em-dash sea,
 * and clicking "PTS asc" brings real low-projection players to the top instead
 * of em-dash players.
 *
 * Pure module — no React, no JSX — so Vitest can import it without dragging
 * the table TSX through the transform.
 */

import type { NflDraftProjectionSplits } from '@/lib/draft/analytics/nfl-draft-pool-projection-splits'

/** Minimal player shape this module needs. PlayerPanel.PlayerEntry is a superset. */
export interface PoolSortPlayer {
  name: string
  adp?: number | null
  aiAdp?: number | null
  byeWeek?: number | null
  display?: { stats?: { fantasyPointsPerGame?: number | null } | null } | null
  nflDraftProjectionSplits?: NflDraftProjectionSplits | null
}

/**
 * Toolbar keys ('adp', 'aiAdp', 'projected', 'name') are kept verbatim from the
 * pre-D.3 implementation so existing analytics + tests + click handlers don't
 * need to be re-wired. New column keys add the rest.
 *
 * `projected` is a deliberate alias for the AVG (PPG) column — it's what the
 * "Proj" toolbar button has always sorted on.
 */
export type PoolSortKey =
  // Existing toolbar keys (pre-D.3) — preserved.
  | 'adp'
  | 'aiAdp'
  | 'projected'
  | 'name'
  // New column-derived keys (D.3).
  | 'bye'
  | 'pts'
  | 'ru_att'
  | 'ru_yds'
  | 'ru_td'
  | 'rec'
  | 'rec_yds'
  | 'rec_td'
  | 'pa_att'
  | 'pa_yds'
  | 'pa_td'
  | 'pa_int'

export type PoolSortDirection = 'asc' | 'desc'

export interface PoolSortState {
  key: PoolSortKey
  direction: PoolSortDirection
}

/**
 * Default direction the FIRST time a column is selected. Subsequent clicks on
 * the same key flip the direction.
 *   - lower-is-better fields (ADP, AI ADP, BYE, name) default to `asc`.
 *   - higher-is-better fields (PPG, season pts, all stat splits) default to `desc`.
 */
export const DEFAULT_SORT_DIRECTIONS: Record<PoolSortKey, PoolSortDirection> = {
  adp: 'asc',
  aiAdp: 'asc',
  name: 'asc',
  bye: 'asc',

  projected: 'desc',
  pts: 'desc',
  ru_att: 'desc',
  ru_yds: 'desc',
  ru_td: 'desc',
  rec: 'desc',
  rec_yds: 'desc',
  rec_td: 'desc',
  pa_att: 'desc',
  pa_yds: 'desc',
  pa_td: 'desc',
  pa_int: 'desc',
}

/** Map every Sleeper-table column key to the underlying sort key (or null if not sortable). */
export const COLUMN_TO_SORT_KEY: Record<string, PoolSortKey | null> = {
  rk: 'adp', // RK = ADP rank
  player: 'name',
  adp: 'adp',
  aiAdp: 'aiAdp',
  bye: 'bye',
  pts: 'pts',
  avg: 'projected', // toolbar's "Proj" button + the AVG column share state
  ru_att: 'ru_att',
  ru_yds: 'ru_yds',
  ru_td: 'ru_td',
  rec: 'rec',
  rec_yds: 'rec_yds',
  rec_td: 'rec_td',
  pa_att: 'pa_att',
  pa_yds: 'pa_yds',
  pa_td: 'pa_td',
  pa_int: 'pa_int',
  actions: null,
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Extract the raw value to sort by for a given key. Returns string | number | null. */
export function sortValueForKey(p: PoolSortPlayer, key: PoolSortKey): string | number | null {
  switch (key) {
    case 'name':
      return p.name ?? ''
    case 'adp':
      return num(p.adp)
    case 'aiAdp':
      return num(p.aiAdp ?? p.adp ?? null)
    case 'bye':
      return num(p.byeWeek)
    case 'projected':
      // PPG — preserves the pre-D.3 toolbar semantic. Reads display.stats.fantasyPointsPerGame
      // first (matches the card-mode sort), falls back to nflDraftProjectionSplits.projectedPointsPerGame
      // so the table shows consistent ordering even when the display model lags.
      return (
        num(p.display?.stats?.fantasyPointsPerGame) ??
        num(p.nflDraftProjectionSplits?.projectedPointsPerGame)
      )
    case 'pts':
      return num(p.nflDraftProjectionSplits?.projectedPoints)
    case 'ru_att':
      return num(p.nflDraftProjectionSplits?.rushing?.att)
    case 'ru_yds':
      return num(p.nflDraftProjectionSplits?.rushing?.yds)
    case 'ru_td':
      return num(p.nflDraftProjectionSplits?.rushing?.td)
    case 'rec':
      return num(p.nflDraftProjectionSplits?.receiving?.rec)
    case 'rec_yds':
      return num(p.nflDraftProjectionSplits?.receiving?.yds)
    case 'rec_td':
      return num(p.nflDraftProjectionSplits?.receiving?.td)
    case 'pa_att':
      return num(p.nflDraftProjectionSplits?.passing?.att)
    case 'pa_yds':
      return num(p.nflDraftProjectionSplits?.passing?.yds)
    case 'pa_td':
      return num(p.nflDraftProjectionSplits?.passing?.td)
    case 'pa_int':
      return num(p.nflDraftProjectionSplits?.passing?.int)
  }
}

/** Compare two values with nulls always sorted to the END. */
export function comparePoolSort(
  a: string | number | null,
  b: string | number | null,
  direction: PoolSortDirection,
): number {
  // Nulls always last — independent of direction.
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'string' && typeof b === 'string') {
    return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
  }
  // Coerce both to numbers (string-vs-number shouldn't happen given the getter map,
  // but defensive: treat unparseable strings as nulls-last).
  const an = typeof a === 'number' ? a : Number(a)
  const bn = typeof b === 'number' ? b : Number(b)
  if (!Number.isFinite(an) && !Number.isFinite(bn)) return 0
  if (!Number.isFinite(an)) return 1
  if (!Number.isFinite(bn)) return -1
  return direction === 'asc' ? an - bn : bn - an
}

/**
 * Sort a list of players. Stable-by-name within ties (so re-sorting from
 * descending PTS to ascending PTS doesn't shuffle no-stat players randomly).
 * Returns a new array — never mutates the input.
 */
export function applyPoolSort<T extends PoolSortPlayer>(
  list: readonly T[],
  state: PoolSortState,
): T[] {
  const out = [...list]
  out.sort((a, b) => {
    const cmp = comparePoolSort(sortValueForKey(a, state.key), sortValueForKey(b, state.key), state.direction)
    if (cmp !== 0) return cmp
    // Tiebreak: ADP asc, then name asc — keeps order intuitive within em-dash groups.
    const adpCmp = comparePoolSort(num(a.adp), num(b.adp), 'asc')
    if (adpCmp !== 0) return adpCmp
    return (a.name ?? '').localeCompare(b.name ?? '')
  })
  return out
}

/**
 * Compute the next sort state when a header / toolbar button is tapped.
 * - Same key as current → flip direction.
 * - Different key → switch to default direction for that key.
 */
export function nextSortState(current: PoolSortState, requested: PoolSortKey): PoolSortState {
  if (current.key === requested) {
    return { key: requested, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { key: requested, direction: DEFAULT_SORT_DIRECTIONS[requested] }
}

/**
 * Map a `SleeperPoolTable` column key to its sort key (or null if not sortable).
 * Wraps `COLUMN_TO_SORT_KEY` so callers don't have to import the dictionary.
 */
export function sortKeyForColumn(columnKey: string): PoolSortKey | null {
  return COLUMN_TO_SORT_KEY[columnKey] ?? null
}

/** aria-sort value for a column header. Returns 'none' when this column isn't the active sort. */
export function ariaSortValue(
  columnKey: string,
  state: PoolSortState,
): 'ascending' | 'descending' | 'none' {
  const sortKey = sortKeyForColumn(columnKey)
  if (!sortKey || sortKey !== state.key) return 'none'
  return state.direction === 'asc' ? 'ascending' : 'descending'
}
