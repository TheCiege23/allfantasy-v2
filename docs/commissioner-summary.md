# Commissioner Control Center – Summary of Capabilities

## Overview

The Commissioner Control Center gives **league commissioners** (league owners: `League.userId`) a single place to manage league operations safely, without granting admin or bypassing global lock rules.

---

## Capabilities

### 1. League management

- **Edit league** – Name, description (in settings), scoring, status, avatarUrl, rosterSize, leagueSize, starters where allowed.
- **Settings keys** – description, lineupLockRule, publicDashboard, rankedVisibility, orphanSeeking, orphanDifficulty stored in `League.settings`.
- **Invite** – View and regenerate invite code/link (stored in settings).
- **Managers** – List teams and rosters; remove manager is stubbed (use platform).
- **Transfer commissioner** – Not implemented; would require changing `League.userId` with confirmation (future).

### 2. Draft controls

- **Actions** – pause, resume, reset_timer, undo_pick, assign_pick, reorder.
- **Status** – Stub; returns acknowledged. Platform (e.g. Sleeper) integration can be added later.

### 3. Waiver controls

- **View** – Pending claims, processed history, waiver settings.
- **Manual run** – Commissioner can trigger waiver processing (same as existing process route, with commissioner check).
- **Adjust** – Waiver settings (type, processing day/time, FAAB, tiebreak, etc.) via commissioner waivers PUT.

### 4. Lineup / roster

- **Lock rule** – Set lineup lock rule in settings.
- **Invalid rosters** – GET returns placeholder; invalid roster detection can be extended.
- **Force-correct** – Not supported (501); platform-dependent.

### 5. Chat / broadcast

- **Broadcast** – Send @everyone (acknowledged; league chat channel linking pending).
- **Pin** – Pin announcement (use shared chat pin when threadId available).
- **Moderate** – Remove message (501 until moderation rules exist).

### 6. League operations

- **Post to public dashboard** – Set `settings.publicDashboard`.
- **Mark looking for replacement** – Set `settings.orphanSeeking`.
- **Ranked/unranked visibility** – Set `settings.rankedVisibility`.
- **Orphan difficulty** – Set `settings.orphanDifficulty` (description).

---

## Security

- **Commissioner** = league owner only (`League.userId`). No bypass of global tournament lock rules, no altering protected historical results, no access to admin-only controls, no edits outside league scope.
- **Reusable check** – `lib/commissioner/permissions.ts`: `isCommissioner`, `getLeagueIfCommissioner`, `assertCommissioner`.

---

## File List ([NEW] / [UPDATED])

| Path | Label |
|------|--------|
| `docs/commissioner-audit.md` | [NEW] |
| `docs/commissioner-qa-checklist.md` | [NEW] |
| `docs/commissioner-summary.md` | [NEW] |
| `lib/commissioner/permissions.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/check/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/waivers/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/draft/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/lineup/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/chat/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/operations/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/managers/route.ts` | [NEW] |
| `app/api/commissioner/leagues/[leagueId]/invite/route.ts` | [NEW] |
| `components/app/tabs/CommissionerTab.tsx` | [NEW] |
| `components/app/LeagueTabNav.tsx` | [UPDATED] |
| `components/app/LeagueShell.tsx` | [UPDATED] |
| `app/app/league/[leagueId]/page.tsx` | [UPDATED] |

---

## Preserved

- **League settings** – Existing waiver settings, league roster, and platform sync behavior unchanged.
- **Waiver APIs** – `/api/waiver-wire/leagues/[leagueId]/claims`, `process`, `settings` unchanged; commissioner routes are an alternative with explicit commissioner check.
- **Admin** – No change to `/api/admin/*` or admin-only logic.
