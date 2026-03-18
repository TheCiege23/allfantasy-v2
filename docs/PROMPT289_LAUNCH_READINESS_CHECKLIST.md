# PROMPT 289 — Launch Readiness Checklist

**Objective:** Prepare for launch.  
**Verify:** No critical bugs, all flows working, UI polished, AI stable.  
**Date:** 2025-03-17

Use this checklist before launch. Tick each item when verified in the target environment (staging/production).

**Deliverable map (reference):**

| Doc | Scope |
|-----|--------|
| [PROMPT 272 Global User Flow QA](PROMPT272_GLOBAL_USER_FLOW_QA_AUDIT.md) | End-to-end user flows |
| [PROMPT 284 Onboarding](PROMPT284_USER_ONBOARDING_FLOW_DELIVERABLE.md) | Onboarding funnel, create-league CTA |
| [PROMPT 285 Retention](PROMPT285_USER_RETENTION_SYSTEM_DELIVERABLE.md) | Retention widgets, streaks, nudges on dashboard |
| [PROMPT 286 AI Validation](PROMPT286_AI_SYSTEM_VALIDATION_DELIVERABLE.md) | Draft, chat, trades, waivers, war room AI; `GET /api/ai/validation` |
| [PROMPT 287 Monetization QA](PROMPT287_MONETIZATION_QA_DELIVERABLE.md) | Subscriptions, tokens, gating, Stripe links |
| [PROMPT 288 Security Audit](PROMPT288_SECURITY_AUDIT_DELIVERABLE.md) | Auth, roles, API security, data access |

---

## 1. No critical bugs

### 1.1 Core paths load

- [ ] **Home** `/` — Renders; CTAs (Sign up, Log in, primary product links) work.
- [ ] **Login** `/login` — Form submits; redirects after auth; callbackUrl preserved.
- [ ] **Signup** `/signup` — Form validates (username, email, password); POST `/api/auth/register` succeeds; redirect to verify or next.
- [ ] **Verify** `/verify` — Request verification; redirect to `returnTo` after success.
- [ ] **Dashboard** `/dashboard` and **App home** `/app/home` — Load for authenticated user; no 500; tokens/entitlement strip, quick actions, retention widgets (streak, return prompts, weekly summary), leagues, Chimmy section; links to onboarding, pricing, profile.
- [ ] **Onboarding** `/onboarding/funnel` — Redirects unauthenticated to login; redirects completed users to dashboard; steps (welcome, walkthrough, sport selection, tool suggestions, league prompt) complete without crash; Create league CTA goes to `/create-league`.
- [ ] **Settings** `/settings` — Loads when authenticated; tabs (profile, security, notifications, etc.) switch without error.
- [ ] **Logout** `/logout` — Signs out and redirects; no stuck session.

### 1.2 Error handling

- [ ] **Root error boundary** — `ErrorBoundaryClient` in `app/layout.tsx` catches render errors; fallback UI shows (no blank screen).
- [ ] **Suspense** — Key routes (login, signup, forgot-password, app home, verify) use Suspense with fallback; no layout shift or missing content.
- [ ] **API errors** — Critical flows show user-facing message on 4xx/5xx (e.g. signup, login, league create, checkout); no uncaught promise rejections in console for happy-path usage.
- [ ] **404** — Unknown routes show 404 page; no 500 for missing static/slug.

### 1.3 Data and auth consistency

- [ ] **Session** — After login, protected pages show user context; after logout, protected pages redirect to login.
- [ ] **League name** — Fantasy leagues (create/join) show correct league name in shell at `/app/league/[leagueId]` (not "League"); fallback to `GET /api/leagues/[leagueId]` when not in bracket list.
- [ ] **No critical console errors** — In production build, no persistent JS errors on main flows (signup, login, dashboard, one league, one draft).

---

## 2. All flows working

### 2.1 Auth and onboarding

- [ ] Sign up → verify (email/phone as configured) → onboarding → dashboard.
- [ ] Log in (password, Google if enabled, Sleeper if used) → redirect to callbackUrl or dashboard.
- [ ] Forgot password → request → reset flow (rate limit respected).
- [ ] Age/terms/disclaimer on signup; consent stored and respected.

### 2.2 Leagues and draft

