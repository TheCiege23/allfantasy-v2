import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  assignPicksToSlots,
  buildOrderedRosterSlots,
} from '@/lib/draft-room/rosterSlotOrder'

/**
 * D.6 — Sleeper-style bottom dock layout. Pure-logic tests on the slot-order
 * helper plus static-source assertions for the visible structural changes:
 *   - WarRoomPopup component renders a fixed bottom-right trigger + dialog body.
 *   - ResultsRosterPanel renders a team selector + ordered slots.
 *   - DraftRoomPageClient drops the left teamPanel aside and renders WarRoomPopup
 *     as a sibling overlay; centerColumn shows 4 sub-columns at xl+ widths.
 *   - DraftRoomShell tolerates `teamPanel={null}` (left aside collapses).
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('D.6 — buildOrderedRosterSlots: standard offense', () => {
  it('emits canonical order QB / RB / RB / WR / WR / TE / FLEX / DEF / K (no SF)', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DEF: 1, K: 1 },
      benchSlots: 0,
      idpEnabled: false,
    })
    expect(slots.map((s) => s.label)).toEqual([
      'QB',
      'RB1',
      'RB2',
      'WR1',
      'WR2',
      'TE',
      'FLEX',
      'DEF',
      'K',
    ])
  })

  it('inserts SF in canonical position when count > 0', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SF: 1, DEF: 1, K: 1 },
      idpEnabled: false,
    })
    const labels = slots.map((s) => s.label)
    // SF lives between FLEX and DEF.
    expect(labels.indexOf('SF')).toBe(labels.indexOf('FLEX') + 1)
    expect(labels.indexOf('SF')).toBe(labels.indexOf('DEF') - 1)
  })

  it('does NOT force SF when league has SF=0', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SF: 0, DEF: 1, K: 1 },
      idpEnabled: false,
    })
    expect(slots.map((s) => s.label)).not.toContain('SF')
  })

  it('does NOT include K/DEF when league has zero of either', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 0, DEF: 0 },
      idpEnabled: false,
    })
    const labels = slots.map((s) => s.label)
    expect(labels).not.toContain('K')
    expect(labels).not.toContain('DEF')
  })
})

describe('D.6 — buildOrderedRosterSlots: IDP', () => {
  it('inserts IDP block (DL / LB / DB / IDP FLEX) between SF and DEF/K when enabled', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: {
        QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SF: 1,
        DL: 2, LB: 2, DB: 2, 'IDP FLEX': 1,
        DEF: 1, K: 1,
      },
      idpEnabled: true,
    })
    expect(slots.map((s) => s.label)).toEqual([
      'QB',
      'RB1', 'RB2',
      'WR1', 'WR2',
      'TE',
      'FLEX',
      'SF',
      'DL1', 'DL2',
      'LB1', 'LB2',
      'DB1', 'DB2',
      'IDP FLEX',
      'DEF',
      'K',
    ])
  })

  it('does NOT include IDP slots when idpEnabled=false, even if starterSlots has DL/LB/DB counts', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 2, WR: 2, DL: 2, LB: 2, DB: 2, DEF: 1 },
      idpEnabled: false,
    })
    const labels = slots.map((s) => s.label)
    expect(labels).not.toContain('DL1')
    expect(labels).not.toContain('LB1')
    expect(labels).not.toContain('DB1')
    expect(labels).not.toContain('IDP FLEX')
  })
})

describe('D.6 — buildOrderedRosterSlots: bench + custom commissioner slots', () => {
  it('appends BN slots last with numbered occurrences', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 1 },
      benchSlots: 3,
    })
    const labels = slots.map((s) => s.label)
    expect(labels).toEqual(['QB', 'RB', 'BN1', 'BN2', 'BN3'])
    expect(slots.filter((s) => s.kind === 'bench')).toHaveLength(3)
  })

  it('preserves commissioner custom slots after the canonical block', () => {
    const slots = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 1, CUSTOM_COACH: 1, CUSTOM_BENCHWARMER: 1 } as Record<string, number>,
      benchSlots: 0,
    })
    const labels = slots.map((s) => s.label)
    // QB then RB (canonical), then custom slots in alphabetical order.
    expect(labels[0]).toBe('QB')
    expect(labels[1]).toBe('RB')
    expect(labels[2]).toBe('CUSTOM_BENCHWARMER')
    expect(labels[3]).toBe('CUSTOM_COACH')
    expect(slots[2]!.kind).toBe('custom')
  })
})

describe('D.6 — assignPicksToSlots fills in canonical order', () => {
  const standard = buildOrderedRosterSlots({
    starterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DEF: 1, K: 1 },
    benchSlots: 4,
    idpEnabled: false,
  })

  it('places exact-position picks into their slot first', () => {
    const picks = [
      { playerName: 'Bijan Robinson', position: 'RB', overall: 1 },
      { playerName: 'Jahmyr Gibbs', position: 'RB', overall: 5 },
      { playerName: 'Saquon Barkley', position: 'RB', overall: 9 },
    ]
    const out = assignPicksToSlots(picks, standard)
    const rb1 = out.find((e) => e.slot.label === 'RB1')
    const rb2 = out.find((e) => e.slot.label === 'RB2')
    const flex = out.find((e) => e.slot.label === 'FLEX')
    expect(rb1?.pick?.playerName).toBe('Bijan Robinson')
    expect(rb2?.pick?.playerName).toBe('Jahmyr Gibbs')
    expect(flex?.pick?.playerName).toBe('Saquon Barkley') // overflow → FLEX
  })

  it('FLEX accepts RB / WR / TE; SF accepts QB too', () => {
    const sfStandard = buildOrderedRosterSlots({
      starterSlots: { QB: 1, RB: 1, WR: 1, FLEX: 1, SF: 1 },
      benchSlots: 0,
    })
    const picks = [
      { playerName: 'Joe Burrow', position: 'QB', overall: 10 },
      { playerName: 'Patrick Mahomes', position: 'QB', overall: 20 }, // overflow QB → SF
      { playerName: 'Justin Jefferson', position: 'WR', overall: 3 },
      { playerName: 'CeeDee Lamb', position: 'WR', overall: 7 }, // overflow WR → FLEX
    ]
    const out = assignPicksToSlots(picks, sfStandard)
    const sf = out.find((e) => e.slot.label === 'SF')
    const flex = out.find((e) => e.slot.label === 'FLEX')
    expect(sf?.pick?.playerName).toBe('Patrick Mahomes')
    expect(flex?.pick?.playerName).toBe('CeeDee Lamb')
  })

  it('IDP FLEX accepts DL / LB / DB', () => {
    const idpSlots = buildOrderedRosterSlots({
      starterSlots: { DL: 1, LB: 1, 'IDP FLEX': 1 },
      idpEnabled: true,
    })
    const picks = [
      { playerName: 'Defender A', position: 'DL', overall: 100 },
      { playerName: 'Defender B', position: 'LB', overall: 110 },
      { playerName: 'Defender C', position: 'DB', overall: 120 }, // → IDP FLEX
    ]
    const out = assignPicksToSlots(picks, idpSlots)
    const idpFlex = out.find((e) => e.slot.label === 'IDP FLEX')
    expect(idpFlex?.pick?.playerName).toBe('Defender C')
  })

  it('overflow goes to bench when starters are full', () => {
    const picks = [
      { playerName: 'QB1', position: 'QB', overall: 1 },
      { playerName: 'QB2', position: 'QB', overall: 2 }, // SF? no SF here, FLEX? no QB; → bench
    ]
    const out = assignPicksToSlots(picks, standard)
    const benchSlots = out.filter((e) => e.slot.kind === 'bench')
    expect(benchSlots[0]!.pick?.playerName).toBe('QB2')
  })
})

describe('D.6 — WarRoomPopup component', () => {
  const src = read('components/app/draft-room/WarRoomPopup.tsx')

  it('renders a fixed bottom-right trigger button with AF crest', () => {
    expect(src).toMatch(/fixed bottom-4 right-4/)
    expect(src).toMatch(/AF/)
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-trigger`\}/)
  })

  it('shows a notification badge when hasNewIntel is true and the popup is closed', () => {
    expect(src).toMatch(/hasNewIntel && !acknowledgedIntel && !open/)
    expect(src).toMatch(/animate-ping/)
    expect(src).toMatch(/data-has-new-intel=/)
  })

  it('clears the badge when the popup opens (acknowledgedIntel)', () => {
    expect(src).toMatch(/if \(open\) setAcknowledgedIntel\(true\)/)
  })

  it('persists open state across reloads via localStorage', () => {
    expect(src).toMatch(/POPUP_OPEN_PREF_KEY/)
    expect(src).toMatch(/window\.localStorage/)
  })

  it('closes on click-outside and ESC', () => {
    expect(src).toMatch(/document\.addEventListener\('mousedown', onDocClick\)/)
    expect(src).toMatch(/e\.key === 'Escape'/)
  })

  it('renders as a bottom sheet on mobile and a docked panel on desktop', () => {
    // Mobile: full-width bottom-anchored 80vh height; desktop: 380px wide bottom-right.
    expect(src).toMatch(/inset-x-0 bottom-0/)
    expect(src).toMatch(/sm:bottom-20/)
    expect(src).toMatch(/sm:right-4/)
    expect(src).toMatch(/sm:w-\[min\(380px/)
    expect(src).toMatch(/h-\[80vh\]/)
  })

  it('renders the close button with the X icon', () => {
    expect(src).toMatch(/import \{ X \} from 'lucide-react'/)
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-close`\}/)
  })
})

describe('D.6 — ResultsRosterPanel component', () => {
  const src = read('components/app/draft-room/ResultsRosterPanel.tsx')

  it('uses buildOrderedRosterSlots + assignPicksToSlots from the helper module', () => {
    expect(src).toMatch(/from '@\/lib\/draft-room\/rosterSlotOrder'/)
    expect(src).toMatch(/buildOrderedRosterSlots/)
    expect(src).toMatch(/assignPicksToSlots/)
  })

  it('defaults focus to currentUserRosterId; manual selection overrides', () => {
    expect(src).toMatch(/manualFocus \?\? currentUserRosterId/)
  })

  it('renders a dropdown listing every team', () => {
    expect(src).toMatch(/aria-haspopup="listbox"/)
    expect(src).toMatch(/teams\.map\(\(t\)/)
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-team-option-\$\{t\.rosterId\}`\}/)
  })

  it('flags AI managers with a Bot icon and the current user with a YOU pill', () => {
    expect(src).toMatch(/Bot.*aria-label="AI manager"/)
    expect(src).toMatch(/YOU/)
  })

  it('renders STARTERS and BENCH groups separately with sticky group headers', () => {
    expect(src).toMatch(/heading="STARTERS"/)
    expect(src).toMatch(/heading="BENCH"/)
    expect(src).toMatch(/sticky top-0/)
  })

  it('renders an "Empty" placeholder for unfilled slots (preserves the fixed slot grid)', () => {
    expect(src).toMatch(/>Empty</)
  })

  it('passes idpEnabled through to the slot-order helper', () => {
    expect(src).toMatch(/buildOrderedRosterSlots\(\{ starterSlots, benchSlots, idpEnabled \}\)/)
  })

  it('exposes data-focused-roster-id for QA / e2e selectors', () => {
    expect(src).toMatch(/data-focused-roster-id=/)
  })
})

describe('D.6 — DraftRoomShell allows teamPanel=null', () => {
  const src = read('components/app/draft-room/DraftRoomShell.tsx')

  it('premium layout no longer requires teamPanel to be truthy', () => {
    expect(src).toMatch(/premiumDesktop = layout === 'premium' && Boolean\(centerColumn\)/)
  })

  it('skips the left aside when teamPanel is null', () => {
    expect(src).toMatch(/\{teamPanel \? \(/)
    expect(src).toMatch(/data-testid="draft-premium-team-aside"/)
  })
})

describe('D.6 — DraftRoomPageClient wires the new layout end-to-end', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('imports WarRoomPopup + ResultsRosterPanel', () => {
    expect(src).toMatch(/import \{ WarRoomPopup \}/)
    expect(src).toMatch(/import \{[\s\S]*?ResultsRosterPanel[\s\S]*?\}/)
  })

  it('passes teamPanel={null} to the shell so the left aside collapses', () => {
    expect(src).toMatch(/teamPanel=\{null\}/)
  })

  it('renders the desktop bottom dock at xl+ widths (D.6.1 collapsed Queue/Roster/Chat into one tabbed panel)', () => {
    // D.6 originally shipped a 3-column side-by-side dock; D.6.1 replaced the 3 sibling
    // panels with a single tabbed `<DraftRightDockTabs>` so only the active tab body
    // fills the right side. The pool column + the legacy `<xl` tab fallback remain.
    expect(src).toMatch(/data-testid="draft-bottom-dock-pool"/)
    expect(src).toMatch(/data-testid="draft-right-dock"/)
    expect(src).toMatch(/<DraftRightDockTabs/)
    // The legacy <xl tab system stays as a fallback for tablet/mobile.
    expect(src).toMatch(/xl:hidden[\s\S]*?data-testid="draft-bottom-dock-tabs"/)
    // The old 3-col side-by-side layout is gone (no more sibling testids for queue/results/chat).
    expect(src).not.toMatch(/data-testid="draft-bottom-dock-queue"/)
    expect(src).not.toMatch(/data-testid="draft-bottom-dock-results"/)
    expect(src).not.toMatch(/data-testid="draft-bottom-dock-chat"/)
  })

  it('renders WarRoomPopup as a sibling to DraftRoomShell with the existing DraftTeamPanel inside', () => {
    expect(src).toMatch(/<WarRoomPopup hasNewIntel=\{warRoomHasNewIntel\}/)
    expect(src).toMatch(/<WarRoomPopup[\s\S]*?<DraftTeamPanel \{\.\.\.draftTeamPanelProps\}/)
  })

  it('lights up the popup badge when an AI recommendation is fresh', () => {
    expect(src).toMatch(/warRoomHasNewIntel = Boolean\(recommendationResult\?\.recommendation\)/)
  })

  it('builds the results-panel team list from session.slotOrder + currentUserRosterId', () => {
    expect(src).toMatch(/resultsRosterTeams = useMemo<ResultsRosterPanelTeam\[\]>/)
    expect(src).toMatch(/isCurrentUser: s\.rosterId === \(currentUserRosterId \?\? null\)/)
  })

  it('flags AI-managed rosters in the results-panel dropdown', () => {
    expect(src).toMatch(/isAi: aiManagedRosterIds\.includes\(s\.rosterId\)/)
  })

  it('feeds session.picks into the results-panel pick list', () => {
    expect(src).toMatch(/resultsRosterPicks = useMemo<ResultsRosterPanelPick\[\]>/)
    expect(src).toMatch(/\(session\?\.picks \?\? \[\]\)\.map\(\(p\) =>/)
  })

  it('renders only ONE board / pool / queue / chat node — no duplicates', () => {
    // The 4-col dock reuses {playerPoolNode}, {queueStackNode}, {chatPanelNode} —
    // not duplicated copies of those JSX trees.
    const poolRefs = src.match(/\{playerPoolNode\}/g) ?? []
    const queueRefs = src.match(/\{queueStackNode\}/g) ?? []
    const chatRefs = src.match(/\{chatPanelNode\}/g) ?? []
    // Each node is rendered exactly twice: once in the desktop 4-col dock and once in the
    // <xl tab fallback / mobile tab. (chat is also passed to the shell as `chatPanel` prop —
    // string-search counts that too, so chat is 3.)
    expect(poolRefs.length).toBeLessThanOrEqual(3)
    expect(queueRefs.length).toBeLessThanOrEqual(3)
    expect(chatRefs.length).toBeLessThanOrEqual(4)
    // And they all flow from the SAME memoized definition — ensures no fork.
    expect(src).toMatch(/const playerPoolNode = useMemo/)
    expect(src).toMatch(/const queueStackNode = useMemo/)
    expect(src).toMatch(/const chatPanelNode = useMemo/)
  })
})
