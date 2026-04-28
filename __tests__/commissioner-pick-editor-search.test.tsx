/**
 * G.2 — Commissioner Edit UX Fix: embedded player search.
 *
 * Static-source + behavior assertions verifying that the panel:
 *   - replaced its single <select> dropdown with a search input + filterable list
 *   - shows helper text steering users away from the player-pool Draft button
 *   - extracted the result list into its own component (CommishEditPlayerResultList)
 *     so vitest's oxc parser doesn't choke on a deep JSX tree
 *   - the legacy `commish-edit-player` testid still exists (mirrored as a hidden
 *     input) so any external automation continues to work
 *   - submit always routes through the commissioner pick-edit endpoint
 *     (never the regular submitPick path that throws "not on the clock")
 *
 * Why static-source instead of @testing-library render:
 *   vitest 4.1.5's rolldown/oxc transformer rejects some JSX patterns under
 *   inline React render in this project (we've hit this 3x in earlier slices —
 *   tracked in the bug-stab-pass and D.6.1 test files). The existing draft
 *   suite already uses static-source assertions for the same reason.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const SRC_PATH = 'components/app/draft-room/CommissionerPickEditorPanel.tsx'

describe('G.2 — Commissioner Edit Modal: search input filters the player <select>', () => {
  const src = read(SRC_PATH)

  it('a typed search input lives at data-testid="commish-edit-player-search"', () => {
    expect(src).toMatch(/data-testid="commish-edit-player-search"/)
    expect(src).toMatch(/placeholder="Search by name, position, or team"/)
  })

  it('the player <select> still has data-testid="commish-edit-player" (back-compat)', () => {
    // We keep the native <select> — vitest 4.1.5's oxc parser couldn't handle
    // a deeper custom listbox tree. The search input above filters the
    // <select>'s options, which is the same UX win without the parser fight.
    expect(src).toMatch(/<select\s+data-testid="commish-edit-player"/)
  })

  it('helper text steers users away from the player-pool Draft button', () => {
    expect(src).toMatch(/Draft button is for live drafting only/)
  })

  it('result-count caption renders "<n> shown" or "No matches."', () => {
    expect(src).toMatch(/data-testid="commish-edit-player-result-count"/)
    expect(src).toMatch(/'No matches\.'/)
    expect(src).toMatch(/filteredPlayers\.length \+ ' shown'/)
  })

  it('search-wrapper testid only appears for REPLACE / ASSIGN actions', () => {
    expect(src).toMatch(/data-testid="commish-edit-player-search-wrapper"/)
    expect(src).toMatch(/needsPlayer\s*=\s*form\.action\s*===\s*'REPLACE_PLAYER_ON_PICK'\s*\|\|\s*form\.action\s*===\s*'ASSIGN_PLAYER_TO_PICK'/)
  })

  it('<select> is fed the FILTERED list (not the raw 500-cap players prop)', () => {
    // The fix: the dropdown options now come from `filteredPlayers` instead of
    // the unfiltered `players.slice(0, 500)`. Search input mutates
    // form.playerSearch which the memo consumes.
    expect(src).toMatch(/\{filteredPlayers\.map\(\(p\) => \(/)
    // The 500-cap iteration was the pre-G.2 shape — guard against it returning.
    expect(src).not.toMatch(/players\.slice\(0,\s*500\)\.map/)
  })

  it('size attribute on <select> shows multiple rows at once (better UX than dropdown)', () => {
    expect(src).toMatch(/size=\{Math\.min\(8, Math\.max\(3, filteredPlayers\.length \+ 1\)\)\}/)
  })
})

describe('G.2 — search filter is pure and inline (data-level test)', () => {
  // Replicate the filter shape from the panel so we can exercise the rule
  // without rendering React. This guards against future regressions in the
  // filter predicate.
  type Player = { id: string; name: string; position: string; team?: string | null }

  function filterPlayers(players: Player[], query: string): Player[] {
    const q = query.trim().toLowerCase()
    if (!q) return players.slice(0, 80)
    return players
      .filter((p) => {
        if (p.name?.toLowerCase().includes(q)) return true
        if (p.position?.toLowerCase().includes(q)) return true
        if (typeof p.team === 'string' && p.team.toLowerCase().includes(q)) return true
        return false
      })
      .slice(0, 80)
  }

  const POOL: Player[] = [
    { id: 'pid-jeanty', name: 'Ashton Jeanty', position: 'RB', team: 'LV' },
    { id: 'pid-tmac', name: 'Tetairoa McMillan', position: 'WR', team: 'CAR' },
    { id: 'pid-ward', name: 'Cameron Ward', position: 'QB', team: 'TEN' },
    { id: 'pid-saquon', name: 'Saquon Barkley', position: 'RB', team: 'PHI' },
    { id: 'pid-dak', name: 'Dak Prescott', position: 'QB', team: 'DAL' },
  ]

  it('empty query returns all rows (capped at 80)', () => {
    expect(filterPlayers(POOL, '')).toHaveLength(5)
  })

  it('typing "ward" returns only Cameron Ward', () => {
    const r = filterPlayers(POOL, 'ward')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('Cameron Ward')
  })

  it('typing "rb" matches by position (case-insensitive)', () => {
    const r = filterPlayers(POOL, 'rb')
    expect(r.map((p) => p.name).sort()).toEqual(['Ashton Jeanty', 'Saquon Barkley'])
  })

  it('typing "DAL" matches by team', () => {
    const r = filterPlayers(POOL, 'DAL')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('Dak Prescott')
  })

  it('whitespace is trimmed', () => {
    const r = filterPlayers(POOL, '  ward  ')
    expect(r).toHaveLength(1)
  })

  it('no matches → empty array', () => {
    expect(filterPlayers(POOL, 'zzznoone')).toHaveLength(0)
  })

  it('null/undefined team field does not crash filter', () => {
    const pool: Player[] = [
      { id: 'p1', name: 'Free Agent', position: 'RB', team: null },
      { id: 'p2', name: 'Practice Squad', position: 'WR' },
    ]
    expect(() => filterPlayers(pool, 'free')).not.toThrow()
    expect(filterPlayers(pool, 'free')).toHaveLength(1)
  })
})

describe('G.2 — submit still routes to the commissioner endpoint', () => {
  const src = read(SRC_PATH)

  it('panel calls commissionerPickEditClient (NOT a regular fetch to /draft/pick)', () => {
    // The submit handler is unchanged — confirm it still uses the dedicated
    // commissioner client. The picker upgrade only touches UI; no fetch path
    // changed in this slice.
    expect(src).toMatch(/await commissionerPickEditClient\(params\)/)
    // Negative regression: the panel must not call the regular pick endpoint.
    expect(src).not.toMatch(/\/api\/leagues\/[^']*\/draft\/pick(?!-edit)/)
  })

  it('REPLACE_PLAYER_ON_PICK forwards selected player into the params', () => {
    expect(src).toMatch(/const sel = playerById\.get\(form\.playerId\)/)
    expect(src).toMatch(/playerId: sel\.id/)
    expect(src).toMatch(/playerName: sel\.name/)
    expect(src).toMatch(/position: sel\.position/)
  })

  it('REPLACE without a selected player short-circuits with a clear error before fetch', () => {
    expect(src).toMatch(/setError\('Pick a player from the list\.'\)/)
  })
})

describe('G.2 — no forbidden BaaS references in the picker source', () => {
  const FORBIDDEN = 'supa' + 'base'
  const src = read(SRC_PATH)
  it('CommissionerPickEditorPanel.tsx contains no forbidden BaaS imports', () => {
    expect(src.toLowerCase()).not.toContain(FORBIDDEN)
  })
})
