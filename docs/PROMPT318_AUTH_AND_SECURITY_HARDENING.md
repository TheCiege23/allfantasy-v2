# PROMPT 318 — Auth and Security Hardening

## Objective

Secure the platform by validating auth, enforcing roles, protecting APIs, validating input, and applying rate limits.

---

## What Was Checked

### JWT validation

- **NextAuth:** Session strategy is JWT (`session.strategy: "jwt"`). Secret is required via `getAuthSecret()` (throws if `NEXTAUTH_SECRET` is not set). Token is signed and verified by NextAuth with that secret. Session callback passes `token.id` to `session.user.id` for use in API routes.
- **Admin session:** Custom HMAC-signed cookie (not JWT). `verifyAdminSessionCookie` uses `adminSessionSecret()` with timing-safe signature comparison and expiry check. **Hardening applied:** In production, `adminSessionSecret()` now throws if neither `ADMIN_SESSION_SECRET` nor `ADMIN_PASSWORD` is set, so no admin session is accepted or issued without a configured secret.

### Role-based access

- **Admin:** `requireAdmin()` and `isAuthorizedRequest()` in `lib/adminAuth.ts` verify admin session or Bearer/`x-admin-secret` with timing-safe compare. Admin allow-list via `ADMIN_EMAILS` and role check.
- **Commissioner:** `assertCommissioner(leagueId, userId)` and `getLeagueIfCommissioner()` in `lib/commissioner/permissions.ts` enforce league ownership (`League.userId === userId`). Used by draft controls, invite, settings, etc.
- **League access:** Routes under `leagues/[leagueId]` use `canAccessLeagueDraft(leagueId, userId)` or similar to ensure the user has access (commissioner or roster member).

### API protection

- **Authenticated routes:** Most sensitive routes call `getServerSession(authOptions)` and return 401 when `!session?.user?.id`. `lib/auth-guard.ts` provides `requireVerifiedUser()` (session + verification + age) and now **`requireAuth()`** (session only) for consistent 401 responses.
- **Admin routes:** Use `requireAdmin()` or `isAuthorizedRequest()` before handling.
- **Commissioner-only:** Use `assertCommissioner(leagueId, userId)` after getServerSession.

### Input validation

- **Existing:** Many API routes use Zod (`request.json()` then `Schema.parse()` or `safeParse()`). Register and other auth flows validate length, format, and profanity.
- **Added:** `lib/security/input.ts` provides `parseJsonBodySafe(request, { maxBytes })` to enforce a body size limit (default 1MB) and safe JSON parsing, returning 413 or 400 on failure. Use for sensitive or heavy POST bodies.

### Rate limiting

- **Existing:** `lib/rate-limit.ts` with `consumeRateLimit`, `rateLimit`, `getClientIp`. Used on register (signup), waiver-ai, trade-finder, AI routes (via ai-protection), feedback, etc.
- **Added:** NextAuth sign-in is rate limited. `POST /api/auth/*` (signin/callback) is wrapped: 10 requests per minute per IP via `consumeRateLimit` (scope `auth`, action `signin`). Returns 429 with `Retry-After` when exceeded.

---

## Security Fixes Applied

| Area | Fix |
|------|-----|
| **Admin session** | In production, `adminSessionSecret()` throws if `ADMIN_SESSION_SECRET` and `ADMIN_PASSWORD` are both unset. `verifyAdminSessionCookie()` catches and returns `null` so no session is accepted; `signAdminSessionCookie()` will throw so no cookie is issued until env is set. |
| **requireAuth** | New `requireAuth()` in `lib/auth-guard.ts` returns `{ ok: true, userId, session }` or `{ ok: false, response: NextResponse }` (401). Use in API routes that only need “logged in” (no verification/age check). |
| **Auth rate limit** | NextAuth route (`app/api/auth/[...nextauth]/route.ts`) wraps `POST`: 10 sign-in attempts per IP per minute; 429 when exceeded. |
| **Input size** | `lib/security/input.ts`: `parseJsonBodySafe(req, { maxBytes })` (default 1MB) and `MAX_JSON_BODY_BYTES`. Use in routes that want to reject oversized JSON. |

---

## Files Touched

| Path | Change |
|------|--------|
| `lib/adminSession.ts` | Production requires `ADMIN_SESSION_SECRET` or `ADMIN_PASSWORD`; `adminSessionSecret()` throws otherwise; `verifyAdminSessionCookie` catches and returns `null`. |
| `lib/auth-guard.ts` | Added `requireAuth()` for simple “must be logged in” API protection. |
| `app/api/auth/[...nextauth]/route.ts` | Rate limit on POST (signin/callback): 10/min per IP, 429 with Retry-After. |
| `lib/security/input.ts` | New. `parseJsonBodySafe`, `MAX_JSON_BODY_BYTES`. |
| `lib/security/index.ts` | New. Re-exports. |
| `docs/PROMPT318_AUTH_AND_SECURITY_HARDENING.md` | This deliverable. |

---

## Recommendations

- **New API routes:** Use `requireAuth()` or `requireVerifiedUser()` from `lib/auth-guard` and, for league-scoped data, `canAccessLeagueDraft` or `assertCommissioner` as appropriate. Validate request body with Zod and optionally `parseJsonBodySafe` for size.
- **Admin:** Ensure `ADMIN_SESSION_SECRET` or `ADMIN_PASSWORD` is set in production so admin login and session verification work.
- **Sensitive POSTs:** Consider `parseJsonBodySafe(req, { maxBytes: 512 * 1024 })` (or similar) before parsing with Zod to avoid oversized payloads.

---

## Summary

- **JWT:** NextAuth JWT validated with required secret; admin session is HMAC-signed with production-only secret requirement.
- **RBAC:** Admin and commissioner checks in place; `requireAuth()` added for consistent API protection.
- **API protection:** Existing session and league checks; new helper for “require logged in.”
- **Input validation:** Zod widely used; optional body size limit via `parseJsonBodySafe`.
- **Rate limiting:** Sign-in rate limited; other high-value routes already use rate limits.
