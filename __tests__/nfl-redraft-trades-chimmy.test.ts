/**
 * NFL redraft league dashboard — TradesTab Chimmy hooks lock (Commit D).
 *
 * Mirrors the TeamTab (roster) and PlayersTab (waivers) Chimmy entry points
 * from earlier slices. TradesTab gets a tab-level "AI trade analysis" button
 * gated on `isNflRedraftCoreDashboardFromUserLeague` so non-NFL-redraft
 * variants (dynasty, keeper, survivor, zombie, big_brother, idp, best ball,
 * guillotine, NCAAF, NBA, MLB, NHL, soccer, PGA) keep their existing trade
 * UX unchanged.
 *
 * Static-source assertions only — JSDOM-rendering TradesTab would require the
 * full trade-block + history fetch tree, which is out of scope for the
 * regression lock. Browser-level coverage is implicit through the tab-bar
 * navigation in `e2e/nfl-redraft-league-dashboard-player-media.spec.ts`,
 * which cycles through Trades and asserts the dashboard does not crash.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('NFL redraft core — TradesTab Chimmy entry point', () => {
  const src = read('app/league/[leagueId]/tabs/TradesTab.tsx')

  it('imports openChimmyWithPrompt from the shared dashboard helper', () => {
    expect(src).toMatch(
      /import \{ openChimmyWithPrompt \} from '@\/lib\/dashboard\/open-chimmy-with-prompt'/,
    )
  })

  it('imports the NFL redraft gate from the canonical lib path', () => {
    expect(src).toMatch(
      /import \{ isNflRedraftCoreDashboardFromUserLeague \} from '@\/lib\/league\/is-nfl-redraft-core-dashboard'/,
    )
  })

  it('computes nflRedraftTradesShell from the gate at render time', () => {
    expect(src).toMatch(/const nflRedraftTradesShell = isNflRedraftCoreDashboardFromUserLeague\(league\)/)
  })

  it('renders the AI trade analysis button only when nflRedraftTradesShell is true', () => {
    // The button lives inside a `{nflRedraftTradesShell ? (... ) : null}`
    // gate, identical to the TeamTab Chimmy gating shape, so other variants
    // never see it.
    expect(src).toMatch(/\{nflRedraftTradesShell \? \([\s\S]*?data-testid="trades-tab-chimmy-analyze"[\s\S]*?\) : null\}/)
  })

  it('button has the canonical testid for QA + e2e', () => {
    expect(src).toMatch(/data-testid="trades-tab-chimmy-analyze"/)
  })

  it("calls openChimmyWithPrompt with source: 'trade' (matches the ChimmyPromptSource union)", () => {
    expect(src).toMatch(/source:\s*'trade'/)
    expect(src).toMatch(/openChimmyWithPrompt\(\{[\s\S]*?source:\s*'trade'/)
  })

  it('forwards leagueId so Chimmy receives league context for the trade analysis', () => {
    expect(src).toMatch(/openChimmyWithPrompt\(\{[\s\S]*?leagueId:\s*league\.id/)
  })

  it('does not introduce a new modal or settings entry — the Chimmy left chat is the entry point', () => {
    // The TradesTab Chimmy hook is a single button. Phase 1 explicitly does
    // NOT add a per-trade modal or a settings deep link; the button focuses
    // the left Chimmy chat with a context-specific prompt.
    expect(src).not.toMatch(/import \{[^}]*CommissionerSettingsModal[^}]*\}/)
    expect(src).not.toMatch(/openLeagueSettingsModal\(/)
  })

  it('does not regress trade UI surfaces that already worked (block + history sections remain present)', () => {
    // Belt-and-suspenders: tab-level buttons should not displace the active
    // trades / trade block / history sections. The propose-trade testid is
    // a stable marker for the rest of the tab body; if it disappears, the
    // Chimmy wiring inadvertently nuked the existing UI.
    expect(src).toMatch(/data-testid="trades-tab-propose-trade"/)
  })
})

describe('NFL redraft core — TeamTab + PlayersTab Chimmy hooks remain intact', () => {
  // Regression guard for Commit D — verifying the surfaces this commit does
  // NOT touch. If a future refactor moves the Chimmy plumbing, both tabs and
  // TradesTab should be updated together.
  const teamTabSrc = read('app/league/[leagueId]/tabs/TeamTab.tsx')
  const playersTabSrc = read('app/league/[leagueId]/tabs/PlayersTab.tsx')

  it('TeamTab still imports openChimmyWithPrompt (roster source)', () => {
    expect(teamTabSrc).toMatch(
      /import \{ openChimmyWithPrompt \} from '@\/lib\/dashboard\/open-chimmy-with-prompt'/,
    )
    expect(teamTabSrc).toMatch(/source:\s*'roster'/)
  })

  it('PlayersTab still imports openChimmyWithPrompt (waivers source)', () => {
    expect(playersTabSrc).toMatch(
      /import \{ openChimmyWithPrompt \} from '@\/lib\/dashboard\/open-chimmy-with-prompt'/,
    )
    expect(playersTabSrc).toMatch(/source:\s*'waivers'/)
  })

  it('TeamTab still uses the shared PlayerHeadshot (Commit C lock)', () => {
    expect(teamTabSrc).toMatch(
      /import \{ PlayerHeadshot \} from '@\/components\/league\/PlayerHeadshot'/,
    )
  })

  it('PlayersTab still uses the shared PlayerHeadshot (Commit C lock)', () => {
    expect(playersTabSrc).toMatch(
      /import \{ PlayerHeadshot \} from '@\/components\/league\/PlayerHeadshot'/,
    )
  })
})
