import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * D.6.1 — right dock collapses Queue/Roster/Chat into a single tabbed panel,
 * and the player-pool toolbar gets the position-pill redesign + duplicate
 * AI ADP control removed. Static-source assertions (Vitest can't render the
 * full DraftRoomPageClient under jsdom because of provider stack depth).
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('D.6.1 — DraftRightDockTabs component', () => {
  const src = read('components/app/draft-room/DraftRightDockTabs.tsx')

  it('renders all three tabs (queue / roster / chat)', () => {
    expect(src).toMatch(/id: 'queue', label: 'Queue'/)
    expect(src).toMatch(/id: 'roster', label: 'Roster'/)
    expect(src).toMatch(/id: 'chat', label: 'Chat'/)
    // The button uses `${testIdBase}-tab-${tab.id}` as its testid template.
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-tab-\$\{tab\.id\}`\}/)
  })

  it('uses ARIA tablist + tabpanel + role="tab" for screen readers', () => {
    expect(src).toMatch(/role="tablist"/)
    expect(src).toMatch(/role="tab"/)
    expect(src).toMatch(/role="tabpanel"/)
    expect(src).toMatch(/aria-selected=\{isActive\}/)
    expect(src).toMatch(/aria-controls=\{`\$\{testIdBase\}-panel-\$\{tab\.id\}`\}/)
  })

  it('keeps all three panels mounted; only the active one is visible (display:none on inactive)', () => {
    // Inactive panels use the `hidden` Tailwind class (display:none) — preserves React state.
    expect(src).toMatch(/effectiveTab === 'queue' \? 'flex h-full[\s\S]*?' : 'hidden'/)
    expect(src).toMatch(/effectiveTab === 'roster' \? 'flex h-full[\s\S]*?' : 'hidden'/)
    expect(src).toMatch(/effectiveTab === 'chat' \? 'flex h-full[\s\S]*?' : 'hidden'/)
  })

  it('default tab is queue', () => {
    expect(src).toMatch(/defaultTab = 'queue'/)
  })

  it('persists active tab across reloads via localStorage', () => {
    expect(src).toMatch(/TAB_PREF_KEY = 'af:draft-right-dock-active-tab'/)
    expect(src).toMatch(/window\.localStorage\.getItem\(TAB_PREF_KEY\)/)
    expect(src).toMatch(/window\.localStorage\.setItem\(TAB_PREF_KEY, activeTab\)/)
  })

  it('exposes a queueCount badge so users see queue length without clicking the tab', () => {
    expect(src).toMatch(/queueCount\?: number/)
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-queue-count`\}/)
  })

  it('active tab gets a cyan→violet underline (non-color a11y cue beyond text color)', () => {
    expect(src).toMatch(/from-cyan-400/)
    expect(src).toMatch(/to-violet-400/)
  })

  it('exposes data-active-tab on the section root for QA / e2e selectors', () => {
    expect(src).toMatch(/data-active-tab=\{effectiveTab\}/)
  })

  it('does NOT include a War Room tab — popup stays separate', () => {
    expect(src).not.toMatch(/war[\s-]*room/i)
  })
})

describe('D.6.1 — DraftRoomPageClient wires the tabbed dock (replaces 3-col)', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('imports DraftRightDockTabs', () => {
    expect(src).toMatch(/import \{ DraftRightDockTabs \} from '@\/components\/app\/draft-room\/DraftRightDockTabs'/)
  })

  it('renders the tabbed dock at xl+ widths', () => {
    expect(src).toMatch(/data-testid="draft-right-dock"/)
    expect(src).toMatch(/<DraftRightDockTabs/)
  })

  it('feeds the same nodes (queueStackNode / chatPanelNode / ResultsRosterPanel) into the tab bodies', () => {
    expect(src).toMatch(/queueBody=\{<div[\s\S]*?\{queueStackNode\}<\/div>\}/)
    expect(src).toMatch(/rosterBody=\{[\s\S]*?<ResultsRosterPanel/)
    expect(src).toMatch(/chatBody=\{<div[\s\S]*?\{chatPanelNode\}<\/div>\}/)
  })

  it('the legacy 3-column side-by-side layout is GONE (no more three sibling panels with separate testids)', () => {
    expect(src).not.toMatch(/data-testid="draft-bottom-dock-queue"/)
    expect(src).not.toMatch(/data-testid="draft-bottom-dock-results"/)
    expect(src).not.toMatch(/data-testid="draft-bottom-dock-chat"/)
  })

  it('the player pool keeps its dedicated dock testid (left column)', () => {
    expect(src).toMatch(/data-testid="draft-bottom-dock-pool"/)
  })

  it('passes queue length so the tab can show a badge without unmounting QueuePanel', () => {
    expect(src).toMatch(/queueCount=\{draftIntel\?\.queue\?\.length \?\? 0\}/)
  })

  it('default tab on the dock is queue (matches user spec)', () => {
    expect(src).toMatch(/defaultTab="queue"/)
  })

  it('War Room popup is still rendered as a SIBLING (not a tab inside the dock)', () => {
    expect(src).toMatch(/<WarRoomPopup hasNewIntel=\{warRoomHasNewIntel\}/)
    // The popup must NOT live inside DraftRightDockTabs — assert by ordering.
    const dockIdx = src.indexOf('<DraftRightDockTabs')
    const popupIdx = src.indexOf('<WarRoomPopup')
    expect(popupIdx).toBeGreaterThan(dockIdx)
  })
})

