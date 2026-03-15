# Prompt 62 — Sign In Flow + Password Recovery + Social Auth + Full UI Click Audit

## 1. Sign In Architecture

- **Unified login identifier**: One field accepts **username**, **email**, or **mobile number**. The backend resolves the value via `lib/auth/login-identifier-resolver.ts`:
  - If the input looks like a phone number (10–15 digits, optional `+` and formatting), it is normalized to E.164 and the user is looked up by `UserProfile.phone`.
  - Otherwise the user is looked up by `AppUser.email` or `AppUser.username` (case-insensitive).
- **Credentials provider** (`lib/auth.ts`): Uses `resolveLoginToUser(login)` instead of a direct Prisma `findFirst` on email/username only. Same password check, Sleeper-only, and PASSWORD_NOT_SET handling as before.
- **Routing**: Unchanged — `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify`, `/auth/error`. Callback/next and safe redirects via `lib/auth/auth-intent-resolver.ts`.
- **Session**: NextAuth JWT; one account for WebApp, Bracket, and Legacy. Sign-in submit and Enter key both call `handlePasswordLogin` → `signIn("credentials", { login, password, redirect: false, callbackUrl })` → `router.push(result.url || callbackUrl)`.

**Core modules (as requested)**:
- **LoginIdentifierResolver**: `lib/auth/login-identifier-resolver.ts` — `resolveLoginToUser(login)` (email / username / phone).
- **SignInFormController**: Logic in `app/login/LoginContent.tsx` — `handlePasswordLogin`, login/password state, validation, submit.
- **PasswordRecoveryService**: Backend `/api/auth/password/reset/request` and `/api/auth/password/reset/confirm`; frontend `ForgotPasswordClient` (request + resend + confirm).
- **ResetCodeVerificationService**: Confirm API SMS branch (phone + code + newPassword); frontend `handleConfirmSms` and “Resend code” (`handleResendCode`).
- **SocialAuthButtonGroup**: `components/auth/SocialLoginButtons.tsx` — all six providers, callbackUrl.
- **ProviderPendingFlow**: Inline message in `SocialLoginButtons` when provider not configured (no separate route).
- **AuthRedirectResolver**: `lib/auth/auth-intent-resolver.ts` — safe redirects, loginUrlWithIntent, getRedirectAfterSignup.
- **AuthErrorMessageResolver**: Inline in `LoginContent` and `ForgotPasswordClient` (error strings and API error mapping).

---

## 2. Forgot Password Flow Logic

- **Method choice**: User chooses **Send code by Email** or **Send code by SMS** on `/forgot-password`.
- **Email path**: Enter email → POST `/api/auth/password/reset/request` with `type: 'email'` → reset link sent via Resend → “Check your email” screen → user clicks link → `/reset-password?token=…` → enter new password + confirm → POST `/api/auth/password/reset/confirm` with `token` + `newPassword` → success → redirect to login with `reset=1`.
- **SMS path**: Enter phone (E.164) → POST `/api/auth/password/reset/request` with `type: 'sms'` → 6-digit code sent via Twilio (if configured) → **Enter code and new password** step: 6-digit code, new password, confirm password, **Resend code** button → POST `/api/auth/password/reset/confirm` with `phone` + `code` + `newPassword` → success → redirect to login with `reset=1`.
- **Resend code**: On the SMS code step, “Resend code” calls the same request API again (same rate limit as initial request). Success clears any previous error; failure shows the API message (e.g. “Could not resend code. Try again in a minute.”).
- **Back / switch method**: “Back to Sign In” and “Use email instead” / “Use SMS instead” preserve `returnTo` in the login link.

---

## 3. Social Auth Handling Design

- **Configured providers** (Google, Apple when env flags set): Button calls `signIn(provider, { callbackUrl })`; flow unchanged.
- **Unconfigured / planned** (Google/Apple when not set, Facebook, Instagram, X, TikTok): Buttons remain **clickable**. On click, an inline message is set (e.g. “Google sign-in is not configured for this environment…”, “Facebook sign-in is planned…”) and shown in a cyan-tinted box above the grid. No dead buttons; no redirect to a separate “provider pending” page (optional future enhancement).
- **Visual hierarchy**: Google and Apple in a 2-column grid with primary styling when enabled; Facebook, Instagram, X, TikTok in a smaller “planned” row so the UI is polished and intentional.

