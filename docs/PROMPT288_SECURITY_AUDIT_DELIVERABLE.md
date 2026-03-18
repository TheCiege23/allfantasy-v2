# PROMPT 288 — Security and Permissions Audit

**Objective:** Protect system.  
**Scope:** Auth, roles, API security, data access.  
**Date:** 2025-03-17

---

## Summary (quick reference)

| Area | Mechanism | Notes |
|------|------------|--------|
| **Auth (app)** | NextAuth JWT, `getServerSession(authOptions)` | NEXTAUTH_SECRET required; 30-day session; credentials + Google + Sleeper. |
| **Auth (admin)** | `admin_session` cookie or Bearer / x-admin-secret | `requireAdmin()` or `requireAdminOrBearer(request)`; ADMIN_EMAILS, ADMIN_PASSWORD. |
| **Roles** | Resource-based (no stored user role) | Commissioner = League.userId; admin = allowlist or cookie role. |
| **League/draft access** | `canAccessLeagueDraft(leagueId, userId)` or `assertCommissioner` | Member = has roster; commissioner = league owner. |
| **API protection** | Per-route; no global middleware | Each route checks session or admin/cron secret. |
| **Rate limiting** | `lib/rate-limit.ts` (in-memory) | Used on auth, AI, import, legacy; not all routes. |
| **Data access** | Session user id + league/roster checks | User data by session; league by canAccessLeagueDraft or assertCommissioner. |

---

## 1. Authentication

### 1.1 NextAuth (primary)

- **Config:** `lib/auth.ts` — `authOptions` with JWT strategy, 30-day session, sign-in page `/login`, error page `/auth/error`.
- **Secret:** `NEXTAUTH_SECRET` required; used for signing.
- **Providers:**
  - **Credentials (password):** `resolveLoginToUser(login)` (email/username/phone), bcrypt password check. Handles Sleeper-only and missing-password cases.
  - **Credentials (Sleeper):** Lookup by Sleeper username; create or update `AppUser`; no password.
  - **Google:** When `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` set.
- **Session:** JWT; `session.user.id` set from token. Used across app and API via `getServerSession(authOptions)`.
- **Events:** On sign-in, upserts `UserProfile` for `user.id`.

**QA:** Ensure `NEXTAUTH_SECRET` is set and not exposed. Use HTTPS in production. Prefer strong passwords and consider MFA for admin accounts.

### 1.2 Admin auth (separate surface)

- **Admin UI:** `app/admin/page.tsx` — Uses `admin_session` cookie (via `getMe()` / `verifyAdminSessionCookie`). Redirects to `/login?next=/admin` if no session, and to `/` if not admin.
- **Admin “is admin” check:** `isAdmin(me)` = `role === "admin"` or email in `ADMIN_EMAILS` (env, comma-separated, trimmed, lowercased).
- **Admin API auth:** `lib/adminAuth.ts`:
  - **`requireAdmin()`** — Requires `admin_session` cookie; validates via `verifyAdminSessionCookie`; allows if `role === "admin"` or `isAdminEmailAllowed(email)`.
  - **`requireAdminOrBearer(request)`** — Allows (1) `Authorization: Bearer <token>` where token equals `ADMIN_PASSWORD`, or (2) `x-admin-secret` / `x-cron-secret` equal to `BRACKET_ADMIN_SECRET` or `ADMIN_PASSWORD`; otherwise falls back to `requireAdmin()`.
- **Admin allowlist:** `ADMIN_EMAILS`; `lib/auth/admin.ts` exports `resolveAdminEmail(email)` (same allowlist).

**Inconsistency:** `app/api/admin/platform/backfill-core/route.ts` uses NextAuth `getServerSession` + `resolveAdminEmail(session?.user?.email)` (no `admin_session`). Still restricted to allowlisted emails but different mechanism; consider aligning with `requireAdmin()` for consistency.

**QA:** Restrict `ADMIN_EMAILS` and `ADMIN_PASSWORD`; do not expose Bearer/admin secret to frontend. Use admin magic-link or dedicated admin login that sets `admin_session`.

### 1.3 Legacy / alternate auth

- **`lib/api-auth.ts`** — Cookie-based session `af_session` (signed with `SESSION_SECRET`, 7-day TTL). Used by some legacy API routes (`requireAuthOrOrigin`, `requireAuth`). Origin check: `validateRequestOrigin(req)` allows production origins (allfantasy.ai / allfantasy.app) or dev.
- **Cron / internal:** Several routes accept `x-cron-secret` or `x-admin-secret` (e.g. `LEAGUE_CRON_SECRET`, `CRON_SECRET`, `BRACKET_CRON_SECRET`, `WAREHOUSE_CRON_SECRET`, `BRACKET_ADMIN_SECRET`). Used by cron jobs and internal callers.

**QA:** Keep `SESSION_SECRET` and cron/admin secrets server-side only; use different values per environment.

---

