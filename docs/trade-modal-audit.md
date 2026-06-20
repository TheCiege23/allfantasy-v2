# Trade System + Modal Infrastructure Audit (and first remediation PR)

Audit-first per directive. This documents findings for Phases 1 (modals), 2 (trades), 4 (league
routing), and lays out the sequenced plan for Phases 5–7. This PR ships the **shared modal
contract**, the **Settings-modal fix**, and the **league-context routing fix**; the heavier Trade
Center rebuild + trade-block wiring + seeded QA are scoped as reviewed follow-ups. **Do not merge
until reviewed.**

---

## PHASE 1 — Modal / Overlay audit

### Foundation that exists
- `components/ui/dialog.tsx` — a **Radix Dialog** wrapper (overlay, portal, `DialogContent` with a
  built-in close button). Radix gives Escape-to-close, backdrop-close (via `onOpenChange`), focus
  trapping, focus return, and body scroll-lock (react-remove-scroll) **for free**. It is solid but
  **underused** — most large modals don't use it.

### Duplicated / bespoke (the source of the reported bugs)
- `components/league/LeagueSettingsShell.tsx` (the reported #1 broken modal) was a **hand-rolled**
  `fixed inset-0` overlay. Confirmed defects:
  - **Backdrop click never closed** — the backdrop `<div>` had no `onClick`.
  - **Escape never closed** — no keydown listener.
  - **No body scroll-lock** — background scrolled behind the modal.
  - **Broken internal scroll** — the content used `flex-1 overflow-y-auto` **without `min-h-0`**
    (the classic flexbox bug: the flex child grows instead of scrolling).
  - Not portaled — subject to parent overflow/stacking quirks (contributes to the unreliable X).
- Dozens of other bespoke modals (`createPortal` / `fixed inset-0`) across draft-room, AI tools,
  chimmy surfaces, first-entry modals, etc. — each re-implements (or omits) close/scroll/lock.

### Fix shipped in this PR
- **`components/ui/AppModal.tsx`** — a shared modal contract built on Radix Dialog:
  - Escape + backdrop close, focus trap + return, body scroll-lock (inherited from Radix).
  - Bounded height `max-h-[90dvh]` with a **header / scrollable body / footer** column where the
    body is `min-h-0 flex-1 overflow-y-auto` (the missing piece).
  - `size` (sm/md/lg/xl/full), `headerAccessory`, `footer`, `hideHeader`, `dismissible` (lock during
    submit), and an always-present accessible title. Testids: `app-modal-close`, `app-modal-body`.
- **`LeagueSettingsShell` refactored onto `AppModal`** — X / backdrop / Escape all close, focus
  returns, body locks, long settings pages scroll correctly, and the tab bar is sticky.

### Adoption plan (follow-up, low-risk, incremental)
Migrate to `AppModal`, highest-pain first: Trade modals (Propose/Add-assets/Review) → waiver claim
drawer → War Room popouts → commissioner tools → future Chimmy panels. Each migration is isolated
and independently testable.

---

## PHASE 2 — Trade system audit

The trade **backend is extensively built**; the gaps are UX/wiring and a few NCAAF-parity items.

### Already built (DB + routes)
- **Models:** `LeagueTrade`, `LeagueTradeHistory`, `TradeNotification`, `TradeProfile`,
  `TradePreferences`, `TradeFeedback`, `TradeSuggestionVote`, plus AI learning/cache models.
- **Lifecycle routes** under `app/api/leagues/[leagueId]/trades/`: `route` (create/list),
  `[tradeId]` (get), `accept`, `reject`, `cancel`, `counter`, `vote`, `commissioner` (veto/force),
  `process`. Plus `app/api/league/trades-panel` (the panel feed) and
  `app/api/app/leagues/[leagueId]/trades`.
- **Draft-pick trading:** `leagues/[leagueId]/draft/trade-proposals` (+ `[proposalId]/respond`,
  `/review`) and `draft/trade-builder/{inventory,analyze,suggestions}`.
- **AI analysis (separate from this scope):** `ai/trade*`, `engine/trade/*`, `dynasty-trade-analyzer`.

### Partially built
- **Trade voting / commissioner veto / review periods** — routes (`vote`, `commissioner`) +
  `TradeSuggestionVote` exist; UI surfacing in the Trades tab is thin (review tab shows an empty
  state). Needs UI wiring + confirmation of review-period/deadline settings plumbing.
- **Trade block** — a "Trade Block" section renders in `TradesTab` and the Propose-Trade modal has a
  "Trade Block" checkbox, and player cards show `TRADE BLOCK` chips (see screenshots) → indicates
  backend support; **needs an explicit audit of the read/write path before wiring more UI** (Phase 6).
- **Trade history** — `LeagueTradeHistory` model + `trade-history` route/page exist; surfacing in the
  in-league Trades tab is minimal.

### Broken / bugged
- **League-context routing** (Phase 4 — fixed in this PR; see below).
- **Modal scroll/height** in the trade modals (same `min-h-0` class of bug as settings) — to be
  fixed by migrating them to `AppModal` (Phase 5).

### NCAAF parity
- Trade routes are sport-agnostic (operate on rosters/players); NCAAF works where the league has
  rosters. Player-value/AI analysis degrades to limited-data (consistent with Step 3D). No NFL-only
  trade logic found. Confirm copy is sport-neutral during the Phase 5 UI pass.

---

## PHASE 4 — League-context routing bug (FIXED in this PR)

**Root cause:**
- `app/league/[leagueId]/tabs/TradesTab.tsx` hardcoded `tradeFinderHref = '/trade-finder'`, dropping
  the active `leagueId`.
- `app/trade-finder/page.tsx` `<LeagueGate>` always rendered the "Select a League" card grid, even
  when a league was already known.

**Fix:**
- `TradesTab` now links to `/trade-finder?leagueId=<id>` when in league context.
- `TradeFinderPage` reads `?leagueId=` and passes it to `LeagueGate`, which **auto-selects the
  matching league and skips the picker**. The picker still shows for the global / AI Trade Finder
  entry (no league context) or when the id doesn't match a connected league — exactly the required
  behavior.

---

## PHASES 5–7 — Sequenced plan (follow-up PRs, after this audit is reviewed)

- **Phase 5 — Trade Center UX:** migrate Propose-Trade / Add-assets / Review modals to `AppModal`
  (fixes their scroll/height), tighten the 3-step flow (partner select → asset select w/ pick cards
  + summary → review/submit), and verify against the existing lifecycle routes. Match Sleeper's
  *workflow* quality (Phase 3), not its visuals.
- **Phase 6 — Trade Block:** audit the trade-block read/write path end-to-end; wire player + draft-
  pick trade-block toggles + indicators **only where the backend genuinely supports it** (no fake
  functionality); document any gaps.
- **Phase 7 — Seeded QA:** dev/test-only NFL + NCAAF fixtures (commissioner + multiple managers +
  populated rosters + picks) supporting propose/respond/veto/trade-block, plus Playwright coverage.

---

## This PR — validation
- Files: `components/ui/AppModal.tsx` (new), `components/league/LeagueSettingsShell.tsx`,
  `app/league/[leagueId]/tabs/TradesTab.tsx`, `app/trade-finder/page.tsx`, this doc.
- tsc + eslint clean on touched files; Draft Room Regression; clean `C:\tmp` build.
- No schema changes (no migration). No production data writes, no provider syncs, no env changes.
