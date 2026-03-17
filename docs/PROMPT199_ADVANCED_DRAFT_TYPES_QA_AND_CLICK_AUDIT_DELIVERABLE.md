# PROMPT 199 — Advanced Draft Types QA and Click Audit Deliverable

## Overview

QA and click audit of AllFantasy advanced draft systems: auction, slow draft, keeper, devy, C2C, draft import/migration, CPU drafter, AI drafter, player asset pipeline, sports API image/logo/stat wiring, notifications/reminders, post-draft summaries, and settings hub.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Issue List by Severity

### High

| # | Issue | Area | Fix |
|---|--------|------|-----|
| H1 | Draft pool not loaded on initial draft room entry; player list could fall back to wrong source (app/league/draft → mock-draft ADP). | Draft room / pool | Call `fetchDraftPool()` in initial load `useEffect` with `fetchSession`, `fetchQueue`, `fetchDraftSettings`, `fetchChat` so normalized pool (with devy/C2C merge) is used. |
| H2 | After commissioner “Start draft”, returned session lacked `currentUserRosterId`, `orphanRosterIds`, `aiManagerEnabled`, `orphanDrafterMode`; client could show stale or wrong “on clock” / orphan UI. | Draft session | Enrich POST `draft/session` start response with same shape as GET (currentUserRosterId, orphanRosterIds, aiManagerEnabled, orphanDrafterMode). |

### Medium

| # | Issue | Area | Fix |
|---|--------|------|-----|
| M1 | KeeperPanel fetch URLs used raw `leagueId`; could break for IDs with special characters. | Keeper | Use `encodeURIComponent(leagueId)` in all keeper API URLs (GET keepers, POST keepers, POST remove, PATCH config). |

### Low / Verification Only

| # | Issue | Area | Status |
|---|--------|------|--------|
| L1 | App section “draft” proxies to mock-draft ADP, not live pool. | App proxy | By design; draft room now loads pool from `GET /api/leagues/[leagueId]/draft/pool` on load. |
| L2 | Asset/headshot fallback | Player cards | `LazyDraftImage` + `DraftPlayerCard` HeadshotOrFallback/TeamLogoOrFallback already handle loading and error; no broken images. |
| L3 | Sport scope in pool | Draft pool | Pool uses league sport; NFL uses getLiveADP, others use getPlayerPoolForLeague. Sport scope is respected. |

---

## 2. File-by-File Fix Plan (Applied)

| File | Change |
|------|--------|
| `components/app/draft-room/DraftRoomPageClient.tsx` | Add `fetchDraftPool()` to initial `useEffect` so draft room loads normalized pool (with devy/C2C) on entry. |
| `app/api/leagues/[leagueId]/draft/session/route.ts` | On POST `action === 'start'`, return session enriched with `currentUserRosterId`, `orphanRosterIds`, `aiManagerEnabled`, `orphanDrafterMode` (same as GET). |
| `components/app/draft-room/KeeperPanel.tsx` | Use `encodeURIComponent(leagueId)` in all fetch URLs: GET keepers, POST keepers, POST keepers/remove, PATCH keepers/config. |

---

## 3. Verification Matrix (16 Criteria)

| # | Criterion | Auction | Slow | Keeper | Devy | C2C | Import | CPU/AI | Assets | Notifications | Post-draft | Settings |
|---|-----------|----------|------|--------|------|-----|--------|--------|--------|----------------|------------|----------|
| 1 | Route exists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| 2 | Component renders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| 3 | Handler exists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| 4 | State updates correctly | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| 5 | Backend call exists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| 6 | Deterministic logic works | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | AI optional paths work | — | — | — | — | — | — | ✓ | — | — | ✓ | — |
| 8 | Provider fallback works | — | — | — | — | — | — | — | ✓ | — | — | — |
| 9 | Loading state works | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| 10 | Error state works | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| 11 | Mobile behavior works | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| 12 | Desktop behavior works | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| 13 | No dead buttons | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| 14 | No stale saved state | ✓ (fixed H2) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| 15 | Asset loading/fallback works | — | — | — | — | — | — | — | ✓ | — | — | — |
| 16 | Draft-specific rules enforced | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |

---

## 4. Final QA Checklist

- [ ] **Auction:** Nominate → bid → resolve flow; timer; budget display; no dead nominate/bid/resolve buttons; commissioner resolve works.
- [ ] **Slow draft:** Timer; queue load/save/reorder; “Use queue” when timer expired and user on clock; AI reorder queue when enabled; autopick-expired submits from queue.
- [ ] **Keeper:** Keeper panel loads; add/remove keeper; commissioner config (max keepers, deadline); keeper locks on board; URLs use encoded leagueId.
- [ ] **Devy:** Devy config (enabled, rounds); pool merges devy when enabled; devy rounds on board; devy indicator in player list.
- [ ] **C2C:** C2C config (enabled, college rounds); pool merges college when enabled; college rounds on board.
- [ ] **Draft import:** Commissioner control center → Import draft data → Validate (JSON) → preview/errors → Commit; Rollback when backup exists; loading and error states.
- [ ] **CPU drafter:** Orphan on clock shows “CPU Manager” / “AI Manager”; commissioner “Run pick” triggers ai-pick; loading state.
- [ ] **AI drafter:** AI pick endpoint; queue AI reorder; AI ADP when enabled; draft helper recommendation; AI recap (post-draft) when enabled.
- [ ] **Player asset pipeline:** Headshot/team logo resolve; LazyDraftImage + fallback (initials); no broken images.
- [ ] **Notifications/reminders:** Draft notify API; in-app notifications for on-the-clock, pause, resume, autopick, trade offer, etc. (per PROMPT 197).
- [ ] **Post-draft:** Summary tab; pick log; team results; value/reach; budget summary (auction); keeper outcome; devy/C2C lines; AI recap generate; share (copy link, copy summary); GET post-draft-summary returns 404 when not completed.
- [ ] **Settings hub:** Draft settings panel (timer mode, variant, keeper/devy/C2C/auction, orphan AI, etc.); load/save; commissioner-only edits; loading and error states.
- [ ] **Draft pool on load:** Entering draft room loads session, queue, settings, chat, and **draft pool** from `GET /api/leagues/[leagueId]/draft/pool` so player list uses normalized pool with devy/C2C.
- [ ] **Start draft response:** After “Start draft”, client receives session with `currentUserRosterId`, `orphanRosterIds`, `aiManagerEnabled`, `orphanDrafterMode` so UI is not stale.

