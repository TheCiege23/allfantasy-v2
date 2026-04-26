import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Slice D.1.5 Path B — verify the panel-level PROJ/RUSHING/RECEIVING/PASSING column
 * header is NOT rendered in the card-mode player pool (PlayerPanel). It's still rendered
 * in PlayerDetailModal where a fixed-width grid below it actually aligns to the columns.
 *
 * This is a static-source assertion (cheap, deterministic) rather than a render-mounted
 * test because PlayerPanel pulls in heavy server-aware dependencies and the goal is to
 * lock in the structural decision until D.2 ships the real Sleeper-style table mode.
 */

const root = resolve(__dirname, '..', '..')

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Slice D.1.5 Path B — card-mode player pool header', () => {
  it('PlayerPanel.tsx does NOT import NflDraftPoolStatsGroupHeader (no panel-level header in card mode)', () => {
    const src = read('components/app/draft-room/PlayerPanel.tsx')
    // The component must not be referenced as a JSX render in this file. The import line
    // was removed; a comment placeholder marks where it'll come back when D.2 ships.
    expect(src).not.toMatch(/^import\s+\{\s*NflDraftPoolStatsGroupHeader\b/m)
    expect(src).not.toMatch(/<NflDraftPoolStatsGroupHeader\s*\/>/)
  })

  it('PlayerPanel.tsx leaves a TODO/comment about D.2 so the change is intentional', () => {
    const src = read('components/app/draft-room/PlayerPanel.tsx')
    expect(src).toMatch(/D\.2/)
    expect(src).toMatch(/Sleeper/i)
  })

  it('NflDraftPoolStatsGroupHeader still exists for use by PlayerDetailModal', () => {
    const src = read('components/app/draft-room/NflDraftPoolStatsStrip.tsx')
    expect(src).toMatch(/export function NflDraftPoolStatsGroupHeader\b/)
  })

  it('PlayerDetailModal still renders the header (its grid below it actually aligns)', () => {
    const src = read('components/app/draft-room/PlayerDetailModal.tsx')
    expect(src).toMatch(/<NflDraftPoolStatsGroupHeader\s*\/>/)
  })

  it('Per-row dash placeholder still ships in NflDraftPoolStatsRow when splits are all-zero', () => {
    const src = read('components/app/draft-room/NflDraftPoolStatsStrip.tsx')
    // The all-zero detector + the 13-cell dash render branch must both be present.
    expect(src).toMatch(/isAllZeroSplits/)
    expect(src).toMatch(/data-testid="nfl-draft-pool-stats-row-empty"/)
    expect(src).toMatch(/length:\s*13/)
  })
})
