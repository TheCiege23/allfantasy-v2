# PROMPT 184 — Draft Room Mobile Polish, Replay, and Post-Draft Summary Deliverable

Mobile polish and post-draft flows for the AllFantasy draft room.

---

## Supported sports

NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (aligned with `lib/sport-scope.ts`).

---

## Mobile requirements (implemented)

| Requirement | Implementation |
|-------------|----------------|
| **Sticky current pick area** | On mobile, `DraftRoomShell` accepts optional `mobileStickyBar`. When provided, it is rendered inside the scroll area as `sticky top-0 z-10` so when the user scrolls the board, the current pick strip (pick label + “On clock: DisplayName”) stays visible. |
| **Easy access to queue** | Mobile tab “Queue” in the bottom nav; same as before, with larger touch targets. |
| **Easy access to player search** | Mobile tab “Players” (PlayerPanel with search); touch targets increased. |
| **Easy access to chat** | Mobile tab “Chat”. |
| **Easy access to AI helper** | Mobile tab “AI” when `helperPanel` is provided. |
| **Easy access to roster** | New mobile tab “Roster” shows “My roster” (user’s drafted picks). Rendered when `rosterPanel` is passed to the shell. |
| **Smooth switching** | Single scrollable content area; tab nav switches content (board, players, queue, helper, roster, chat). No cramped panels. |
| **No cramped unreadable panels** | Content area uses `text-sm`, `min-h-[200px]`, and nav buttons use `min-h-[44px]` and `touch-manipulation` for tap targets. |

### Mobile shell changes

- **File:** `components/app/draft-room/DraftRoomShell.tsx`
- **New props:** `rosterPanel?: ReactNode`, `mobileStickyBar?: ReactNode`
- **New tab:** `MobileDraftTab` includes `'roster'`; tab is shown only when `rosterPanel` is provided.
- **Sticky bar:** Rendered above the scrollable content on mobile when `mobileStickyBar` is set.
- **Nav:** Buttons use `min-h-[44px]`, `py-2.5`, `text-[11px]`, and `touch-manipulation` for accessibility and tap size.

---

## Post-draft features (implemented)

| Feature | Implementation |
|---------|----------------|
| **Draft summary** | When `session.status === 'completed'`, the client renders `PostDraftView` instead of the live draft. “Summary” tab: total picks, rounds, teams, by-position counts. |
| **Team-by-team results** | “Teams” tab: expandable cards per slot/team (from `slotOrder`), each listing that team’s picks. |
| **Drafted roster review** | “My Roster” tab: list of current user’s picks (filtered by `currentUserRosterId`). |
| **Replay / pick log** | “Replay” tab: ordered list of all picks (overall #, player name, position, display name). |
| **AI recap** | “AI Recap” tab: button “Generate AI recap” calls `POST /api/leagues/[leagueId]/draft/recap`; response `{ recap: string }` is shown. Graceful error message if the request fails. |
| **Value / reach summary** | In Summary tab: “Value / reach” card shows earliest pick by position (first time each position was selected). Note that full value/reach vs ADP is in AI Recap when available. |
| **Export / share** | “Share” tab: “Copy draft room link” and “Copy summary (text)” buttons. Both use `navigator.clipboard.writeText`. If clipboard is unavailable, actions no-op (graceful degradation). |

### Post-draft view component

- **File:** `components/app/draft-room/PostDraftView.tsx`
- **Props:** `leagueId`, `leagueName`, `sport`, `session` (DraftSessionSnapshot), `currentUserRosterId`, `slotOrder`
- **Tabs:** Summary, Teams, My Roster, Replay, AI Recap, Share. Horizontal scroll on small screens; min tap height 44px for tab buttons.

### Draft recap API

- **File:** `app/api/leagues/[leagueId]/draft/recap/route.ts`
- **Method:** POST
- **Auth:** `canAccessLeagueDraft(leagueId, userId)` (403 if not allowed).
- **Behavior:** Loads session via `buildSessionSnapshot(leagueId)`; requires `status === 'completed'`. Builds a text summary of picks and team rosters, then calls `openaiChatText` (system prompt: concise fantasy analyst, 2–4 paragraphs, no invented players). Returns `{ recap: string }` or `{ error: string }` with 502 if AI fails.

---

## Wiring

- **File:** `components/app/draft-room/DraftRoomPageClient.tsx`
  - When `session.status === 'completed'`, the component returns `<PostDraftView ... />` and does not render the live shell.
  - For in-progress/paused/pre_draft: builds `mobileStickyBar` (current pick label + on-clock display name) and `rosterPanel` (list of my drafted picks). Passes both to `DraftRoomShell` so mobile users get sticky current pick and a Roster tab.
- **Exports:** `PostDraftView` and types `PostDraftViewProps`, `PostDraftTab` are exported from `components/app/draft-room/index.ts`.

---

## QA checklist (mandatory click audit)

- [ ] **Mobile tabs/panels work** — On a narrow viewport, open draft room (in-progress draft). Verify Board, Players, Queue, AI, Roster, Chat tabs are visible and switch content. No blank or broken panel.
- [ ] **Sticky current pick** — On mobile, go to Board tab and scroll. The sticky bar at top (current pick + on clock) remains visible.
- [ ] **Roster tab** — On mobile, open Roster tab. “My roster” shows your drafted picks; if none, “No picks yet.” is shown.
- [ ] **Completed draft shows post-draft view** — When session status is `completed`, the page shows PostDraftView (tabs: Summary, Teams, My Roster, Replay, AI Recap, Share) instead of the live draft UI.
- [ ] **Replay opens correctly** — In post-draft view, open “Replay” tab. Full pick log in order (overall #, player, position, owner) is displayed.
- [ ] **Summary cards work** — In post-draft view, Summary tab shows draft summary card (total picks, rounds, teams), by-position card, and value/reach card (earliest pick by position).
- [ ] **AI recap opens correctly** — In post-draft view, open “AI Recap” tab. Click “Generate AI recap”. Either a recap paragraph appears or an error message; no dead button.
- [ ] **Share/export actions work or gracefully degrade** — In post-draft view, open “Share” tab. “Copy draft room link” and “Copy summary (text)” copy to clipboard when available; if clipboard API is missing or denied, buttons do not throw (graceful degradation).
- [ ] **No dead post-draft buttons** — Every tab and button in PostDraftView either navigates, fetches recap, or copies; none are placeholders with no action.
- [ ] **Team-by-team** — “Teams” tab: each team card expands to show that team’s picks.
- [ ] **My Roster (post-draft)** — “My Roster” tab in post-draft view lists the current user’s drafted players.

---

## File reference

| Area | Path |
|------|------|
| Mobile shell | `components/app/draft-room/DraftRoomShell.tsx` |
| Post-draft UI | `components/app/draft-room/PostDraftView.tsx` |
| Draft room client (branch + sticky + roster) | `components/app/draft-room/DraftRoomPageClient.tsx` |
| Draft recap API | `app/api/leagues/[leagueId]/draft/recap/route.ts` |
| Exports | `components/app/draft-room/index.ts` |
