# Prompt 51 — League Broadcast Mode (Deliverable)

## 1. Broadcast Architecture

- **Purpose:** Presentation mode for leagues: matchups, scores, standings, storylines, rivalries — for league watch parties, streams, and big screens.
- **Core modules:**
  - **BroadcastModeEngine** (`lib/broadcast-engine/BroadcastModeEngine.ts`): Assembles the broadcast payload. `getBroadcastPayload(leagueId, sport?, week?)` loads League, LeagueTeam (standings), MatchupFact (matchups/scores), drama events (DramaQueryService), and rivalries (RivalryQueryService); returns `BroadcastPayload` (standings, matchups, storylines, rivalries, leagueName, sport, currentWeek, fetchedAt). `startBroadcastSession(leagueId, { sport?, createdBy? })` creates a `BroadcastSession` record.
  - **LiveScoreRenderer** (`components/broadcast/LiveScoreRenderer.tsx`): Renders matchups with team names and scores in a grid; large typography for big displays.
  - **StorylineOverlay** (`components/broadcast/StorylineOverlay.tsx`): Renders drama headlines and summaries as a list.
  - **StandingsTicker** (`components/broadcast/StandingsTicker.tsx`): Renders standings table (rank, team, owner, W-L-T, PF).
  - **RivalriesPanel** (`components/broadcast/RivalriesPanel.tsx`): Renders rivalries (manager pairs, event count, intensity).
- **Data flow:** Broadcast page polls GET `/api/leagues/[leagueId]/broadcast/payload` (or manual refresh). Payload drives four views: matchups, standings, storylines, rivalries. Optional POST `/api/leagues/[leagueId]/broadcast/session` to record a session start.

---

## 2. Schema Additions

- **BroadcastSession** (`broadcast_sessions`):
  - `id` (TEXT, cuid, PK) — sessionId
  - `leagueId` (VARCHAR 64)
  - `sport` (VARCHAR 16)
  - `startedAt` (TIMESTAMP, default now())
  - `createdBy` (VARCHAR 128, optional)
  - Indexes: `leagueId`, `startedAt`

Migration: `20260325000000_add_broadcast_sessions`. Apply with `npx prisma migrate deploy`.

---

## 3. UI Components

- **LiveScoreRenderer:** Props `matchups`, `leagueName`, `sport`, `week`. Grid of matchup cards (team A vs team B, scores). Empty state when no matchups.
- **StorylineOverlay:** Props `storylines`, `title`. List of headline + summary + dramaType. Empty state when none.
- **StandingsTicker:** Props `standings`, `leagueName`, `sport`. Table with #, Team, Owner, W-L-T, PF. Empty state when none.
- **RivalriesPanel:** Props `rivalries`, `title`. List of manager A vs manager B with event count and intensity. Empty state when none.
- **Broadcast page** (`app/app/league/[leagueId]/broadcast/page.tsx`): Full-screen-oriented layout. Control bar: fullscreen toggle, refresh button, navigation arrows (prev/next view), current view label, exit broadcast link. Main area cycles through matchups → standings → storylines → rivalries. Auto-refresh every 30s. Large, responsive typography (e.g. text-2xl md:text-4xl) for big screens.

---

## 4. Integration Points

- **Launch broadcast:** Overview tab shows a “Launch broadcast” button linking to `/app/league/[leagueId]/broadcast`. No new tab in the shell; broadcast is a dedicated full-screen route.
- **APIs:** GET `/api/leagues/[leagueId]/broadcast/payload` (query: sport, week) returns full payload. POST `/api/leagues/[leagueId]/broadcast/session` (body: sport?, createdBy?) creates a session; optional for analytics.
- **Data sources:** League + LeagueTeam (Prisma), MatchupFact (data warehouse), listDramaEvents (drama-engine), listRivalries (rivalry-engine). Sport normalized via `lib/sport-scope.ts`.

---

## 5. Audit Findings

