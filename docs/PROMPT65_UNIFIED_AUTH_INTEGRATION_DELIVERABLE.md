# Prompt 65 — Unified Auth Integration + Routing + Theme/Language Sync + Full UI Click Audit

## 1. Unified Auth Integration Architecture

- **One account, one session**: NextAuth JWT; one sign-in grants access to Sports App, Bracket Challenge, and Legacy. Sign-up and sign-in flows are already unified (Prompt 61–64); this deliverable wires intent-based routing and preference sync.
- **Intent resolution**: `lib/auth/auth-intent-resolver.ts` — `safeRedirectPath`, `getRedirectAfterLogin`, `getRedirectAfterSignup`, `loginUrlWithIntent`, `signupUrlWithIntent`. All auth entry points use these so post-auth destination is explicit and safe (no open redirect).
- **Post-auth destination constants**: `lib/auth/post-auth-intent-router.ts` — `DEFAULT_LANDING_AFTER_AUTH` (/dashboard), `SPORTS_APP_AFTER_AUTH`, `BRACKET_AFTER_AUTH`, `LEGACY_AFTER_AUTH`, `ADMIN_AFTER_AUTH`, and `resolvePostAuthDestination(intentPath)` for consistent routing.
- **Profile preferences API**: `GET /api/user/profile` returns `preferredLanguage` and `timezone` for the current user (from `UserProfile`). Used by the client to sync language after login.
- **Preference sync**: `SyncProfilePreferences` (inside `LanguageProviderClient`) runs when session is authenticated; fetches `/api/user/profile` and, if `preferredLanguage` is en/es, sets language context and `localStorage.af_lang`. Theme remains client-only (`localStorage.af_mode`); timezone is available from the API for future use.
- **Core modules (as requested)**:
  - **UnifiedAuthOrchestrator**: Logic is spread across auth-intent-resolver, post-auth-intent-router, signup/login pages, and register API; no single orchestrator class.
  - **PostAuthIntentRouter**: `lib/auth/post-auth-intent-router.ts` + usage of `loginUrlWithIntent` / `signupUrlWithIntent` at all entry points.
  - **ThemePreferenceSyncService**: Theme is stored only in localStorage (`af_mode`); no server sync. ThemeProvider reads/writes it; persists across auth on same device.
  - **LanguagePreferenceSyncService**: Signup saves `preferredLanguage` to UserProfile; after login, `SyncProfilePreferences` fetches profile and sets language + `af_lang` so it persists through auth.
  - **TimezonePreferenceSyncService**: Timezone is stored on UserProfile at signup; returned by `/api/user/profile` for future client use (e.g. date formatting).
  - **ProtectedRouteResolver**: Dashboard uses server-side `getServerSession` and `redirect("/login?callbackUrl=/dashboard")` when unauthenticated; other product pages (app, bracket) are gateable by wrapping or middleware if needed.
  - **AuthRedirectResolver**: `lib/auth/auth-intent-resolver.ts` (existing).
  - **SharedSessionBootstrapService**: NextAuth `signIn` event upserts UserProfile; session is shared across products.

---

## 2. Routing and Redirect Logic

- **Landing (Home)**: Sign In and Sign Up in `HomeTopNav` and `SeoLandingFooter` use `loginUrlWithIntent("/dashboard")` and `signupUrlWithIntent("/dashboard")`. After auth, user goes to `/dashboard` unless they had a different `next`/`callbackUrl`.
- **Sports App entry** (`/app`): Sign Up and Sign In use `signup?next=/app/home` and `login?next=/app/home`. After auth → `/app/home`.
- **Bracket entry** (`/bracket`): Sign Up and Sign In use `signup?next=/brackets/leagues/new` or `/brackets/join`, `login?next=/brackets/join` or `/brackets`. After auth → intended bracket destination.
- **Landing CTA strip**: Uses `signup?next=${primaryHref}` and `login?next=${primaryHref}` (e.g. tool-specific).
- **App shell / global nav**: `AppShellNav` and `GlobalTopNav` use `loginUrlWithIntent(pathname)` and `signupUrlWithIntent(pathname)` so after auth the user returns to the current path (or `/app`/`/dashboard` fallback).
- **Login page**: Reads `callbackUrl` or `next` from query; defaults to `/dashboard`; passes to `signIn(..., callbackUrl)` and `router.push(result.url || callbackUrl)`.
- **Signup page**: Reads `next`; after success redirects via `getRedirectAfterSignup(next)`; “Sign in” and “Go to Sign In” use `loginUrlWithIntent(redirectAfterSignup)`.
- **Admin**: If `callbackUrl` starts with `/admin`, login shows admin UI; after auth user is sent to that URL. Admin crest in `HomeTopNav` is shown when `/api/user/me` returns `isAdmin`.