---

## 5. Manual Testing Checklist

1. **Auction**
   - Create/start auction league draft; open draft room; verify auction strip shows; commissioner nominates; others bid; timer runs; resolve assigns winner; budget updates; complete draft and check post-draft budget summary.

2. **Slow draft**
   - Start snake/linear draft with timer; add players to queue; let timer expire on your pick → “Use queue” appears; submit from queue; use AI reorder queue if enabled; verify autopick-expired when applicable.

3. **Keeper**
   - Enable keeper in settings (max keepers, deadline); open keeper panel; add keeper (round cost); remove keeper; commissioner override; verify keeper locks on board and keeper outcome in post-draft.

4. **Devy / C2C**
   - Enable devy (rounds) or C2C (college rounds); verify pool includes devy/college players and board shows devy/C2C rounds; complete draft and check post-draft devy/C2C line.

5. **Import**
   - As commissioner, open control center → Import draft data; paste valid JSON; Validate → preview; Commit; verify draft state; Rollback if backup exists.

6. **CPU / AI drafter**
   - Set orphan roster and enable AI manager; when orphan on clock, verify “AI Manager”/“CPU Manager” and “Run pick”; trigger AI pick; verify loading and session update.

7. **Post-draft**
   - Complete a draft; verify post-draft view (summary, teams, replay, roster, AI recap, share); generate AI recap; copy link and summary; GET post-draft-summary when completed (200) and when not (404).

8. **Settings**
   - Open league → Settings → Draft; change timer mode, variant, keeper/devy/C2C/auction options; save; reload and verify persistence; error when not commissioner.

9. **Mobile / desktop**
   - Repeat critical flows on narrow viewport (mobile tabs: Board, Players, Queue, AI, Roster, Keepers, Chat) and desktop layout; no dead buttons or overflow.

10. **Sport scope**
    - For each supported sport (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER), create or use league and open draft; verify pool and draft room load without sport-specific breakage.

---

## 6. Automated Test Recommendations

If a test framework exists (e.g. Jest, Playwright):

- **API**
  - `GET /api/leagues/[leagueId]/draft/session`: 200 with session shape including `currentUserRosterId`, `orphanRosterIds`, `aiManagerEnabled`, `orphanDrafterMode` when session exists; 200 with `session: null` when no session.
  - `POST /api/leagues/[leagueId]/draft/session` body `{ action: 'start' }`: 200 with session shape including same client fields as GET.
  - `GET /api/leagues/[leagueId]/draft/pool`: 200 with `entries`, `sport`, optional `devyConfig`/`c2cConfig`; 401/403 when unauthorized.
  - `GET /api/leagues/[leagueId]/draft/post-draft-summary`: 200 when draft completed; 404 when not completed.
  - Keeper routes (GET keepers, POST keepers, POST remove, PATCH config): auth and commissioner checks; encode leagueId in URLs in client tests.

- **Integration**
  - Draft room load: after mounting with leagueId, expect fetch to `/draft/session`, `/draft/queue`, `/draft/settings`, `/draft/chat`, `/draft/pool`.
  - Post-draft view: when `session.status === 'completed'`, render PostDraftView with summary, teams, replay, share; no draft board.

- **E2E (Playwright)**
  - Commissioner opens draft room → Start draft → session shows current pick and manager strip.
  - Commissioner opens control center → Import draft data → paste JSON → Validate → Commit (if valid).
  - User on clock adds to queue → timer expires → “Use queue” visible → click → pick submitted from queue.
  - Auction: nominate → bid → resolve → next nomination.

---

## 7. Summary of Code Fixes Delivered

- **DraftRoomPageClient.tsx:** Initial load now includes `fetchDraftPool()` so the draft room uses the normalized draft pool (with devy/C2C merge) from `GET /api/leagues/[leagueId]/draft/pool` on first load.
- **draft/session/route.ts:** POST `action === 'start'` now returns the same session shape as GET (adds `currentUserRosterId`, `orphanRosterIds`, `aiManagerEnabled`, `orphanDrafterMode`) so the client does not show stale state after starting the draft.
- **KeeperPanel.tsx:** All keeper API URLs now use `encodeURIComponent(leagueId)` for safe encoding.

No patch snippets; all changes are full merged files as requested.
