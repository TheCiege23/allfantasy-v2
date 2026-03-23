# Prompt 51 — League Broadcast Mode (Deliverable)

## 1. Broadcast Architecture

- **Purpose:** Dedicated presentation mode for matchups, scores, standings, storylines, and rivalries, optimized for watch parties, streams, and large displays.
- **Core modules:**
  - **BroadcastModeEngine** (`lib/broadcast-engine/BroadcastModeEngine.ts`)
    - `getBroadcastPayload({ leagueId, sport?, week? })`
    - `startBroadcastSession(leagueId, { sport?, createdBy? })`
  - **LiveScoreRenderer** (`components/broadcast/LiveScoreRenderer.tsx`)
  - **StorylineOverlay** (`components/broadcast/StorylineOverlay.tsx`)
  - **StandingsTicker** (`components/broadcast/StandingsTicker.tsx`)
  - **RivalriesPanel** (`components/broadcast/RivalriesPanel.tsx`)
- **Engine update in this pass:** sport resolution now prefers league sport when query sport is absent, preventing cross-sport storyline/rivalry mismatches.
- **Payload lifecycle:** broadcast page loads payload on entry, records a broadcast session start, auto-refreshes every 30s, and supports manual refresh without dropping the current view.

---

## 2. Schema Additions

- **BroadcastSession** (`broadcast_sessions`) already present:
  - `id` (sessionId)
  - `leagueId`
  - `sport`
  - `startedAt`
  - `createdBy`
  - Indexes: `leagueId`, `startedAt`
- Migration: `prisma/migrations/20260325000000_add_broadcast_sessions/migration.sql`
- No additional schema migration was required in this pass.

---

## 3. UI Components

- **Broadcast route:** `app/app/league/[leagueId]/broadcast/page.tsx`
  - controls: fullscreen toggle, refresh, previous/next arrows, exit broadcast
  - live behavior: initial load, auto-refresh, session start POST, keyboard left/right navigation
  - query-aware data: reads `sport` and `week` from URL query params and forwards to payload API
  - UX hardening: refresh no longer blanks content; keeps stage rendered while refreshing
  - fullscreen reliability: listens to `fullscreenchange` so Esc/browser fullscreen exits remain in sync
- **Renderer scaling upgrades:**
  - `LiveScoreRenderer`: larger `xl/2xl` headline/score typography, wider grid capacity
  - `StandingsTicker`: larger table typography for big displays
  - `StorylineOverlay` + `RivalriesPanel`: increased spacing and typography for TV readability

---

## 4. Integration Points

- **Launch entry:** `components/app/tabs/OverviewTab.tsx` provides `Launch broadcast` button to `/app/league/[leagueId]/broadcast`.
- **Broadcast APIs:**
  - `GET /api/leagues/[leagueId]/broadcast/payload`
    - validates `sport` and `week`
    - returns full `BroadcastPayload`
  - `POST /api/leagues/[leagueId]/broadcast/session`
    - validates/normalizes `sport`
    - trims `createdBy`
    - persists `BroadcastSession`
- **Data sources:** league/team data via Prisma, matchups via `MatchupFact`, storylines via drama engine, rivalries via rivalry engine.

---

## 5. Audit Findings

| Area | Audited interaction | Result |
|---|---|---|
| Launch | Launch broadcast button | Navigates correctly from Overview to broadcast route. |
| Fullscreen toggle | enter/exit via button + Esc/browser changes | Works and UI state stays synchronized via `fullscreenchange`. |
| Navigation arrows | previous/next | Cycles `matchups -> standings -> storylines -> rivalries` reliably. |
| Exit broadcast | exit button | Returns to league page with `?tab=Overview`. |
| Refresh button | manual refresh | Refetches payload; stage remains visible during refresh (no blank flicker). |
| Auto updates | 30s poll | Continues to update payload while preserving view. |
| Query filters | `sport` + `week` query passthrough | API receives validated query values from page fetch logic. |
| Session tracking | broadcast page open | Session POST is triggered once per page load for analytics persistence. |

---

## 6. QA Findings

- **Automated verification**
  - `npm run typecheck` passed
  - `npx vitest run "__tests__/broadcast-routes-contract.test.ts"` passed (4/4)
- **Route contract coverage**
  - payload query forwarding + sport normalization
  - invalid sport/week rejections (400)
  - session start forwarding with normalized sport + trimmed createdBy
  - session start invalid sport rejection (400)
- **Manual behavior checks (implemented path)**
  - broadcast updates live (poll + manual refresh)
  - navigation arrows and keyboard arrows work
  - fullscreen toggle + escape flow stays in sync
  - large-screen readability improved via component scaling updates

---

## 7. Fixes

- **Engine correctness**
  - Fixed sport fallback in `getBroadcastPayload` so drama/rivalry queries align with league sport when request sport is absent.
  - Reduced rivalry name resolution overhead with precomputed owner-name map.
- **API hardening**
  - Added validation for invalid `sport` and `week` in payload route.
  - Added validation/normalization for `sport` and trimming for `createdBy` in session route.
- **Broadcast page reliability**
  - Added one-time session start POST call.
  - Added `fullscreenchange` sync to avoid fullscreen state drift.
  - Removed refresh blank-state flicker by preserving rendered payload while refreshing.
  - Added keyboard arrow navigation support.
  - Exit now returns to `?tab=Overview`.
- **Big-screen UX**
  - Expanded typography and spacing in all broadcast renderer components for large displays.

---

## 8. Checklist

- [x] Launch button opens broadcast route.
- [x] Fullscreen toggle works; state stays synchronized.
- [x] Navigation arrows cycle all views.
- [x] Refresh button refetches without blanking stage.
- [x] Exit broadcast returns to league overview context.
- [x] Auto-refresh updates every 30s.
- [x] Broadcast payload API validates and returns expected data shape.
- [x] Broadcast session API validates and returns expected session shape.
- [x] UI scaling improved for large displays.
- [x] Broadcast route contract tests added and passing.
- [ ] Optional manual TV/stream smoke pass with real live league data.

---

## 9. Explanation

League Broadcast Mode provides a dedicated, presentation-first league experience for watch parties and streams. The engine consolidates standings, live matchup scores, storylines, and rivalries into one payload, and the broadcast page rotates through those views with fullscreen controls, refresh controls, and keyboard/nav arrow cycling. In this pass, reliability and scale were improved: session starts are now recorded automatically, fullscreen state remains consistent even when browser controls are used, refresh no longer causes stage flicker, and typography/layout were expanded for large-display readability.