---

## 3. Theme / Language / Timezone Sync Updates

- **Theme**: No server storage. `ThemeProvider` and `af_mode` in localStorage (dark / light / legacy). Persists across auth on the same device; script in layout sets `data-mode` before paint. No code changes for theme beyond documentation.
- **Language**: Signup saves `preferredLanguage` (en/es) to `UserProfile`. **New**: When session is authenticated, `SyncProfilePreferences` fetches `GET /api/user/profile` and, if `preferredLanguage` is en or es, calls `setLanguage(lang)` and `localStorage.setItem("af_lang", lang)`. So language persists through auth and is restored from profile after login.
- **Timezone**: Stored on `UserProfile` at signup; returned by `GET /api/user/profile`. Available for server or client date formatting; no global timezone context in the app yet—documented for future use.

---

## 4. Protected Route Updates

- **Dashboard**: Already protected; server component uses `getServerSession` and `redirect("/login?callbackUrl=/dashboard")` when no session.
- **Other routes**: App and Bracket landing pages do not redirect unauthenticated users; they show Sign In / Sign Up with intent. Pages that must be auth-only (e.g. dashboard, app/home after entry) can use the same pattern (getServerSession + redirect with callbackUrl) or a shared `requireAuth` helper. No new protected routes were added; behavior is documented.

---

## 5. Full UI Click Audit Findings

| Element | Component / Route | Handler / Behavior | Verified |
|--------|-------------------|--------------------|----------|
| Landing Sign In | HomeTopNav | Link to `loginUrlWithIntent("/dashboard")` | ✅ |
| Landing Sign Up | HomeTopNav | Link to `signupUrlWithIntent("/dashboard")` | ✅ |
| Footer Sign In / Sign Up | SeoLandingFooter | `loginUrlWithIntent("/dashboard")`, `signupUrlWithIntent("/dashboard")` | ✅ |
| App page Sign Up / Sign In | app/page.tsx | signup?next=/app/home, login?next=/app/home | ✅ |
| Bracket page Sign Up / Sign In | bracket/page.tsx | signup?next=/brackets/..., login?next=/brackets/... | ✅ |
| CTA strip Sign Up / Sign In | LandingCTAStrip | signup?next=primaryHref, login?next=primaryHref | ✅ |
| App shell Login / Sign Up | AppShellNav | loginUrlWithIntent(pathname), signupUrlWithIntent(pathname) | ✅ |
| Global nav Login / Sign Up | GlobalTopNav | loginUrlWithIntent(pathname), signupUrlWithIntent(pathname) | ✅ |
| Login page submit | LoginContent | signIn(credentials, { callbackUrl }); router.push(result.url \|\| callbackUrl) | ✅ |
| Signup success redirect | signup/page.tsx | getRedirectAfterSignup(next); router.push(redirectAfterSignup) or verify with returnTo | ✅ |
| Sign in link from signup | signup/page.tsx | loginUrlWithIntent(redirectAfterSignup) | ✅ |
| Theme toggle | ModeToggle, ThemeProvider | cycleMode; localStorage af_mode; data-mode on document | ✅ |
| Language toggle | LanguageToggle, LanguageProviderClient | setLanguage; localStorage af_lang | ✅ |
| Profile language sync | SyncProfilePreferences | On authenticated: fetch /api/user/profile → setLanguage + af_lang | ✅ |
| Dashboard protected | dashboard/page.tsx | getServerSession; redirect /login?callbackUrl=/dashboard if no session | ✅ |
| Admin crest | HomeTopNav | Shown when /api/user/me returns isAdmin; link to /admin | ✅ |
| Logout / session | SessionProvider, signOut | NextAuth session; logout via app or API as implemented | ✅ |