describe('D.6.1 — Player pool filter bar redesign', () => {
  const src = read('components/app/draft-room/PlayerPanel.tsx')

  it('removes the duplicate AI ADP morph on the ADP sort button (always says "ADP")', () => {
    // The morph was: `{useAiAdp ? 'AI ADP' : 'ADP'}` on the draft-sort-adp button.
    // After D.6.1 the dynamic ternary is gone — that button always renders ADP.
    expect(src).not.toMatch(/data-testid="draft-sort-adp"[\s\S]{0,400}\{useAiAdp \? 'AI ADP' : 'ADP'\}/)
  })

  it('toolbar sort buttons removed — column-header sort is the canonical UI (G.1 #1)', () => {
    // G.1 — the four toolbar sort buttons (ADP / AI ADP / Proj / Name)
    // were removed because they duplicated the SleeperPoolTable column-header
    // sort. The "Use AI ADP" toggle, AI-ADP warnings, and "My roster" toggle
    // remain in the row above the table.
    expect(src).not.toMatch(/data-testid="draft-sort-ai-adp"/)
    expect(src).not.toMatch(/data-testid="draft-sort-adp"/)
    expect(src).not.toMatch(/data-testid="draft-sort-projected"/)
    expect(src).not.toMatch(/data-testid="draft-sort-name"/)
    // The single AI-ADP usage check still applies — only the "Use AI ADP"
    // toggle label and the active-state badge remain.
    expect(src).toMatch(/Use AI ADP/)
  })

  it('renders position pills with `<drafted>/<available>` counts (no <select>)', () => {
    expect(src).toMatch(/positionPillCounts = useMemo\(/)
    expect(src).toMatch(/role="radiogroup"/)
    expect(src).toMatch(/data-testid=\{`draft-position-pill-\$/)
    // The legacy <select> for position has been replaced — no `<option key=` next to the position filter.
    expect(src).not.toMatch(/aria-label="Position filter"\s*\n\s*data-testid="draft-position-filter"\s*\n\s*>\s*\{positionOptions\.map/)
  })

  it('counts split into drafted (from currentRoster) + available (undrafted pool)', () => {
    expect(src).toMatch(/draftedByPos\[/)
    expect(src).toMatch(/!isPlayerDraftedEntry\(p, draftedNames, draftedPlayerIds\)/)
  })

  it('FLEX pill includes RB/WR/TE candidates; IDP FLEX includes DL/LB/DB', () => {
    expect(src).toMatch(/'FLEX'\) return pos === 'RB' \|\| pos === 'WR' \|\| pos === 'TE'/)
    expect(src).toMatch(/'IDP FLEX'\) return pos === 'DL' \|\| pos === 'LB' \|\| pos === 'DB'/)
  })

  it('Rookies Only toggle is always visible (no Devy/C2C gate)', () => {
    // Before D.6.1: `{devyConfig?.enabled || c2cConfig?.enabled ? <Rookies button> : null}`
    // After D.6.1: the button renders unconditionally inside the toolbar.
    expect(src).toMatch(/data-testid="draft-filter-rookies-only"/)
    // The gate string is gone — no `devyConfig?.enabled || c2cConfig?.enabled \?` wrapping
    // the rookies button.
    expect(src).not.toMatch(/\{devyConfig\?\.enabled \|\| c2cConfig\?\.enabled \? \(\s*<button[\s\S]{0,200}draft-filter-rookies-only/)
  })

  it('Watchlist + Hide drafted + Rookies Only toggles all coexist on the right side of the toolbar', () => {
    expect(src).toMatch(/data-testid="draft-filter-watchlist"|onClick=\{\(\) => setWatchlistOnly/)
    expect(src).toMatch(/onClick=\{\(\) => setHideDrafted/)
    expect(src).toMatch(/onClick=\{\(\) => setRookiesOnly/)
  })

  it('search pill stays as a flex-1 input (not behind a select)', () => {
    expect(src).toMatch(/data-testid="draft-player-search-input"/)
  })
})

describe('D.6.1 — package wiring sanity', () => {
  it('DraftRightDockTabs exists at the expected path', () => {
    const src = read('components/app/draft-room/DraftRightDockTabs.tsx')
    expect(src.length).toBeGreaterThan(500)
  })

  it('does not introduce Supabase imports', () => {
    const dock = read('components/app/draft-room/DraftRightDockTabs.tsx')
    const panel = read('components/app/draft-room/PlayerPanel.tsx')
    expect(dock).not.toMatch(/supabase|@supabase/)
    expect(panel).not.toMatch(/from\s*['"](?:@|\.).*supabase/i)
  })
})