- [ ] **Create league** — `/create-league` or equivalent → POST create → redirect to `/app/league/[leagueId]`.
- [ ] **Join league** — `/join` or invite link → preview → join → redirect to league or creator league.
- [ ] **League home** — `/app/league/[leagueId]` loads; tabs (Overview, Team, Trades, Waivers, Chat, Commissioner if applicable) load.
- [ ] **Live draft** — `/app/league/[leagueId]/draft` loads; draft session, queue, pick, chat work for member/commissioner; commissioner-only actions (settings, AI pick, etc.) only for commissioner.
- [ ] **Mock draft** — `/mock-draft`, join, share; create and join flow works.

### 2.3 Bracket

- [ ] Bracket landing `/bracket` or `/brackets` — CTAs (create, join, sign in) correct.
- [ ] Create bracket league — auth required; flow completes.
- [ ] Join bracket — join flow; entries and payment (if paid) work.
- [ ] Bracket Stripe — checkout and publishable key; webhook URL configured; test payment succeeds.

### 2.4 AI surfaces

- [ ] **Chimmy / AI hub** — `/chimmy`, `/ai-chat` load; chat sends and receives (or graceful error if no provider). `POST /api/chat/chimmy` used by Chimmy UI.
- [ ] **Trade** — Trade evaluator `/trade-evaluator`; analysis returns or shows rate limit/error. `POST /api/trade-evaluator` used.
- [ ] **Waiver AI** — `/waiver-ai`; analysis runs; rate limit and cooldown shown when applicable. `POST /api/waiver-ai` used.
- [ ] **Draft / War room** — Mock draft and war room use `POST /api/mock-draft/ai-pick`; live draft commissioner orphan pick uses `POST /api/leagues/[leagueId]/draft/ai-pick`. See PROMPT 286.
- [ ] **League AI** — League-scoped AI (e.g. draft, advice) works for member/commissioner as designed.
- [ ] **Coach / Advantage** — `/app/advantage`, `/app/coach` load and respond or degrade gracefully.

### 2.5 Monetization

- [ ] **Pricing** — `/pricing` loads; plan copy and Stripe buy (if wired) work.
- [ ] **Donate / Lab** — `/donate`; checkout session redirects to Stripe; return handles success.
- [ ] **Entitlements** — `GET /api/subscription/entitlements` returns 200 when authenticated; gated features show upgrade when not subscribed.
- [ ] **Tokens** — `GET /api/tokens/balance` returns 200 when authenticated; wallet/token UI does not 404.

### 2.6 Commissioner and admin

- [ ] **Commissioner** — Invite, draft settings, lineup, waivers, settings only for league owner; no 403 for owner, 403 for non-owner where intended.
- [ ] **Admin** — `/admin` requires admin session; redirects if not admin; admin APIs (e.g. dashboard, users, moderation) return 200 for admin and 401 for non-admin.

### 2.7 Chat and messages

- [ ] **DM / messages** — `/messages` requires auth; inbox and threads load.
- [ ] **League chat** — League tab Chat; send/receive in league context.
- [ ] **Shared chat** — Thread `league:leagueId` uses league access check; no cross-league leak.

### 2.8 Settings and profile

- [ ] Profile, timezone, language, security (password, verification), notifications, connected accounts, referral, legal — all tabs load and submit without critical error.
- [ ] Email/phone verification — send and confirm flows; rate limits respected.

---

## 3. UI polished

### 3.1 Layout and navigation

- [ ] **Shell** — Nav (desktop + mobile drawer) shows correct links; auth state (logged in / out) correct; admin link only for admins.
- [ ] **Responsive** — Key pages (home, login, signup, dashboard, one league, draft, settings) usable on mobile and desktop; no horizontal scroll or clipped CTAs.
- [ ] **Back / breadcrumbs** — Where offered, back or breadcrumb returns to expected parent; callbackUrl and `next` preserved on auth flows.

### 3.2 Loading and feedback

- [ ] **Loading states** — Buttons/forms show loading (e.g. disabled + “Loading…”) during submit where applicable.
- [ ] **Success feedback** — After signup, login, join, create league, checkout return — clear success or redirect; no silent failure.
- [ ] **Error feedback** — Validation and API errors shown inline or toast; message actionable where possible.
- [ ] **Empty states** — Empty lists (leagues, messages, etc.) show message or CTA, not blank or broken layout.

### 3.3 Accessibility and copy