---

## 4. Frontend Sign In Page Updates

- **Login identifier field**: Label “Email, username, or phone”; placeholder “you@example.com, username, or +1 555 123 4567”; `id="login-identifier"` and `id="login-password"` for a11y.
- **Focus states**: Inputs use `focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20` for a clear, premium focus ring.
- **Microcopy**: “One account for WebApp, Bracket, and Legacy. We never post without your permission.” below social buttons; “After sign in: {destinationLabel}” retained.
- **Show/hide password**: `aria-label="Hide password"` / “Show password” on the toggle button.
- **Errors**: “Enter your email, username, or phone number.” when login empty; “Invalid email, username, or password.” on failed credentials (covers phone as well).
- **Spacing**: Slightly increased vertical spacing in the form (`space-y-4`), `mt-1.5` on inputs, consistent padding.

---

## 5. Backend Auth / Recovery Updates

- **Login by phone**: `lib/auth/login-identifier-resolver.ts` — `resolveLoginToUser(login)`:
  - Normalizes phone with `normalizePhone()` (strip non-digits except leading `+`, default `+1`).
  - If `looksLikePhone(login)` (10–15 digits), finds `UserProfile` by `phone`, then `AppUser` by `profile.userId`.
  - Else finds `AppUser` by `email` or `username` (case-insensitive).
- **NextAuth credentials**: `lib/auth.ts` — credentials provider now uses `resolveLoginToUser(login)` and label “Email, username, or phone”. No other backend auth changes.
- **Password reset**: No API changes; request and confirm routes already support email and SMS. Resend code reuses POST `/api/auth/password/reset/request` with `type: 'sms'` and same `phone`; backend rate limit applies.

---

## 6. Full UI Click Audit Findings

| Element | Component / Route | Handler / Behavior | Verified |
|--------|-------------------|--------------------|----------|
| Sign In submit button | LoginContent | `handlePasswordLogin` → `signIn('credentials', …)`; redirect to `callbackUrl` or `/dashboard` | ✅ |
| Enter key submit (login) | LoginContent | Form `onSubmit={handlePasswordLogin}` | ✅ |
| Login identifier input | LoginContent | Controlled `login`; label “Email, username, or phone” | ✅ |
| Password input | LoginContent | Controlled `password`; show/hide toggle | ✅ |
| Show/hide password | LoginContent | `showPassword`; button toggles type; aria-label | ✅ |
| Forgot password link | LoginContent | `Link` to `/forgot-password?returnTo=…` | ✅ |
| Reset by email option | ForgotPasswordClient | Choose Email → request with `type: 'email'` → sent screen | ✅ |
| Reset by SMS option | ForgotPasswordClient | Choose SMS → request with `type: 'sms'` → SMS code step | ✅ |
| Send code (email) | ForgotPasswordClient | `handleRequestEmail` → request API | ✅ |
| Send code (SMS) | ForgotPasswordClient | `handleRequestSms` → request API → step `sms_enter_code` | ✅ |
| Resend code button | ForgotPasswordClient | `handleResendCode` → same request API (SMS); disabled while resendLoading/loading | ✅ |
| Verify code (SMS) | ForgotPasswordClient | `handleConfirmSms` → confirm API with phone, code, newPassword | ✅ |
| Save new password (SMS) | ForgotPasswordClient | Same submit as verify code; button “Reset password” | ✅ |
| Save new password (email link) | reset-password page | Form submit → confirm with token + newPassword | ✅ |
| Google button | SocialLoginButtons | When enabled: `signIn('google', { callbackUrl })`; else inline message | ✅ |
| Apple button | SocialLoginButtons | When enabled: `signIn('apple', { callbackUrl })`; else inline message | ✅ |
| Facebook button | SocialLoginButtons | Click sets “planned” message | ✅ |
| Instagram button | SocialLoginButtons | Click sets “planned” message | ✅ |
| X button | SocialLoginButtons | Click sets “planned” message | ✅ |
| TikTok button | SocialLoginButtons | Click sets “planned” message | ✅ |
| Back to Sign In | LoginContent (Back), ForgotPasswordClient, reset-password | Link to `/` or `/login?callbackUrl=…` / loginHref | ✅ |
| Route to sign up | LoginContent | `Link` to `/signup?next=…` (callbackUrl preserved) | ✅ |
| Back to landing | LoginContent | “Back” link to `/` | ✅ |
| Loading states | All auth forms | `loading` / `resendLoading` disable submit and show spinner/text | ✅ |
| Error states | All auth forms | `error` / `setError` in red alert blocks | ✅ |
| Success / redirect | ForgotPassword, reset-password | Success screen then redirect to login with `reset=1` | ✅ |

