# PROMPT 284 — User Onboarding Flow Deliverable

## Objective

Guide new users with an onboarding flow that includes: app walkthrough, pick favorite sports, show AI features, suggest leagues.

---

## Flow (5 steps)

1. **Welcome** — Short intro; “Start walkthrough” or “Skip”.
2. **App walkthrough** — Quick tour: four cards (Dashboard, Leagues, Draft & tools, AI assistant) with icons and one-line descriptions. Next / Skip.
3. **Pick favorite sports** — Multi-select sports (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer). Saved to profile; used to personalize content and suggested leagues. Next / Skip.
4. **Show AI features** — Four AI feature cards with “Try it” links: Trade Analyzer, Waiver AI, Draft War Room, Chimmy Chat. Each card has icon, title, short description, and link to the tool. Next / Skip.
5. **Suggest leagues** — “Create or join a league”: primary CTA “Create league” (→ /create-league), “Discover suggested leagues” (→ /app/discover), “Create bracket pool” (→ /brackets/leagues/new). Copy explains we suggest leagues based on their sports. “Skip — go to dashboard” completes the funnel.

Completion redirects to **/dashboard**.

---

## Entry and persistence

- **Entry:** After profile completion, users are sent to `/onboarding/funnel`. Dashboard and retention nudges can link to `/onboarding/funnel` for users who haven’t finished.
- **Persistence:** Current step and completion are stored on **UserProfile** (`onboardingStep`, `onboardingCompletedAt`). Preferred sports are saved in profile when leaving the sport_selection step.
- **API:** `POST /api/onboarding/funnel` with `{ step, completeFunnel?, preferredSports? }` advances the step or completes the funnel; `GET /api/onboarding/funnel` returns current state.

---

## Key files

| File | Role |
|------|------|
| `app/onboarding/page.tsx` | Profile completion (name, phone); redirects to funnel when verified. |
| `app/onboarding/funnel/page.tsx` | Server wrapper: auth, load state, sport options, preferred sports; renders funnel client. |
| `app/onboarding/funnel/OnboardingFunnelClient.tsx` | Client UI for all 5 steps: welcome, app_walkthrough, sport_selection, tool_suggestions, league_prompt. |
| `lib/onboarding-funnel/types.ts` | `OnboardingStepId` (includes `app_walkthrough`), `ONBOARDING_STEPS` order. |
| `lib/onboarding-funnel/OnboardingFlowService.ts` | `getOnboardingState`, `advanceOnboardingStep`, `getNextStep`, `completeOnboardingFunnel`. |
| `lib/onboarding-funnel/UserPreferenceResolver.ts` | `getPreferredSports`, `setPreferredSports`, `getSportOptions`. |
| `app/api/onboarding/funnel/route.ts` | GET current state; POST advance step / complete funnel, save preferred sports. |

---

## Deliverables checklist

- **App walkthrough** — Step `app_walkthrough` with four cards: Dashboard, Leagues, Draft & tools, AI assistant. Next / Skip.
- **Pick favorite sports** — Step `sport_selection`: “Pick your favorite sports”; multi-select (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer); preferences saved to profile and used for personalization. Next / Skip.
- **Show AI features** — Step `tool_suggestions`: card layout with Trade Analyzer, Waiver AI, Draft War Room, Chimmy Chat; each has “Try it” link to the tool. Next / Skip.
- **Suggest leagues** — Step `league_prompt`: “Create league” → `/create-league`, “Discover suggested leagues” → `/app/discover`, “Create bracket pool” → `/brackets/leagues/new`; “Skip — go to dashboard” completes funnel. All CTAs use `min-h-[44px]` and `touch-manipulation` for mobile.