- [ ] **Focus** — Tab order and focus visible on key forms (login, signup, join).
- [ ] **Labels** — Critical inputs have labels or aria-label; no “Submit” only without context where it matters.
- [ ] **Copy** — No placeholder-only or “Lorem” in main flows; pricing and legal copy appropriate for launch.
- [ ] **Theme** — Light/dark or mode toggle (if present) applies without flash or broken contrast.

### 3.4 Performance (minimum bar)

- [ ] **LCP** — Home and login reach interactive within acceptable time on target devices/network.
- [ ] **No obvious jank** — Scrolling and tab switch smooth on mid-range device.
- [ ] **Images** — Key images (logos, avatars) load or have fallback; no broken img in critical paths.

---

## 4. AI stable

### 4.1 Configuration and health

- [ ] **AI validation** — `GET /api/ai/validation` (authenticated) returns `ok: true` when at least one provider is available; `areas` list draft, chat, trades, waivers, war_room (see PROMPT 286).
- [ ] **Provider keys** — Required AI env vars set (e.g. OpenAI, Grok, or fallback provider); no runtime “missing key” for primary flows.
- [ ] **Health / diagnostics** — Admin or internal AI provider status/diagnostics (if present) show expected state; no false “all down” when keys are set.
- [ ] **Feature toggles** — Any league or global AI toggles (e.g. league AI settings) reflect correctly; toggling does not break page.

### 4.2 Graceful degradation

- [ ] **Provider unavailable** — When primary provider fails, fallback or clear error (e.g. “AI temporarily unavailable”); no uncaught exception or blank response.
- [ ] **Timeout** — Long-running AI calls timeout and return error or fallback; no infinite loading.
- [ ] **Rate limits** — User-facing rate limit (e.g. waiver AI, chat) returns 429 or message with retry-after; UI shows cooldown or “try again later”.
- [ ] **Deterministic fallback** — Where designed (e.g. draft AI), CPU or non-AI fallback works when API unavailable; draft does not block on AI.

### 4.3 Safety and correctness

- [ ] **No PII in prompts** — AI prompts do not log or send raw PII to external systems beyond what is required and disclosed.
- [ ] **Context boundaries** — League-scoped AI uses correct league/roster context; no cross-user or cross-league data in prompt.
- [ ] **Audit** — Sensitive AI actions (e.g. commissioner AI pick) auditable or logged where specified.

---

## 5. Environment and ops

### 5.1 Required env (reference)

- [ ] **Auth:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (or equivalent); Google/Sleeper if used.
- [ ] **Stripe:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook endpoints registered.
- [ ] **AI:** At least one AI provider key configured; optional fallback keys if used.
- [ ] **Admin:** `ADMIN_EMAILS` (and optional `ADMIN_PASSWORD` / cron secrets) set and restricted.
- [ ] **DB and app URL:** DB connection; `NEXT_PUBLIC_APP_URL` or base URL for links/redirects.
- [ ] **Cron:** If using cron routes, `CRON_SECRET` or per-job secrets set; cron jobs call with correct header.

### 5.2 Security (quick check)

- [ ] **HTTPS** — Production served over HTTPS; cookies secure where required.
- [ ] **Admin** — Admin UI and APIs not reachable without admin auth; no admin secret in client bundle.
- [ ] **Sensitive routes** — Commissioner and payment routes require auth and correct scope (see PROMPT 288).

### 5.3 Sport scope

- [ ] **Seven sports** — NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer supported where feature is sport-scoped (see `.cursor/rules/sport-scope.mdc`); no hardcoded single-sport in shared flows.
- [ ] **Defaults** — League creation and discovery use `DEFAULT_SPORT` / supported sport list; no crash on unsupported sport value where validation exists.

---

## 6. Sign-off

| Area              | Owner | Date | Notes |
|-------------------|-------|------|--------|
| Critical bugs     |       |      |        |
| All flows         |       |      |        |
| UI polished       |       |      |        |
| AI stable         |       |      |        |
| Env & security    |       |      |        |

**Launch go/no-go:** _______________

---

## 7. Post-launch (first 24–48h)

- [ ] Monitor errors (e.g. 5xx, uncaught exceptions in monitoring tool).
- [ ] Check Stripe webhooks and subscription/entitlement updates if monetization is live.
- [ ] Verify cron jobs (if any) ran and no secret/header misconfiguration.
- [ ] Spot-check one full flow: signup → onboarding → create/join league → draft (or bracket) and one AI path (e.g. waiver or trade analysis).
