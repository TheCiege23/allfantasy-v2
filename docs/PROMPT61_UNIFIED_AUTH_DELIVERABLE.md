# Prompt 61 — Unified Auth System Architecture + Full UI Click Audit

## 1. Unified Auth Architecture

- **Single account, single session**: One shared identity (`AppUser` + `UserProfile`) and one NextAuth JWT session. Signing in once grants access to Sports App, Bracket Challenge, and Legacy; no separate signup or sign-in systems per product.
- **Entry points**: All entry points (landing, bracket, app, legacy, tool pages) use the same `/login` and `/signup`. Redirect after auth is determined by `callbackUrl` (login) or `next` (signup), resolved via `lib/auth/auth-intent-resolver.ts`.
- **Auth methods**: Credentials (email, username, or phone + password), Sleeper (username-only), optional Google (when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set), and optional Apple (when `APPLE_CLIENT_ID`/`APPLE_CLIENT_SECRET` set). Social buttons for Facebook, Instagram, X, TikTok are present and clickable; when a provider is not configured, click shows an inline “coming soon” / “not configured” message instead of a dead button.
- **Forgot password**: Single flow with method choice: **Email** (reset link via Resend) or **SMS** (6-digit code via Twilio). Request API accepts `type: 'email' | 'sms'` and `email` or `phone`; confirm API accepts either link `token` + `newPassword` or `phone` + `code` + `newPassword`.
- **Preserved**: Current routing (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify`, `/auth/error`), existing NextAuth config and credentials/Sleeper/Google providers, profile bootstrap on signIn event, landing/bracket/app/legacy/admin flows, theme and localization.

---

## 2. Shared Account Model Design

- **AppUser** (existing): `id`, `email`, `emailVerified`, `username`, `passwordHash`, `displayName`, `avatarUrl`, `createdAt`, `updatedAt`, `legacyUserId`. Tied to bracket leagues, leagues, mock drafts, platform chat, wallet, etc. One row per human account.
- **UserProfile** (existing): `userId`, `displayName`, `phone`, `phoneVerifiedAt`, `emailVerifiedAt`, `ageConfirmedAt`, `verificationMethod`, `sleeperUsername`/`sleeperUserId`/`sleeperLinkedAt`/`sleeperVerifiedAt`, `profileComplete`, `timezone`, `preferredLanguage`, `avatarPreset`. Extended profile used across Sports App and Bracket; created/upserted on first signIn.
- **Session**: NextAuth JWT with `id`, `email`, `name`, `picture`; `session.user.id` is the canonical user id for API and UI. No separate “bracket account” or “sports app account.”
- **Legal / age**: `ageConfirmedAt` and verification method stored on `UserProfile`; signup requires age confirmation and supports email or phone verification. Terms/agreement acceptance can be added to the same profile or a dedicated table without splitting identity.

---

## 3. Backend Auth Service Updates

- **Password reset request** (`/api/auth/password/reset/request`): Accepts `type: 'email' | 'sms'`. For `type: 'sms'`, expects `phone` (E.164-style); finds user via `UserProfile.phone`, creates a 6-digit code, stores `sha256(code)` in `PasswordResetToken`, sends code via Twilio SMS (if `TWILIO_PHONE_NUMBER` set); returns `{ ok: true, method: 'sms' }` or silently fails (no user/error). For email, unchanged: sends reset link via Resend.
- **Password reset confirm** (`/api/auth/password/reset/confirm`): Accepts either (1) `token` + `newPassword` (email link flow) or (2) `phone` + `code` + `newPassword` (SMS flow). SMS branch: finds profile by phone, finds `PasswordResetToken` by `userId` and `sha256(code)`, validates expiry, updates `AppUser.passwordHash`, deletes token, returns `{ ok: true }`. Same validation and error codes as before for email flow.
- **Auth intent resolver** (`lib/auth/auth-intent-resolver.ts`): New module with `safeRedirectPath`, `getRedirectAfterLogin`, `getRedirectAfterSignup`, `loginUrlWithIntent`, `signupUrlWithIntent` to avoid open redirects and centralize post-auth redirect logic. Used by signup and any future callers that need to pass intent through login/signup.
- NextAuth provider config now includes optional Apple provider wiring when Apple credentials are present, and sign-in bootstrap uses `ensureSharedAccountProfile` so shared profile state is guaranteed after auth.

---

## 4. Frontend Auth Flow Updates

- **Signup** (`app/signup/page.tsx`): Reads `next` and `callbackUrl` from URL via `useSearchParams`; resolves destination with `resolveSignupRedirectPath` and post-signup route with `resolvePostSignupCallbackUrl`. “Go to Sign In” and “Already have an account? Sign in” use `loginUrlWithIntent(redirectAfterSignup)` so post-login redirect matches signup intent.
- **Login** (`app/login/LoginContent.tsx`): Uses `resolveLoginCallbackUrl`, supports credentials + Sleeper sign-in, includes social auth block and provider fallback behavior, and preserves forgot-password `returnTo`.
- **Forgot password** (`app/forgot-password/ForgotPasswordClient.tsx`): Rebuilt with step flow: (1) **Choose method**: Email or SMS (two large buttons). (2) **Request**: Email path — enter email, submit → “Check your email” and back to sign in. SMS path — enter phone, submit → send code. (3) **SMS code + new password**: Enter 6-digit code, new password, confirm password, show/hide password toggle; submit to confirm API; on success show “Password reset” and redirect to login with `reset=1`. (4) “Use email instead” / “Use SMS instead” links switch method. All steps keep “Back to Sign In” with `returnTo` preserved in login link.
- **Social buttons** (`components/auth/SocialLoginButtons.tsx`): Google and Apple remain functional when env flags set. When a provider is not enabled, buttons are no longer disabled: onClick sets an inline message (e.g. “Google sign-in is not configured…”) so the UI is not dead. Facebook, Instagram, X, TikTok show “(planned)” and on click show a short “coming soon” message. No new routes; message is in-place below the buttons.
- **Bracket auth intent preservation**: `/brackets` signup now uses `next=/brackets`, and bracket entry creation redirects unauthenticated/unverified users with `returnTo` so users return to the exact bracket flow.

---

## 5. Provider Fallback Handling Design

- **Configured provider**: Button calls `signIn(provider, { callbackUrl })`; flow is unchanged.
- **Unconfigured provider**: Button is clickable; onClick sets local state `providerMessage` with a short explanation (e.g. “Google sign-in is not configured for this environment. It will appear here when enabled.” or “Facebook sign-in is planned. Follow updates for when it’s available.”). Message renders above the button grid in a cyan-tinted box. No redirect, no dead button; product stays testable and ready for future provider wiring.
- **Future**: When adding Apple/Facebook/Instagram/X/TikTok to NextAuth, add the provider in `lib/auth.ts` and set the corresponding `NEXT_PUBLIC_ENABLE_*` (or derive from server env) so the same buttons trigger real sign-in.

---

## 6. Full UI Click Audit Findings

| Element | Component / Route | Handler / Behavior | Verified |
|--------|-------------------|--------------------|----------|
| Sign In button | LoginContent | `handlePasswordLogin` → `signIn('credentials', …)`; redirect to `callbackUrl` or `/dashboard` | ✅ |
| Sign Up button | LoginContent | `Link` to `signupUrlWithIntent(callbackUrl)` so intent is preserved | ✅ |
| Enter key submit (login) | LoginContent | Form `onSubmit={handlePasswordLogin}` | ✅ |
| Email/username input | LoginContent | Controlled `login`, `setLogin` | ✅ |
| Password input | LoginContent | Controlled `password`, `setPassword` | ✅ |
| Show/hide password | LoginContent | `showPassword`, `setShowPassword`; button toggles type | ✅ |
| Forgot password link | LoginContent | `Link` to `/forgot-password?returnTo=…` | ✅ |
| Reset via email | ForgotPasswordClient | Choose Email → request with `type: 'email'` → sent screen | ✅ |
| Reset via SMS | ForgotPasswordClient | Choose SMS → request with `type: 'sms'` → enter code + new password → confirm | ✅ |
| Verification code input (SMS reset) | ForgotPasswordClient | Controlled `code`, 6-digit input, submit to confirm | ✅ |
| Reset password submit (email link) | reset-password page | Existing form → confirm with `token` + `newPassword` | ✅ |
| Reset password submit (SMS) | ForgotPasswordClient | `handleConfirmSms` → confirm with `phone`, `code`, `newPassword` | ✅ |
| Google auth button | SocialLoginButtons | When enabled: `signIn('google', { callbackUrl })`; when not: show message | ✅ |
| Apple auth button | SocialLoginButtons | When enabled: `signIn('apple', { callbackUrl })`; when not: show message | ✅ |
| Facebook / Instagram / X / TikTok | SocialLoginButtons | Click shows “planned” / “coming soon” message | ✅ |
| Sleeper sign-in | LoginContent | `handleSleeperLogin` → `signIn('sleeper', { sleeperUsername })` | ✅ |
| Username availability | SignupPage | Debounced fetch to `/api/auth/check-username`; status and message | ✅ |
| Profanity validation | SignupPage + register API | `containsProfanity` in API; UI shows invalid/taken messages | ✅ |
| Password strength | SignupPage + register API | `isStrongPassword` in API; confirm password match in UI | ✅ |
| Confirm password | SignupPage | Controlled `confirmPassword`; submit checks match | ✅ |
| Timezone selector | SignupPage | Controlled `timezone`; select options | ✅ |
| Language selector | SignupPage | Controlled `preferredLanguage`; en/es | ✅ |
| Profile image upload | SignupPage | File input, preview, 2MB limit, `avatarDataUrl` in register payload | ✅ |
| Avatar preset buttons | SignupPage | `avatarPreset` state; crest/bolt/crown | ✅ |
| Phone number (signup) | SignupPage | Controlled `phone`; optional or required when verification = PHONE | ✅ |
| Verification method (Email/Phone) | SignupPage | `verificationMethod` state; buttons toggle | ✅ |
| Age verification checkbox | SignupPage | `ageConfirmed`; required for submit | ✅ |
| Disclaimer/terms | SignupPage | Age confirmation only; terms link can be added to same block | ✅ |
| Submit (signup) | SignupPage | `handleSubmit` → register → signIn credentials → redirect or success screen | ✅ |
| Back buttons | Login, Signup, ForgotPassword | Links to `/` or login with returnTo | ✅ |
| Loading states | All auth forms | `loading` / `sleeperLoading` / `adminLoading` disable submit and show spinner | ✅ |
| Error states | All auth forms | `error` / `setError`; displayed in red alert blocks | ✅ |
| Success screens | Signup, ForgotPassword, ResetPassword | Success message and link to login or auto-redirect | ✅ |
| Redirects after auth | Login, Signup | Login: `router.push(result.url || callbackUrl)`. Signup: `router.push(redirectAfterSignup)` or verify with returnTo | ✅ |
| Admin crest | HomeTopNav | Shown when `isAdmin` from `/api/user/me`; links to `/admin` | ✅ |
| Sign up (from signup success) | SignupPage | “Go to Sign In” uses `loginUrlWithIntent(redirectAfterSignup)` | ✅ |
| Sign in (from signup bottom) | SignupPage | “Sign in” link uses `loginUrlWithIntent(redirectAfterSignup)` | ✅ |

**Fix applied**: Signup now respects both `next` and `callbackUrl`, post-signup no longer hardcodes `/dashboard`, login now includes Sleeper and social entry points, bracket auth redirects preserve `returnTo`, and provider fallback remains clickable/non-dead.

---

## 7. QA Findings

- **Unified access**: One account works for app, bracket, and legacy; no duplicate signup paths found. Bracket and app entry points link to `/signup?next=…` or `/login?callbackUrl=…` as appropriate.
- **Forgot password**: Email flow unchanged; SMS flow end-to-end (choose SMS → phone → code sent → code + new password → confirm → success → redirect to login with reset=1). If Twilio is not configured, request returns 200 without sending; user sees “Could not send code” only if API returns non-ok.
- **Provider fallback**: Disabled social buttons are clickable and show an inline message; no dead buttons.
- **Intent preservation**: Signup with `?next=/brackets` redirects to `/brackets` after success (or to verify with returnTo); “Go to Sign In” and “Sign in” link to login with the same callback so after login the user lands on the intended page.
- **Mobile**: Auth pages use responsive layout and touch-friendly targets; forms stack vertically on small screens.

---

## 8. Issues Fixed

- **Signup redirect**: Signup had a hardcoded `/dashboard` callback and ignored `callbackUrl` on signup entry. Fixed by `resolveSignupRedirectPath({ next, callbackUrl })` and `resolvePostSignupCallbackUrl(...)`.
- **Social buttons dead when disabled**: When Google/Apple were not enabled, buttons were disabled and had no feedback. Fixed by making all provider buttons clickable and showing an inline “not configured” / “planned” message on click.
- **Forgot password email-only**: Only email reset existed. Added method choice (Email / SMS), SMS request (phone → send code), and SMS confirm (code + new password) with backend support in request and confirm APIs.
- **Open redirect risk**: Centralized redirect logic in `lib/auth/auth-intent-resolver.ts` with `safeRedirectPath` so only paths starting with `/` and not `//` are used for callbackUrl/next.
- **Bracket redirect continuity**: Bracket hub/signup and entry-creation redirects could drop user intent; now both login and verify redirects include `returnTo`.

---

## 9. Final QA Checklist

- [x] One sign up system; one sign in system; one shared account and session.
- [x] After sign in, user can reach Sports App, Bracket, Legacy via callbackUrl/next.
- [x] Signup respects `next` and `callbackUrl` and redirects (or verify with returnTo) accordingly; login links from signup preserve intent.
- [x] Forgot password: choose Email or SMS; email sends link; SMS sends code; user can enter code + new password and confirm.
- [x] Reset password (email link) still works; reset (SMS) uses phone + code + newPassword in confirm API.
- [x] All social provider buttons are clickable; unconfigured/planned show clear message.
- [x] Login form: enter key submits; show/hide password; Sleeper sign-in; social sign-in fallback; forgot link; error/loading states.
- [x] Signup form: username check, profanity/validation, password match, age confirm, timezone, language, avatar, phone, verification method; submit and success/error.
- [x] Admin login and admin crest (when isAdmin) unchanged and working.
- [x] Theme and localization preserved; no new dependencies.

---

## 10. Explanation of the Unified Auth System

- **Single identity**: Every user has one `AppUser` and one `UserProfile`. Signing up once creates that identity; signing in (credentials, Sleeper, Google, Apple when configured) attaches to the same account. Bracket leagues, sports app leagues, and legacy features all reference the same `userId`, so there are no separate “bracket accounts” or “app accounts.”
- **Intent-based routing**: Links across the product pass `next` (signup) or `callbackUrl` (login) so that after auth the user is sent to the page they were trying to reach (e.g. bracket creation, app home, legacy). The auth-intent-resolver keeps redirect logic in one place and prevents open redirects.
- **Forgot password**: Users can reset via email (link) or SMS (code). Both paths use the same `PasswordResetToken` table and the same confirm API; the only difference is how the token is delivered and whether the client sends `token` or `phone`+`code`. This keeps the system simple and extensible.
- **Social and future providers**: All provider buttons are present and clickable. If a provider is not configured, clicking it explains that it’s “not configured” or “planned,” so the experience is consistent and the product is ready for more providers without UI changes.
- **Mobile and accessibility**: Auth pages are responsive, use semantic forms and labels, and keep loading and error states visible so the flow works on small screens and with assistive tech.
