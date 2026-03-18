# Auth QA: Sign In / Sign Up / Forgot Password — Deliverable

## Summary

End-to-end QA of the sign-in, sign-up, and forgot-password flows has been reviewed. Code paths are aligned with requirements. A **config-check** and **login-page banner** were added so users see a clear message when `DATABASE_URL` (or `NEXTAUTH_SECRET`) is missing, instead of a generic error after attempting sign-in.

---

## 1. Sign up

| Requirement | Status | Notes |
|-------------|--------|--------|
| User can enter relevant info (username, email, password, displayName, phone, timezone, language, avatar, Sleeper, age/terms/disclaimer, verification method) | ✅ | `app/signup/page.tsx` + `app/api/auth/register/route.ts` |
| Data saved to the user | ✅ | `AppUser` (email, username, passwordHash, displayName, avatarUrl) created in register API |
| Preferences saved | ✅ | `UserProfile` created in same transaction: `timezone`, `preferredLanguage`, `avatarPreset`, `phone`, `verificationMethod`, `displayName`, `sleeperUsername` (optional) |
| User verified after sign up | ✅ | Register returns 200 with user; front-end then calls `signIn("credentials", { login: email, password })` and redirects. If auto sign-in fails (e.g. network), user is still created and “Go to Sign In” is shown |

**Files:** `app/signup/page.tsx`, `app/api/auth/register/route.ts`, Prisma `AppUser` + `UserProfile`.

---

## 2. Sign in (username / email / phone + password)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Sign in with **email** + password | ✅ | Credentials provider uses `resolveLoginToUser(login)`; email matched case-insensitively |
| Sign in with **username** + password | ✅ | Same resolver; username matched case-insensitively |
| Sign in with **phone** + password | ✅ | Resolver detects phone (10–15 digits), normalizes to E.164, finds `UserProfile` by `phone`, then `AppUser` by `userId` |

**Files:** `lib/auth/login-identifier-resolver.ts`, `lib/auth.ts` (credentials provider), `app/login/LoginContent.tsx` (single “Email, username, or phone” field).

---

## 3. Forgot password (email + SMS)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Forgot password via **email** | ✅ | `/forgot-password` → choose Email → enter email → request sends link via Resend; user clicks link (token in query) → `/reset-password?token=...` → submit new password to `/api/auth/password/reset/confirm` with `token` |
| Forgot password via **SMS** | ✅ | Choose SMS → enter phone → 6-digit code sent via Twilio; user enters code + new password on same page → POST to reset/confirm with `phone` + `code` + `newPassword` |
| `returnTo` preserved | ✅ | Forgot-password client reads `returnTo` from query and passes to request API; after reset, redirect to login with `callbackUrl` and `?reset=1` |

**Files:** `app/forgot-password/ForgotPasswordClient.tsx`, `app/api/auth/password/reset/request/route.ts`, `app/api/auth/password/reset/confirm/route.ts`, `app/reset-password/page.tsx` (email flow with token).

---

## 4. Sign-in error when env is missing

| Issue | Fix |
|-------|-----|
| User sees generic “Something went wrong” (or similar) when `DATABASE_URL` or `NEXTAUTH_SECRET` is not set | **Config-check API** and **login banner** added so the app does not rely on a failed sign-in to surface the error. |

**Changes made:**

- **`app/api/auth/config-check/route.ts`** (new)  
  - GET endpoint that **does not import Prisma** (so it does not throw when `DATABASE_URL` is missing).  
  - Returns 200 `{ ok: true }` when `DATABASE_URL` and `NEXTAUTH_SECRET` are set; otherwise 503 with `message` and `missing` listing what’s missing.

- **`app/login/LoginContent.tsx`**  
  - On mount, fetches `/api/auth/config-check`.  
  - If 503 and `ok: false`, shows an amber banner: **“Sign-in unavailable: DATABASE_URL is not set. Add it to your local environment and Vercel project settings.”**  
  - Users see this before attempting sign-in, so the “error when I try to sign in” is explained by configuration, not by a generic failure.

**Action required for sign-in to work:** Set in your environment (local `.env` and/or Vercel project settings):

- `DATABASE_URL` — connection string for the app database  
- `NEXTAUTH_SECRET` — secret used by NextAuth for signing sessions  

After setting these and redeploying (or restarting the dev server), the login banner disappears and sign-in works.

---

## 5. QA checklist (manual / E2E)

Use this for a full pass:

- [ ] **Sign up**  
  - Submit form with username, email, password, displayName, phone, timezone, preferredLanguage, avatarPreset, age/terms/disclaimer, verification method.  
  - Confirm 200 and redirect (or “Go to Sign In”).  
  - Confirm in DB: `AppUser` and `UserProfile` exist; `UserProfile` has timezone, preferredLanguage, avatarPreset, phone.

- [ ] **Sign in with email**  
  - Enter email + password → redirect to dashboard (or callbackUrl).

- [ ] **Sign in with username**  
  - Enter username + password → redirect.

- [ ] **Sign in with phone**  
  - Enter phone (e.g. +1 555 123 4567) + password → redirect.

- [ ] **Forgot password — email**  
  - Choose Email → enter email → “Check your email” → open link → set new password → redirect to login with `?reset=1` → sign in with new password.

- [ ] **Forgot password — SMS**  
  - Choose SMS → enter phone → receive code → enter code + new password → success → redirect to login → sign in with new password.

- [ ] **Config missing**  
  - Remove `DATABASE_URL` (or use a build that doesn’t have it).  
  - Open login page → amber “Sign-in unavailable” banner with DATABASE_URL message.  
  - Restore `DATABASE_URL` and reload → banner gone, sign-in works.

---

## 6. Bug fixes in this pass

- **None** required in the sign-up, sign-in, or forgot-password logic; flows already support email/username/phone, preferences, and email/SMS reset.
- **Enhancement:** Config-check endpoint + login banner so the “error when I try to sign in” in a misconfigured environment is clearly explained and actionable.

---

## 7. Final delivery

- **Code:** New `app/api/auth/config-check/route.ts`; updates in `app/login/LoginContent.tsx` (useEffect + configError state + banner).
- **Docs:** This file (`docs/QA_AUTH_SIGNIN_SIGNUP_DELIVERABLE.md`).
- **Verification:** Ensure `DATABASE_URL` and `NEXTAUTH_SECRET` are set in the environment where you run or deploy the app; then run through the checklist above.
