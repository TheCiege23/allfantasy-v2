# PROMPT 319 — Role and Permission QA

## Objective

Ensure permissions work correctly across **user**, **commissioner**, and **admin** roles: access restrictions and protected routes are enforced.

---

## Role model

| Role | Scope | Description |
|------|--------|-------------|
| **User** | App-wide | Authenticated via NextAuth session. Can access own data and league features where they are a member. |
| **Commissioner** | Per league | League owner (`League.userId`). Can manage league settings, draft controls, invites, waivers, etc. |
| **Admin** | Platform | Site admin (session cookie or Bearer / `x-admin-secret`). Can access admin APIs and tools. |

---

## How permissions are enforced

### 1. Admin

- **Source of truth:** `lib/adminAuth.ts`
- **Helpers:** `requireAdmin()`, `isAuthorizedRequest(request)`, `adminUnauthorized()`
- **Usage:** Admin API routes call `const gate = await requireAdmin()` and return `gate.res` when `!gate.ok`.
- **Auth methods:** Admin session cookie, or `Authorization: Bearer <ADMIN_PASSWORD>`, or `x-admin-secret` / `x-cron-secret` header (for server-to-server).

**Protected routes:** All routes under `app/api/admin/*` should use `requireAdmin()` (or `requireAdminOrBearer` where documented). Audited routes use it consistently.

### 2. Commissioner

- **Source of truth:** `lib/commissioner/permissions.ts`
- **Helpers:** `isCommissioner(leagueId, userId)`, `assertCommissioner(leagueId, userId)`, `getLeagueIfCommissioner(leagueId, userId)`
- **Usage:** After `getServerSession` and `userId`, call `assertCommissioner(leagueId, userId)` in a try/catch and return 403 on throw.

**Protected routes:** Commissioner-only actions live under:

- `app/api/commissioner/*` (broadcast, leagues list, and per-league commissioner endpoints)
- League-scoped write actions that change league/draft/settings (e.g. `PATCH` draft settings, privacy, AI settings, draft controls, import commit, divisions create, etc.)

All audited commissioner routes use session + `assertCommissioner` (or per-league check in broadcast).

### 3. League member (draft / league access)

- **Source of truth:** `lib/live-draft-engine/auth.ts`
- **Helpers:** `canAccessLeagueDraft(leagueId, userId)`, `canSubmitPickForRoster(leagueId, userId, rosterId)`, `getCurrentUserRosterIdForLeague(leagueId, userId)`
- **Usage:** After `getServerSession`, require `canAccessLeagueDraft(leagueId, userId)` for read/write to draft session, queue, chat, events, pick submission, etc. Use `canSubmitPickForRoster` when the action is scoped to a specific roster (e.g. submit pick).

**Protected routes:** All league-scoped routes under `app/api/leagues/[leagueId]/...` that expose draft or league data must require session and then either:

- **League access:** `canAccessLeagueDraft(leagueId, userId)` for member-only or commissioner+member routes, or
- **Commissioner only:** `assertCommissioner(leagueId, userId)` for commissioner-only writes.

---

## Access restrictions summary

- **Unauthenticated:** No access to user/commissioner/admin APIs; return 401.
- **User (authenticated):** Can access own profile, leagues where they have a roster or are commissioner, and draft/session/queue/chat for those leagues. Cannot call admin APIs or perform commissioner-only actions for leagues they don’t own.
- **Commissioner:** Same as user, plus league settings, draft controls, invites, waivers, broadcast, etc. for leagues they own. Still no admin access unless also admin.
- **Admin:** Full access to admin APIs. No automatic commissioner rights; admin must have a session (or Bearer/header) for admin routes only.

---

## Protected route patterns (checklist for new routes)

1. **Admin-only**
   - Use `requireAdmin()` (or documented alternative) and return `gate.res` when `!gate.ok`.

2. **Commissioner-only (league-scoped)**
   - `getServerSession` → 401 if no user.
   - Resolve `leagueId` from params (or body where appropriate).
   - `assertCommissioner(leagueId, userId)` in try/catch → 403 on throw.
   - Then perform action.

3. **League member (read/write draft, session, queue, chat, etc.)**
   - `getServerSession` → 401 if no user.
   - `canAccessLeagueDraft(leagueId, userId)` → 403 if false.
   - For pick submission or roster-specific actions, also enforce `canSubmitPickForRoster(leagueId, userId, rosterId)` when applicable.

4. **League member read + commissioner-only write (e.g. settings GET vs PATCH)**
   - GET: session + `canAccessLeagueDraft` (members can read).
   - PATCH: session + `assertCommissioner` (only commissioner can update).

---

## Permission fixes applied (PROMPT 319)

### 1. `app/api/invite/generate/route.ts` — league invite creation

- **Issue:** Any authenticated user could create a league invite for any league by passing `type: 'league'` and `targetId: <leagueId>`; the invite engine did not check commissioner.
- **Fix:** When `type === 'league'`, require `targetId` (leagueId) and call `assertCommissioner(leagueId, userId)`. Return 400 if `targetId` missing, 403 if not commissioner.

### 2. `app/api/leagues/[leagueId]/divisions/create/route.ts` — create division

- **Issue:** Route had no auth; any caller could create a division for any league.
- **Fix:** Require session (401 if no user), then `assertCommissioner(leagueId, userId)` (403 if not commissioner). Then create division as before.

---

## Verification summary

- **User vs commissioner vs admin:** Enforced via session + `canAccessLeagueDraft` / `assertCommissioner` / `requireAdmin` as above.
- **Access restrictions:** League data and draft actions gated by league membership or commissioner; admin actions gated by `requireAdmin()`.
- **Protected routes:** Sample of league, commissioner, and admin routes audited; two permission bugs fixed. Remaining league/commissioner routes follow the patterns above.

---

## Optional follow-ups

- **Admin backfill:** `app/api/admin/platform/backfill-core/route.ts` uses `resolveAdminEmail(session?.user?.email)` instead of `requireAdmin()`. Consider switching to `requireAdmin()` for consistency and to support Bearer/header admin auth.
- **Draft notify:** `app/api/leagues/[leagueId]/draft/notify/route.ts` allows any league member (via `canAccessLeagueDraft`) to send draft notification events (e.g. draft_paused, draft_resumed). If only the commissioner should trigger broadcast-style events, restrict those event types to commissioner (e.g. check `isCommissioner` for `BROADCAST_EVENTS`).

---

## Reference files

- Admin: `lib/adminAuth.ts`
- Commissioner: `lib/commissioner/permissions.ts`
- League draft / member access: `lib/live-draft-engine/auth.ts`
- General auth: `lib/auth-guard.ts` (`requireAuth`, `requireVerifiedUser`)