## 2. Roles and authorization

### 2.1 End-user roles

- **No stored “role” for normal users** in the reviewed flow — authorization is resource-based (league member, commissioner, etc.).
- **Admin:** Determined by (1) `admin_session` payload `role === "admin"` or (2) email in `ADMIN_EMAILS`. Used for UI (admin nav, `/admin` redirect) and for admin API gates.

### 2.2 Commissioner (league-scoped)

- **Definition:** League owner = `League.userId` (`lib/commissioner/permissions.ts`).
- **Helpers:** `isCommissioner(leagueId, userId)`, `getLeagueIfCommissioner(leagueId, userId)`, `assertCommissioner(leagueId, userId)` (throws 403 if not).
- **Usage:** Commissioner-only API routes call `assertCommissioner(leagueId, userId)` after resolving `userId` from session, e.g.:
  - `app/api/commissioner/leagues/[leagueId]/route.ts`, `operations`, `transfer`, `reset`, `lineup`, `waivers`, `settings`, `invite`, `draft/route.ts`, etc.
  - `app/api/leagues/[leagueId]/draft/settings/route.ts` (PATCH), `draft/ai-pick/route.ts`, `waiver-wire/leagues/[leagueId]/settings/route.ts` (commissioner-only writes).

**QA:** Ensure every commissioner action that mutates league/draft/waiver uses `assertCommissioner` (or equivalent) with the league from the path/body, not from client-only input.

### 2.3 League / draft access (member or commissioner)

- **`lib/live-draft-engine/auth.ts`:**
  - **`canAccessLeagueDraft(leagueId, userId)`** — True if user is commissioner or has a roster in the league (`Roster` where `leagueId` + `platformUserId === userId`).
  - **`canSubmitPickForRoster(leagueId, userId, rosterId)`** — Commissioner or owner of `rosterId` in that league.
  - **`getCurrentUserRosterIdForLeague(leagueId, userId)`** — Returns current user’s roster id or null.
- **Usage:** All league/draft read and submit flows that should be member-or-commissioner scoped use `canAccessLeagueDraft` (and where needed `canSubmitPickForRoster`), e.g. draft session, queue, pick, chat, trade proposals, auction bid/nominate, keepers, events, etc. Shared chat for `league:leagueId` also uses `canAccessLeagueDraft` for main-league fallback.

**QA:** For any new league/draft endpoint, ensure it resolves `leagueId` from path (or validated input) and calls `canAccessLeagueDraft` or `assertCommissioner` as appropriate.

---

## 3. API security

### 3.1 Auth enforcement

- **Pattern:** Most app API routes that need a user call `getServerSession(authOptions)` and return 401 if `!session?.user?.id` (or equivalent). Count of routes using this pattern is large (100+ under `app/api`).
- **Admin routes:** Under `app/api/admin/*`, routes consistently use `requireAdmin()` or `requireAdminOrBearer(request)` and return 401 on failure. One exception: `admin/platform/backfill-core` uses NextAuth + `resolveAdminEmail` (see above).
- **Cron/internal:** Routes under `app/api/cron/*` and some job-triggered endpoints check `x-cron-secret` or `x-admin-secret` against env-backed secrets.

**Admin routes without requireAdmin (verify intent):** `GET/POST /api/admin/ai-issues` (list/create AI issues), `GET /api/admin/api-status` (API health), `POST /api/admin/usage/log` (client usage logging) do not call `requireAdmin()`. Add admin gate if intended admin-only; otherwise document as intentionally public.

**Gap:** There is **no global middleware** (e.g. `middleware.ts`) enforcing auth for `/api` or for protected paths. Protection is per-route. Risk: new API routes can be added without auth; mitigate with review and a short checklist (e.g. “session or cron secret?”).

### 3.2 Origin / CORS

- **`lib/api-auth.ts`:** `validateRequestOrigin(req)` allows listed origins (allfantasy.ai, allfantasy.app) or dev. Used by legacy `requireAuth` / `requireAuthOrOrigin`. NextAuth and most API routes do not re-validate origin; Next.js same-origin and cookie policies apply.

**QA:** If you add public API usage from other domains, configure CORS and/or origin allowlist explicitly.

### 3.3 Rate limiting

- **`lib/rate-limit.ts`** — In-memory store; `rateLimit(key, maxRequests, windowMs)` and `consumeRateLimit({ scope, action, sleeperUsername?, ip?, ... })` with per-key windows.
- **Applied on:** Signup, password-reset request, verify-email send, phone check, league sync, waiver AI, trade feedback, legacy AI/trade/insights/share/rank/import/session and other legacy routes, instant trade, improve-trade, trade-evaluator, AI chat, etc. Limits vary (e.g. 5/10 min, 5/10 min window).
- **Limitation:** In-memory rate limits do not persist across serverless instances; for strict global limits consider a shared store (e.g. Redis).