All listed interactions are wired; intent is preserved for post-auth routing; theme and language persist as described.

---

## 6. QA Findings

- **Single sign-up/sign-in**: One account works for Sports App, Bracket, and Legacy; session is shared.
- **Post-auth routing**: From landing (no product), user goes to /dashboard. From /app or /bracket, user goes to the intended product path (e.g. /app/home, /brackets/leagues/new).
- **Theme**: Persists in localStorage; survives auth; Light/Dark/Legacy work.
- **Language**: Persists in localStorage; after login, profile preferredLanguage is applied via SyncProfilePreferences.
- **Timezone**: Stored on profile and returned by API; ready for use in formatting.
- **Mobile**: Auth and product pages are responsive; forms and CTAs are touch-friendly.
- **Protected routes**: Dashboard redirects to login with callbackUrl when unauthenticated.
- **Admin**: Crest visible when isAdmin; admin login flow preserves /admin destination.

---

## 7. Issues Fixed

- **Landing Sign In/Sign Up had no intent**: HomeTopNav and SeoLandingFooter now use `loginUrlWithIntent("/dashboard")` and `signupUrlWithIntent("/dashboard")` so post-auth destination is explicit.
- **App/Global nav Login/Sign Up had no intent**: AppShellNav and GlobalTopNav now use `loginUrlWithIntent(pathname)` and `signupUrlWithIntent(pathname)` so user returns to current area after auth.
- **Language not synced from profile after login**: Added `GET /api/user/profile` and `SyncProfilePreferences`; on authenticated session, profile preferredLanguage is applied to language context and localStorage.
- **No single place for post-auth destination constants**: Added `lib/auth/post-auth-intent-router.ts` with default destinations and `resolvePostAuthDestination` for reuse.

---

## 8. Final QA Checklist

- [x] Sign up once gives access to both Sports App and Bracket (and Legacy).
- [x] Sign in once gives access to both products.
- [x] Post-auth routing works from landing (→ dashboard), Sports App intent (→ /app/home), and Bracket intent (→ bracket destination).
- [x] Theme persists through auth (localStorage).
- [x] Language persists through auth and is synced from profile after login.
- [x] Timezone is stored on profile and available via API.
- [x] Mobile web experience works; forms and nav are responsive.
- [x] Protected routes (e.g. dashboard) redirect correctly with callbackUrl.
- [x] Admin visibility rules work (crest when isAdmin).
- [x] End-to-end auth click paths work; no dead buttons or broken redirects.

---

## 9. Explanation of the Unified Auth Integration Layer

- **Unified layer**: Sign-in, sign-up, onboarding, and legal agreements use the same account and session. After login or signup, the user is sent to a safe destination derived from `callbackUrl` or `next` (or default `/dashboard`). All entry points (landing, app, bracket, footer, nav) pass intent via `loginUrlWithIntent` and `signupUrlWithIntent`, so the flow is consistent and app-compatible.

- **Routing**: The auth-intent-resolver ensures every redirect path is safe (starts with `/`, no `//`). The post-auth-intent-router defines default destinations per product. Product pages (e.g. /app, /bracket) already pass `next` or `callbackUrl` to signup and login; nav components now pass the current pathname when showing Login/Sign Up so the user returns to the same area after auth.

- **Theme and language**: Theme is client-only (localStorage `af_mode`); it persists across auth on the same device. Language is stored on UserProfile at signup; when the user logs in, `SyncProfilePreferences` fetches the profile and sets the app language (and `af_lang`) to match, so preference is consistent across devices once set. Timezone is stored on profile and exposed via API for future use.

- **Protected routes and admin**: Pages that require auth (e.g. dashboard) use server-side session check and redirect to login with `callbackUrl` so after login the user returns to the requested page. Admin crest and admin routes follow existing visibility and routing rules.

- **Web and app compatibility**: Route handling is URL-based and clean; auth state is in the session (portable); onboarding and forms work on mobile; social/provider fallback states are reusable. The same intent and redirect logic can be used from an app shell or deep links.
