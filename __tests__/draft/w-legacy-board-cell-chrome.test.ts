/**
 * Commit W.3 — legacy mock-draft board cell chrome upgrade.
 *
 * The legacy `app/draft/components/DraftBoard.tsx` + `PickCell.tsx`
 * (mounted only by `/draft/mock/{draftId}` via `DraftRoom` →
 * `DraftShell`) rendered cells flat: a small monospaced pickLabel
 * floating in the top-left, "OPEN" or "Player Name" beneath, and a
 * cyan ring on the on-the-clock cell. From the user-reported
 * screenshot this read as a test harness, not a Sleeper-style draft
 * board.
 *
 * W.3 upgrades the cell chrome:
 *   1. Pick-number badge (rounded pill with ring) replaces the bare
 *      mono text — easy to scan down a column.
 *   2. Manager color stripe along the left edge of filled picks — a
 *      Sleeper-style "team color" cue.
 *   3. Open picks now use a dashed border ("slot ready" cue) rather
 *      than a faint solid border that blended into the grid.
 *   4. On-the-clock cells keep their cyan ring + pulse and ALSO
 *      surface an "ON THE CLOCK" tag + "Pick R.PP" hint, so the
 *      current cell is unambiguous even with the pulse animation off.
 *   5. Filled cells now show position as a chip-style pill + team
 *      abbreviation as bold text.
 *   6. Stable testids land on every meaningful sub-element so e2e /
 *      component tests can target each surface deterministically.
 *
 * Static-source assertions only — does not exercise React render.
 *
 * What did NOT change:
 *   - Snake-order / round-direction calculation
 *     (`overallForManagerColumn`) is preserved.
 *   - The DraftBoard layout (sticky manager header, round numbering
 *     column, per-round flex row) is unchanged.
 *   - Mechanics: no draft authority / submitPick / pick-write code
 *     touched.
 *   - The new snake redraft route
 *     (`components/app/draft-room/DraftBoard.tsx` and friends) is
 *     completely untouched.
 *   - W.1 i18n leak fix and W.2 PlayerPool layout still in place.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Legacy DraftBoard — outer container test id', () => {
  const src = read('app/draft/components/DraftBoard.tsx')

  it('outer board container carries data-testid="legacy-draft-board"', () => {
    expect(src).toMatch(/data-testid="legacy-draft-board"/)
  })

  it('snake-order helper is preserved (round-direction calculation unchanged)', () => {
    expect(src).toMatch(
      /function overallForManagerColumn\(round: number, managerCol: number, numTeams: number\): number \{[\s\S]+?if \(round % 2 === 1\) return \(round - 1\) \* numTeams \+ \(managerCol \+ 1\)/,
    )
  })

  it('still passes pick / managerIndex / isCurrentPick / isTraded into PickCell', () => {
    expect(src).toMatch(
      /<PickCell[\s\S]+?pickLabel=\{pickLabel\}[\s\S]+?pick=\{pick\}[\s\S]+?managerIndex=\{mi\}[\s\S]+?isCurrentPick=\{overall === currentOverall && !pick\?\.playerName\}/,
    )
  })
})

describe('Legacy PickCell — chrome upgrade contract', () => {
  const src = read('app/draft/components/PickCell.tsx')

  it('cell wrapper carries the canonical data-testid + state attributes', () => {
    expect(src).toMatch(/data-testid="legacy-draft-board-cell"/)
    expect(src).toMatch(
      /data-state=\{isPicked \? 'filled' : isCurrentPick \? 'current' : 'open'\}/,
    )
    expect(src).toMatch(/data-current=\{isCurrentPick \? 'true' : 'false'\}/)
    expect(src).toMatch(/data-manager-index=\{managerIndex\}/)
  })

  it('open cells use dashed border (Sleeper-style empty-slot cue, NOT a flat solid)', () => {
    expect(src).toMatch(
      /!isPicked && !isCurrentPick &&\s*'border border-dashed border-white\/\[0\.10\]/,
    )
  })

  it('on-the-clock cells keep cyan ring + pulse PLUS an explicit ON THE CLOCK tag', () => {
    // Existing cyan ring / pulse / glow still present
    expect(src).toMatch(
      /isCurrentPick &&\s*'animate-pulse border-cyan-400\/40 bg-cyan-500\/\[0\.07\] ring-2 ring-cyan-400\/60/,
    )
    // New explicit on-the-clock label
    expect(src).toMatch(/data-testid="legacy-draft-board-on-the-clock-label"/)
    expect(src).toMatch(/On the clock/)
  })

  it('filled cells render a manager color stripe along the left edge', () => {
    expect(src).toMatch(/data-testid="legacy-draft-board-cell-stripe"/)
    expect(src).toMatch(
      /\{isPicked && !isCurrentPick \?[\s\S]+?absolute inset-y-0 left-0 w-1 rounded-l-xl/,
    )
  })

  it('pick-number badge has the canonical testid and pill styling', () => {
    expect(src).toMatch(/data-testid="legacy-draft-board-pick-number"/)
    expect(src).toMatch(
      /inline-flex items-center rounded-md bg-black\/30 px-1\.5 py-0\.5 font-mono/,
    )
  })

  it('open-label testid renders for open AND on-the-clock (the latter shows "Pick R.PP")', () => {
    // Two different occurrences of legacy-draft-board-open-label —
    // one inside the on-the-clock branch (with "Pick {pickLabel}") and
    // one in the plain-open branch (with "Open").
    const matches = src.match(/data-testid="legacy-draft-board-open-label"/g) ?? []
    expect(matches.length).toBe(2)
  })

  it('filled cells expose stable testids for player name and meta line', () => {
    expect(src).toMatch(/data-testid="legacy-draft-board-player-name"/)
    expect(src).toMatch(/data-testid="legacy-draft-board-player-meta"/)
  })

  it('filled cells render position as a chip-style pill (not bare text)', () => {
    expect(src).toMatch(
      /\{pick!\.position \?[\s\S]+?rounded bg-black\/30[\s\S]+?\{pick!\.position\}/,
    )
  })

  it('TradedPickBadge still renders when isTraded', () => {
    expect(src).toMatch(/\{isTraded \? <TradedPickBadge \/> : null\}/)
  })

  it('manager color helper still drives filled-cell coloring', () => {
    expect(src).toMatch(/import \{ managerColorForIndex \} from '\.\/manager-colors'/)
    expect(src).toMatch(/const mgr = managerColorForIndex\(managerIndex\)/)
    expect(src).toMatch(/isPicked && mgr\.bg/)
  })
})

describe('No mechanics changes (W.3 is visual-only)', () => {
  const src = read('app/draft/components/PickCell.tsx')

  it('PickCell does not import submitPick / execute-pick', () => {
    expect(src).not.toMatch(/PickSubmissionService/)
    expect(src).not.toMatch(/execute-pick/)
  })

  it('DraftBoard does not import submitPick / execute-pick', () => {
    const board = read('app/draft/components/DraftBoard.tsx')
    expect(board).not.toMatch(/PickSubmissionService/)
    expect(board).not.toMatch(/execute-pick/)
  })
})

describe('New snake redraft route is untouched (W.3 is legacy-only)', () => {
  it('components/app/draft-room/DraftBoard.tsx still has the Commit V testids', () => {
    const newBoard = read('components/app/draft-room/DraftBoard.tsx')
    expect(newBoard).toMatch(/data-testid="draft-board"/)
    expect(newBoard).toMatch(/data-testid="draft-board-grid"/)
  })

  it('components/app/draft-room/DraftRoomPageClient.tsx still has the Commit J 409 handler', () => {
    const drpc = read('components/app/draft-room/DraftRoomPageClient.tsx')
    expect(drpc).toMatch(
      /res\.status === 409 && \(data as \{ code\?: unknown \}\)\?\.code === 'DRAFT_SESSION_MISMATCH'/,
    )
  })
})

describe('W.1 + W.2 fixes still in place', () => {
  it('W.1 — DraftShell tab strip resolver still uses the resilient label fallback', () => {
    const src = read('app/draft/components/DraftShell.tsx')
    expect(src).toMatch(
      /typeof translated === 'string' && translated && translated !== tab\.i18nKey/,
    )
  })

  it('W.1 — translation source still defines the legacy tab keys', () => {
    const en = read('lib/i18n/translations.ts')
    expect(en).toMatch(/"draftRoom\.legacy\.queueTab":\s*"Queue"/)
  })

  it('W.2 — legacy PlayerPool position-filter row still uses overflow-x-auto + no-wrap', () => {
    const pp = read('app/draft/components/PlayerPool.tsx')
    expect(pp).toMatch(/data-testid="legacy-draft-pool-position-filter-bar"/)
    const posBarMatch = pp.match(
      /className="([^"]+)"\s*\n\s*data-testid="legacy-draft-pool-position-filter-bar"/,
    )
    expect(posBarMatch).not.toBeNull()
    expect(posBarMatch![1]).toMatch(/overflow-x-auto/)
    expect(posBarMatch![1]).toMatch(/whitespace-nowrap/)
  })

  it('W.2 — legacy PlayerPool empty state + clear-filters CTA still present', () => {
    const pp = read('app/draft/components/PlayerPool.tsx')
    expect(pp).toMatch(/data-testid="legacy-draft-pool-empty-state"/)
    expect(pp).toMatch(/data-testid="legacy-draft-pool-clear-filters"/)
  })
})