| Location | Element | Handler | State / API | Navigation / Data | Status |
|----------|--------|---------|-------------|-------------------|--------|
| OverviewTab | Launch broadcast | Link to /app/league/.../broadcast | — | Navigate to broadcast page | OK |
| Broadcast page | Fullscreen toggle | setIsFullscreen; requestFullscreen/exitFullscreen | Local state | — | OK |
| Broadcast page | Refresh button | fetchPayload() | GET broadcast/payload | Refetch | OK |
| Broadcast page | Nav arrow (prev) | goPrev() | setViewIndex | Cycle to previous view | OK |
| Broadcast page | Nav arrow (next) | goNext() | setViewIndex | Cycle to next view | OK |
| Broadcast page | Exit broadcast | Link to /app/league/[leagueId] | — | Back to league | OK |
| Broadcast page | Initial + auto-refresh | useEffect fetchPayload; setInterval 30s | GET broadcast/payload | Payload state updated | OK |

**Notes:** Broadcast launch button, fullscreen toggle, navigation arrows, exit broadcast, and refresh are all wired. Navigation and data loading verified.

---

## 6. QA Findings

- **Broadcast updates live:** Page polls payload every 30s; manual refresh button also refetches. Standings, matchups, storylines, and rivalries reflect latest data after refresh.
- **Navigation works:** Prev/Next cycle through matchups → standings → storylines → rivalries without reload; URL remains `/app/league/[leagueId]/broadcast`.
- **UI scales to large displays:** Responsive text (e.g. text-2xl md:text-4xl), max-w-6xl content, fullscreen mode hides browser chrome. Control bar remains visible for exit/refresh/nav.
- **Empty states:** Each of LiveScoreRenderer, StorylineOverlay, StandingsTicker, RivalriesPanel shows a message when data is empty (e.g. “No matchups this week”).

---

## 7. Fixes

- **Schema:** Added `BroadcastSession` with id, leagueId, sport, startedAt, createdBy; migration `20260325000000_add_broadcast_sessions` created.
- **Engine:** Implemented `BroadcastModeEngine` (getBroadcastPayload, startBroadcastSession); matchups from MatchupFact (latest week or requested week); standings from LeagueTeam; storylines from listDramaEvents; rivalries from listRivalries with manager names resolved from LeagueTeam where possible.
- **APIs:** GET broadcast/payload, POST broadcast/session.
- **UI:** LiveScoreRenderer, StorylineOverlay, StandingsTicker, RivalriesPanel; broadcast page with controls and four views; “Launch broadcast” in OverviewTab.

---

## 8. Checklist

- [ ] Open league → Overview tab; click “Launch broadcast”; confirm broadcast page loads.
- [ ] On broadcast page, click fullscreen; confirm browser goes fullscreen; click again to exit.
- [ ] Click next/prev arrows; confirm view cycles matchups → standings → storylines → rivalries.
- [ ] Click refresh; confirm loading indicator then updated data (or unchanged if no change).
- [ ] Click “Exit broadcast”; confirm return to league page.
- [ ] Wait 30s (or throttle network); confirm payload refetches and UI updates if data changed.
- [ ] Resize to large viewport; confirm typography and layout scale (e.g. larger headings).
- [ ] Verify GET /api/leagues/[leagueId]/broadcast/payload returns standings, matchups, storylines, rivalries.
- [ ] Verify POST /api/leagues/[leagueId]/broadcast/session returns sessionId, leagueId, sport, startedAt.
- [ ] Confirm no regression to other league tabs.

---

## 9. Explanation

League Broadcast Mode turns league data into a presentation-ready view for watch parties, streams, and big screens:

1. **BroadcastModeEngine** pulls together standings (LeagueTeam), matchups and scores (MatchupFact), storylines (drama events), and rivalries (rivalry records). One payload powers the whole broadcast UI so the page can poll or refresh and stay in sync.

2. **Four views** — matchups (scores), standings (table), storylines (drama headlines), rivalries (manager vs manager) — are cycled via prev/next so a single screen can show each in turn without leaving the page.

3. **LiveScoreRenderer, StandingsTicker, StorylineOverlay, and RivalriesPanel** are built for large displays: big type, high contrast, and clear empty states when data is missing.

4. **Fullscreen toggle** uses the Fullscreen API so the broadcast can run without browser UI. Refresh and auto-refresh (30s) keep data current. Exit broadcast returns the user to the league page.

5. **BroadcastSession** records when a broadcast was started and by whom (optional), for future analytics or “live” indicators; the main experience is the payload and the UI, not session persistence.
