# PROMPT 274 — Final User Dashboard (Sleeper-Level UX)

**Objective:** Build the main dashboard to feel elite while staying clean, mobile-first, fast, and uncluttered.

---

## Delivered

| Requirement | Implementation |
|---|---|
| **Active leagues by sport** | Grouped by sport with emoji headers, per-sport counts, and direct league links. |
| **Upcoming drafts** | Real draft-session signals from `DraftSession` (upcoming/live/paused), with per-league draft links. |
| **Live matchups** | Real matchup signals from `WeeklyMatchup` (latest week per league + matchup counts), with per-league matchup links. |
| **AI suggestions** | Primary AI advisor card + trade/waiver suggestion cards + Chimmy CTA with availability fallback. |
| **Token balance** | Top status card linked to `/tokens`, with loading/error-safe state. |
| **Subscription status** | Top status card linked to `/pricing`, showing active plan or free status. |
| **Quick actions** | Start/Sit, Trade, Draft, Waivers in compact 2x2 mobile grid with strong tap targets. |

---

## Architecture and Logic

### 1) New dashboard signals API

- **File:** `app/api/dashboard/home/signals/route.ts`
- **Purpose:** Single aggregated request for dashboard live sections.
- **Behavior:**
  - Auth-gated by session.
  - Accepts `leagueId` query params (up to 24).
  - Validates league ownership against the authenticated user.
  - Returns:
    - `upcomingDrafts` from `DraftSession` (`pre_draft`, `in_progress`, `paused`)
    - `liveMatchups` from `WeeklyMatchup` (latest week per league with matchup counts)

### 2) New client hook for live sections

- **File:** `hooks/useDashboardHomeSignals.ts`
- **Purpose:** Keep draft/matchup dashboard sections synchronized.
- **Behavior:**
  - Fetches `/api/dashboard/home/signals` using current league IDs.
  - Refetch on mount, focus, visibility-resume, and global state refresh events.
  - Handles loading/error/fallback states without blocking the rest of dashboard UI.

### 3) Final dashboard UI rewrite

- **File:** `components/dashboard/FinalDashboardClient.tsx`
- **Behavior and UX:**
  - Compact hero with one refresh action (`Refresh`) for all dashboard state.
  - Two status cards: tokens + subscription.
  - 2x2 quick actions above fold.
  - Active leagues by sport section.
  - Upcoming drafts section powered by real signal data.
  - Live matchups section powered by real signal data.
  - AI suggestions block with Chimmy fallback behavior.
  - Removed non-essential sections to keep the home surface clean and fast.

---

## Notes

- Sport handling remains compatible with platform-wide supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) via existing sport grouping and normalization.
- Dashboard remains mobile-first and intentionally dense, with minimal visual noise and direct action routing.

