# Commissioner Control Center – League Settings & Permissions Audit

**Date:** 2025-03-12  
**Scope:** AllFantasy league commissioner capabilities, existing settings, roles, and admin protections.

---

## 1. Current State

### 1.1 League ownership (commissioner)

- **League model** (`prisma/schema.prisma`): `League.userId` is the league owner. There is no separate `commissionerId`; **commissioner = user who owns the league** (the user who created/imported it).
- **Checks today:** Several APIs restrict by `where: { leagueId, userId }` (e.g. waiver process, waiver claims list, waiver settings), effectively limiting those actions to the league owner. No shared helper exists for "is commissioner."

### 1.2 League fields

- **Editable in DB:** `name`, `scoring`, `status`, `avatarUrl`, `settings` (Json), `rosterSize`, `starters` (Json), `leagueSize`, `isDynasty`, `season`, etc. Many are synced from platform (Sleeper/ESPN); changing them locally may be overwritten by sync.
- **No dedicated:** `description`, `inviteCode` / `inviteLink` on the League model. Can be stored in `settings` (e.g. `settings.description`, `settings.inviteCode`) for commissioner-managed values.
- **Protected:** Historical results live in rosters, league_teams, waiver_transactions, etc. Commissioner actions must not alter past results in violation of tournament/lock rules.

### 1.3 Waiver

- **LeagueWaiverSettings:** `waiverType`, `processingDayOfWeek`, `processingTimeUtc`, `claimLimitPerPeriod`, `faabBudget`, `faabResetDate`, `tiebreakRule`, `lockType`, `instantFaAfterClear`. Stored per league.
- **WaiverClaim:** pending/processed claims; **WaiverPickup:** history of pickups.
- **APIs:**  
  - `GET/POST /api/waiver-wire/leagues/[leagueId]/claims` – list/create claims (GET restricted to owner via `where: { leagueId, userId }`).  
  - `PUT /api/waiver-wire/leagues/[leagueId]/settings` – update waiver settings (owner-only via same check).  
  - `POST /api/waiver-wire/leagues/[leagueId]/process` – run waiver processing (owner or cron via `x-cron-secret`).
- **Preserve:** All existing waiver APIs; commissioner layer can call them or proxy with an explicit commissioner check.

### 1.4 Draft

- **No AllFantasy-owned draft state** in the main League/Roster schema for in-season drafts. Draft data comes from platform (Sleeper draft, etc.) or mock-draft flows.
- **Draft controls** (pause, resume, reset timer, undo pick, assign pick, reorder) would require platform API integration (e.g. Sleeper draft APIs). Not present in codebase today.
- **Recommendation:** Add commissioner **draft control API** that accepts actions (pause, resume, reset_timer, undo_pick, assign_pick) and either calls platform when implemented or returns "not supported" / stub.

### 1.5 Lineup / roster

- **Roster** model: `leagueId`, `platformUserId`, `playerData` (Json). Lineup lock rules and "invalid roster" checks are not centralized in the codebase; they may live in platform sync or UI.
- **Force-correct:** No existing API to force-correct a roster. Commissioner endpoint can stub or delegate to platform when available.
- **Orphan team:** No explicit "orphan" or "seeking replacement" flag on League/LeagueTeam; can be stored in `settings.orphanSeeking`, `settings.orphanDifficulty`, etc.

### 1.6 Chat / broadcast

- **Bracket leagues:** `app/api/bracket/leagues/[leagueId]/chat/route.ts`; messages and reactions exist for bracket product.
- **Shared chat:** `app/api/shared/chat/threads/[threadId]/pin/route.ts` – pin message; platform chat service. League-scoped broadcast (@everyone) and moderation (remove flagged) are not fully wired in the main League (non-bracket) flow.
- **Recommendation:** Commissioner **chat/broadcast API** that can send broadcast, pin announcement, and (when moderation exists) remove message; integrate with existing chat/pin where applicable.

### 1.7 League operations (visibility, dashboard, ranked)

- **No current fields** for "post to public dashboard," "looking for replacement/orphan," "ranked/unranked visibility," or "orphan difficulty description." Can use `settings` Json (e.g. `settings.publicDashboard`, `settings.rankedVisibility`, `settings.orphanSeeking`, `settings.orphanDifficulty`).

### 1.8 Invite links / codes

- **League:** No `inviteCode` or `inviteLink` on main League model. Bracket leagues have join codes. For main leagues, invite is often platform-specific (Sleeper invite link).  
- **Recommendation:** Store commissioner-generated code/link in `settings.inviteCode` or `settings.inviteLink` and allow commissioner to view/regenerate via control center.

### 1.9 Remove manager / transfer commissioner

- **Remove manager:** Would require platform API (e.g. remove from Sleeper league) or local state (e.g. mark roster as "removed"). Not implemented.  
- **Transfer commissioner:** Would require changing `League.userId` to another user; high-impact. Not implemented; can be documented as future (with confirmation and audit).

---

## 2. Security and constraints

### 2.1 What commissioners must not do

- **Bypass global tournament lock rules** – e.g. no editing locked matchups or playoff brackets if a global lock exists.
- **Alter protected historical results** – no deleting or rewriting past waiver transactions, draft results, or final scores for locked periods without an explicit admin/override path (out of scope for commissioner).
- **Access admin-only controls** – admin routes (e.g. `/api/admin/*`) are for site admins only; commissioner checks must never grant admin.
- **Edit outside league scope** – all commissioner actions must be scoped to `leagueId` and allowed only when `League.userId === session.user.id` (or future commissionerId).

### 2.2 Permission model

- **Single commissioner:** League has one owner (`userId`). All commissioner-only routes must verify `league.userId === session.user.id`.
- **Reusable helper:** Introduce `isCommissioner(leagueId, userId)` and `assertCommissioner(leagueId, userId)` (returns 403 if not) so every commissioner route uses the same check.

---

## 3. What to preserve

- **League settings:** Existing `settings` Json and any platform-synced fields; commissioner updates only allowed keys and does not overwrite platform-critical data without design.
- **Waiver:** Existing waiver claim, process, and settings APIs; commissioner layer uses them with commissioner check or proxies.
- **Draft:** Mock-draft and platform draft flows unchanged; commissioner draft controls are additive (stub or platform-wrapped).
- **Chat:** Existing pin/chat services; commissioner broadcast/moderation are additive.
- **Admin:** No change to admin-only routes or checks.

---

## 4. File reference (existing)

| Area        | File(s) |
|------------|---------|
| League     | `prisma/schema.prisma` (League, Roster, LeagueTeam, LeagueWaiverSettings, WaiverClaim, WaiverPickup) |
| Waiver     | `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts`, `process/route.ts`, `settings/route.ts`; `lib/waiver-wire/*` |
| League list | `app/api/league/list/route.ts` |
| League roster | `app/api/league/roster/route.ts` |
| Commissioner check | None (to add) |
| Draft controls | None (to add as stub or platform) |
| Chat       | `app/api/shared/chat/threads/[threadId]/pin/route.ts`, `app/api/app/leagues/[leagueId]/chat/route.ts` |

---

## 5. Summary

- **Commissioner** = league owner (`League.userId`). Add a single permission helper and use it in all commissioner routes.
- **Preserve** existing league, waiver, and chat behavior; add commissioner-only endpoints that either perform allowed edits or stub platform-dependent actions (draft, lineup, remove manager, transfer commissioner).
- **Store** commissioner-only options (invite code, description, orphan seeking, visibility) in `League.settings` to avoid schema churn and keep platform sync safe.