**Summary**: All listed interactions are wired; no dead buttons. Resend code added for SMS step. Unified login field and backend resolver support username, email, and mobile number.

---

## 7. QA Findings

- **Sign in with username / email / mobile**: Backend resolves all three via `resolveLoginToUser`. Phone must match a `UserProfile.phone` (E.164); email and username match `AppUser`.
- **Enter key**: Form submit on login and forgot-password steps works.
- **Forgot password by email**: Request → email link → reset-password page → new password → confirm → redirect to login with reset=1.
- **Forgot password by SMS**: Choose SMS → phone → send code → enter code + new password → resend code available → submit → success → redirect.
- **Social buttons**: All six providers have click handlers; unconfigured/planned show inline message.
- **Mobile**: Responsive layout; touch-friendly targets; forms stack correctly.
- **Themes**: Auth pages use neutral/cyan/purple classes; no separate dark/light/legacy theme toggles on auth screens (aligned with landing).

---

## 8. Issues Fixed

- **Login by mobile number**: Previously only email and username were supported. Added `lib/auth/login-identifier-resolver.ts` and wired credentials provider to resolve phone via `UserProfile.phone`.
- **Unified field label/copy**: Label and placeholder updated to “Email, username, or phone” and error to “Invalid email, username, or password.”
- **Resend code (SMS)**: SMS code step had no resend. Added “Resend code” button and `handleResendCode` calling the same request API.
- **Sign-in UX**: Improved focus states (cyan ring), spacing, microcopy (“One account for WebApp, Bracket, and Legacy…”), and a11y (ids, aria-label on password toggle).

---

## 9. Final QA Checklist

- [x] Sign in with username works.
- [x] Sign in with email works.
- [x] Sign in with mobile number works (when user has `UserProfile.phone` set).
- [x] Enter key submits login form.
- [x] Forgot password by email: request → link → new password → success → redirect.
- [x] Forgot password by SMS: choose SMS → send code → enter code + new password → resend code → submit → success → redirect.
- [x] Social buttons (Google, Apple, Facebook, Instagram, X, TikTok) are wired; unconfigured/planned show clear message.
- [x] Show/hide password works; back to sign in and sign up link work; back to landing works.
- [x] No dead buttons on sign-in, forgot-password, or reset-password flows.

---

## 10. Explanation of the Sign In and Recovery System

- **Sign in**: User enters one string (email, username, or phone) and password. The app sends these to NextAuth’s credentials provider. The provider uses `resolveLoginToUser(login)` to find the user by email, username, or (if the input looks like a phone number) by `UserProfile.phone`. It then checks the password and returns the session payload; the client redirects to `callbackUrl` or `/dashboard`. Sleeper-only and no-password cases return clear errors.

- **Recovery**: Forgot password offers Email or SMS. Email sends a link with a token; the user sets a new password on `/reset-password`. SMS sends a 6-digit code; the user enters the code and new password on the same flow; “Resend code” requests a new code. Both paths call the same confirm API (token + newPassword for email, phone + code + newPassword for SMS). On success, the user is redirected to login with `reset=1` so a success banner can be shown.

- **Social**: Buttons call `signIn(provider, { callbackUrl })` when the provider is configured; otherwise they set an inline message so the UI stays intentional and testable. One account and one session are used across WebApp, Bracket, and Legacy.