**QA:** Sensitive and expensive endpoints (auth, AI, import) should have rate limits; document expected limits and 429 behavior for clients.

### 3.4 Input validation

- No single shared validation framework observed. Routes validate body/query as needed (e.g. `leagueId`, `paymentType`, amount). Stripe webhooks verify signature (`getStripeClient()` + event signing). Admin/cron rely on secret headers.
- **Recommendation:** For sensitive actions (payments, role changes, bulk ops), validate types and bounds (e.g. leagueId format, amount ranges) and reject early with 400.

### 3.5 Secrets and env

- **Required / used:** `NEXTAUTH_SECRET`, `SESSION_SECRET`, `ADMIN_EMAILS`, `ADMIN_PASSWORD`, `BRACKET_ADMIN_SECRET`, `STRIPE_*`, `CRON_SECRET`, `LEAGUE_CRON_SECRET`, `BRACKET_CRON_SECRET`, `WAREHOUSE_CRON_SECRET`, etc. All should be server-only and not logged or sent to client.

---

## 4. Data access

### 4.1 User data

- **Own data:** Routes that return or update “current user” data use `session.user.id` (or equivalent) from `getServerSession` and filter by it (e.g. profile, wallet, tokens, entitlement, referrals, alerts).
- **Other users:** Admin APIs (e.g. users list, user by id, reset password, moderation) are gated by `requireAdmin()`. Normal users should not have APIs that return arbitrary users’ PII without admin or resource-based permission.

**QA:** Audit any endpoint that accepts `userId` or `email` and returns PII; ensure it is admin-only or scoped to the session user.

### 4.2 League and roster data

- **League-scoped reads/writes:** Access controlled by `canAccessLeagueDraft(leagueId, userId)` (member or commissioner) or `assertCommissioner(leagueId, userId)` (commissioner only). League id comes from path or validated body.
- **Roster-scoped:** Draft pick submission and trade proposals use `canSubmitPickForRoster` or roster ownership checks so users cannot submit picks for other rosters (except commissioner where intended).

**QA:** Ensure no route returns another user’s private league/roster data without checking membership or commissioner.

### 4.3 Bracket / bracket league

- **Bracket payments and entries:** Use `leagueId_userId` and session user id for bracket leagues; membership checks (e.g. `bracketLeagueMember`) used where applicable.
- **Bracket Stripe:** Checkout and webhooks tied to user and league; existing payment checks prevent duplicate completed payment.

### 4.4 Admin and system

- **Admin-only data:** Dashboard, signups, questionnaire, feedback, users, leagues, moderation, analytics, config, system health, etc., are behind `requireAdmin()` or equivalent. Audit logs (e.g. `AdminAuditLog`) should be written for sensitive admin actions and only readable by admin.

**QA:** Confirm no admin-only list or detail endpoint is callable without admin auth (cookie or Bearer/secret).

---

## 5. Checklist (high level)

- [ ] **Auth:** NextAuth secret and session config correct; admin allowlist and secrets restricted and not exposed.
- [ ] **Admin:** All `/api/admin/*` routes use `requireAdmin()` or equivalent; admin UI requires admin session and redirects if not admin.
- [ ] **Commissioner:** All commissioner mutations use `assertCommissioner(leagueId, userId)` with server-resolved league id.
- [ ] **League/draft:** All league/draft access uses `canAccessLeagueDraft` or commissioner check; pick/submit uses `canSubmitPickForRoster` where appropriate.
- [ ] **Cron:** Cron/internal routes require correct `x-cron-secret` / `x-admin-secret` and env-backed secrets.
- [ ] **Rate limiting:** Critical and expensive endpoints (auth, AI, import) rate-limited; consider shared store for multi-instance deployments.
- [ ] **Input:** Sensitive actions validate input (types, bounds, ownership) and return 400 on invalid.
- [ ] **Data access:** No PII or private league data returned without auth and resource-level permission; admin-only data behind admin auth.
- [ ] **New routes:** Review checklist for new API routes: auth (session vs cron vs public), role (admin/commissioner/member), and data scope.

---

## 6. Recommendations

1. **Middleware (optional):** Add a small `middleware.ts` that, for example, only sets headers or blocks obviously invalid paths; keep detailed auth in routes to avoid bypasses and keep flexibility.
2. **Unify admin API auth:** Prefer a single pattern for admin APIs (e.g. all use `requireAdmin()` or all use NextAuth + `resolveAdminEmail`) and document it; align `admin/platform/backfill-core` with that pattern.
3. **Audit logging:** Ensure sensitive admin and commissioner actions (user ban, password reset, league reset, config change) write to `AdminAuditLog` (or equivalent) with admin user id and action/target.
4. **Rate limit storage:** For production at scale, move rate limit state to a shared store (e.g. Redis) so limits apply across instances.
5. **Explicit public API list:** Document which routes are intentionally unauthenticated (e.g. discover, blog by slug, health) so new routes default to “auth required” in review.
