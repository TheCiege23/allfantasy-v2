# Prompt 109 — Onboarding Funnel + User Activation System (Deliverable)

## Primary goal

Help new users quickly:

- Create a league
- Join a league
- Create a bracket
- Use AI tools

## Onboarding flow

1. **Welcome** — Intro and option to continue or skip.
2. **Sport selection** — Choose preferred sports (saved to profile).
3. **Tool suggestions** — Links to Trade analyzer, Mock draft, Brackets, Chimmy.
4. **League creation prompt** — CTAs: Create league, Join league, Create bracket pool; or Skip to dashboard.

## Architecture

### Schema

- **UserProfile** (existing): added `onboardingStep` (string, nullable), `onboardingCompletedAt` (DateTime, nullable).
- Migration: `prisma/migrations/20260335000000_add_onboarding_funnel/migration.sql`.

### Core modules

- **OnboardingFlowService** (`lib/onboarding-funnel/OnboardingFlowService.ts`)
  - `getOnboardingState(userId)` — current step, completedAt, isComplete.
  - `advanceOnboardingStep(userId, { step, completeFunnel? })` — advance to next step or mark complete.
  - `completeOnboardingFunnel(userId)` — set step to completed and set onboardingCompletedAt.
  - Step order: `welcome` → `sport_selection` → `tool_suggestions` → `league_prompt` → `completed`.

- **UserPreferenceResolver** (`lib/onboarding-funnel/UserPreferenceResolver.ts`)
  - `getPreferredSports(userId)` — from profile.
  - `setPreferredSports(userId, sports)` — persists via `updateUserProfile` (preferredSports).
  - `getSportOptions()` — labels + values from `SUPPORTED_SPORTS` (sport-scope).

### API

- **GET /api/onboarding/funnel** — Returns `{ currentStep, completedAt, isComplete }` (auth required).
- **POST /api/onboarding/funnel** — Body: `{ step, completeFunnel?, preferredSports? }`. Advances step or completes funnel; when `step === "sport_selection"`, `preferredSports` is saved to profile.

### UI

- **Route:** `/onboarding/funnel`.
- **Server page:** `app/onboarding/funnel/page.tsx` — auth check, redirect if already complete, loads state and passes to client.
- **Client:** `app/onboarding/funnel/OnboardingFunnelClient.tsx` — four steps with Next/Skip and tool links; on completion redirects to `/dashboard`.

### Entry points

- After **profile completion** (`/onboarding` → Complete profile): redirect to `/onboarding/funnel` instead of `/dashboard`. Funnel page itself redirects to dashboard if already complete.
- **Dashboard:** If profile is complete but funnel is not, show alert “Take the quick tour” with link to `/onboarding/funnel`.

---

## Mandatory UI click audit

| Element | Location | Behavior |
|--------|----------|----------|
| **Next** | Welcome, Sport selection, Tool suggestions | POST `/api/onboarding/funnel` with current `step`; on success set step to `nextStep` (or `completed` then redirect). |
| **Skip** | Welcome, Sport selection, Tool suggestions | POST with `completeFunnel: true`; funnel marked complete, redirect to dashboard. |
| **Skip — go to dashboard** | League creation prompt | Same: `completeFunnel: true`, then redirect. |
| **Tool links** | Tool suggestions step | Trade analyzer → `/af-legacy?tab=trade-center`, Mock draft → `/af-legacy?tab=mock-draft`, Brackets → `/brackets`, Chimmy → `/chimmy`. Links are `<Link href={...}>` (no step change). |
| **Create league** | League prompt | `<Link href="/leagues">` — navigates to leagues. |
| **Join league** | League prompt | `<Link href="/app/discover">` — discover/join. |
| **Create bracket pool** | League prompt | `<Link href="/brackets/leagues/new">` — new bracket pool. |

**Preferences:** On **Sport selection**, when user clicks **Next**, the selected sports are sent in the POST body as `preferredSports` and persisted via `setPreferredSports` (which calls `updateUserProfile(userId, { preferredSports })`). So onboarding correctly saves user preferences.

---

## QA requirements

- **Onboarding completion flows**
  - New user completes profile → is redirected to `/onboarding/funnel`; sees Welcome → can click Next through all steps; on last step (league prompt) can click “Skip — go to dashboard” and lands on dashboard; next visit to `/onboarding/funnel` redirects to dashboard.
  - Skip from Welcome: funnel is marked complete, user is redirected to dashboard; preferences are not set (sport step skipped).
  - Sport selection: select one or more sports, click Next → preferences saved; next step is tool suggestions.
  - Tool suggestions: tool links open in same tab (or new tab per browser); Next advances to league prompt.
  - League prompt: “Create league” / “Join league” / “Create bracket pool” navigate to the correct routes; “Skip — go to dashboard” marks funnel complete and redirects.
- **Dashboard:** User with profile complete but funnel not complete sees “Take the quick tour” with “Get started” link to `/onboarding/funnel`.
- **API:** GET funnel returns correct step; POST with invalid step returns 400; POST with `completeFunnel: true` sets onboarding completed.

---

## Files touched

- `prisma/schema.prisma` — UserProfile: onboardingStep, onboardingCompletedAt.
- `prisma/migrations/20260335000000_add_onboarding_funnel/migration.sql` — new.
- `lib/user-settings/types.ts`, `UserProfileService.ts`, `SettingsQueryService.ts` — onboarding fields.
- `lib/onboarding-funnel/` — types, OnboardingFlowService, UserPreferenceResolver, index.
- `app/api/onboarding/funnel/route.ts` — GET/POST.
- `app/onboarding/funnel/page.tsx`, `OnboardingFunnelClient.tsx` — funnel UI.
- `app/onboarding/OnboardingForm.tsx` — redirect to `/onboarding/funnel` after profile complete.
- `app/dashboard/page.tsx` — load onboarding state, pass `onboardingComplete`.
- `app/dashboard/DashboardContent.tsx` — show “Take the quick tour” when !onboardingComplete.
