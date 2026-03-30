# PROMPT 181 — Orphan and Empty Team AI Manager System Deliverable

## Overview

Commissioners can assign an **AI manager** to orphaned or empty teams so those teams participate in **live and mock drafts** (and, when league rules permit, in **trades**). Behavior is **deterministic**, **logged**, and **auditable**; no random actions without reasoning context.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Features

| Feature | Implementation |
|--------|-----------------|
| **Commissioner toggle** | `orphanTeamAiManagerEnabled` in draft UI settings (League.settings `draft_orphan_team_ai_manager_enabled`). Existing Draft Settings panel; no schema change for the toggle. |
| **AI manager drafts for absent team** | When current on-the-clock roster is orphan and setting is on, commissioner can trigger "Run AI pick" or (future) auto-run after timer. |
| **Strategy / brain** | AI uses deterministic draft-helper engine: need, value, format-aware (SF/TE), roster slots; no invented players. |
| **Queue, need, value, format** | Same `computeDraftRecommendation` as draft helper: teamRoster, rosterSlots, round, pick, sport, isDynasty, isSF, mode. |
| **Trade: send, accept, reject, counter** | Deterministic trade route supports `intent=respond` (accept/reject/counter) and `intent=send` (outbound proposal suggestion). Optional safe apply mode can update pending proposals; every action is logged. |
| **Behavior logged/auditable** | All AI manager actions written to `AiManagerAuditLog` (leagueId, rosterId, action, payload, reason, triggeredBy, createdAt). |
| **No random without context** | Draft pick uses only pool + draft state; trade decision uses deterministic rules and safety checks; reasons stored in audit log. |
| **Commissioner sees status** | Draft room: "AI Manager" badge when orphan on clock; "Run AI pick" button for commissioner. Draft Settings: orphan roster count + last action. GET `/api/leagues/[leagueId]/orphan-ai-manager/status` for full status. |

---

## Schema / Settings

- **New table:** `AiManagerAuditLog` (id, leagueId, rosterId, action, payload, reason, triggeredBy, createdAt). Actions: `draft_pick`, `trade_accept`, `trade_reject`, `trade_counter`, `trade_send`.
- **Existing setting:** `orphanTeamAiManagerEnabled` already in `DraftUISettings` and persisted under `draft_orphan_team_ai_manager_enabled` in League.settings.
- **Orphan roster:** Roster with `platformUserId` starting with `orphan-` (set when commissioner removes manager).

---

## Backend

### Routes

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| GET | `/api/leagues/[leagueId]/draft/session` | canAccessLeagueDraft | Session now includes `orphanRosterIds`, `aiManagerEnabled` for client. |
| POST | `/api/leagues/[leagueId]/draft/ai-pick` | Commissioner | Run AI pick for current slot when current roster is orphan; logs and returns updated session. |
| GET | `/api/leagues/[leagueId]/orphan-ai-manager/status` | Commissioner | Orphan roster list, setting, recent audit actions. |
| POST | `/api/leagues/[leagueId]/trade/ai-decision` | Commissioner | Deterministic trade decision for orphan roster; returns decision + reason and logs; does not execute trade. |

### Services

- **`lib/orphan-ai-manager/orphanRosterResolver.ts`**: `isOrphanPlatformUserId(platformUserId)`, `getOrphanRosterIdsForLeague(leagueId)`.
- **`lib/orphan-ai-manager/OrphanAIManagerService.ts`**: `logAction(input)`, `executeDraftPickForOrphan({ leagueId, triggeredByUserId })`, `getRecentAuditEntries(leagueId, options)`.
- **Draft pick flow:** Uses `getPlayerPoolForLeague`, session snapshot (drafted names, current pick), `computeDraftRecommendation`, `submitPick` with source `'auto'`, then `logAction('draft_pick', ...)`.
- **Trade:** Deterministic review uses pick value math (`buildDraftTradeAiReview`) with safety gates (permission, league rules, orphan-only roster, draft in progress). Optional apply path updates pending proposals; send intent can draft/create outbound proposals.

---

## Frontend

### Draft room

- **Top bar:** When current pick’s roster is orphan and AI manager is enabled: "AI Manager" label next to manager name; commissioner sees **"Run AI pick"** button. Click POSTs to `/api/leagues/[leagueId]/draft/ai-pick` and refreshes session.
- **Session:** Client uses `session.orphanRosterIds` and `session.aiManagerEnabled` to drive badge and button.

### Commissioner

- **Draft Settings panel:** Existing "Orphan team AI manager enabled" toggle. When commissioner, panel also shows **Orphan AI status**: orphan roster count and last audit action (from GET orphan-ai-manager/status).

---

## Mandatory Click Audit (QA Checklist)

- [ ] **Enable AI manager toggle:** Commissioner turns on "Orphan team AI manager enabled" in Draft Settings; save; toggle persists and status shows "AI manager will draft for them when on the clock."
- [ ] **AI manager assignment:** Orphan rosters are those with no human (platformUserId = orphan-{id}). Status shows correct count of orphan rosters.
- [ ] **Status displays correctly:** Draft room shows "AI Manager" when an orphan is on the clock; Draft Settings shows orphan count and last action when commissioner.
- [ ] **AI draft picks process correctly:** Commissioner clicks "Run AI pick" when orphan is on clock; pick is submitted with source `auto`, session updates, and audit log has a `draft_pick` entry with reason.
- [ ] **AI trade actions route correctly:** POST to `/api/leagues/[leagueId]/trade/ai-decision` with rosterId (orphan) returns decision and reason and creates an audit log entry; no unsupported/arbitrary execution.
- [ ] **Commissioner controls work:** Pause, resume, reset timer, undo, and Run AI pick all work when permitted; no 403 when commissioner.
- [ ] **No dead AI manager settings:** Toggle, Run AI pick, and status section are wired; errors surfaced (e.g. "Current pick is not an orphan roster").

---

## QA Checklist (concise)

1. Commissioner enables orphan AI manager → setting saves; status reflects it.
2. Orphan roster count and last action visible in Draft Settings (commissioner).
3. When orphan on clock, draft room shows "AI Manager" and commissioner sees "Run AI pick."
4. Run AI pick → pick submitted, session refreshes, audit log has entry.
5. Trade AI decision endpoint returns decision + reason and logs; no platform execution in stub.
6. All commissioner draft controls (including Run AI pick) work; no dead buttons.

---

## Files Touched

- **Schema:** `prisma/schema.prisma` — `AiManagerAuditLog` model; `prisma/migrations/20260349000000_add_ai_manager_audit_log/migration.sql`.
- **Resolver:** `lib/orphan-ai-manager/orphanRosterResolver.ts`, `lib/orphan-ai-manager/index.ts`.
- **Service:** `lib/orphan-ai-manager/OrphanAIManagerService.ts`.
- **API:** `app/api/leagues/[leagueId]/draft/session/route.ts` (session includes orphanRosterIds, aiManagerEnabled), `app/api/leagues/[leagueId]/draft/ai-pick/route.ts`, `app/api/leagues/[leagueId]/orphan-ai-manager/status/route.ts`, `app/api/leagues/[leagueId]/trade/ai-decision/route.ts`.
- **UI:** `components/app/draft-room/DraftTopBar.tsx` (isOrphanOnClock, onRunAiPick, runAiPickLoading; "AI Manager" badge; "Run AI pick" button), `components/app/draft-room/DraftRoomPageClient.tsx` (orphan/orphan status from session, handleRunAiPick), `components/app/settings/DraftSettingsPanel.tsx` (orphan status block: count + last action).
