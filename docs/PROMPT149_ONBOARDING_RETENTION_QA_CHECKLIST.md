# PROMPT 149 — Onboarding and Retention Engine: QA Checklist

## Route map

| Route / API | Purpose |
|-------------|---------|
| `/onboarding` | Profile completion (name, phone, verification). |
| `/onboarding/funnel` | First-time flow: welcome → sport selection → tool suggestions → league prompt → completed. Uses WelcomeFlow / OnboardingFunnelClient. |
| `/dashboard` | Main dashboard; shows OnboardingProgressWidget, OnboardingChecklist, ReturnPromptCards when applicable. |
| `GET /api/onboarding/checklist` | Returns onboarding checklist state (tasks, completed count). |
| `POST /api/onboarding/checklist` | Body: `{ milestone }`. Records event (e.g. `onboarding_tool_visit`, `onboarding_first_ai`, `onboarding_referral_share`). |
| `GET /api/retention/nudges` | Returns personalized retention nudges (recap, return, reminders, creator recs, sport-season). |
| `POST /api/retention/nudges/dismiss` | Body: `{ nudgeId }`. Dismisses nudge (persists; cooldown before shown again). |
| `GET/POST /api/onboarding/funnel` | Existing funnel step state and advance. |

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER).

---

## Mandatory click audit

- [x] **Checklist actions route correctly** — Each onboarding checklist task links to the correct destination (sport selection → `/onboarding/funnel`, tools → `/af-legacy?tab=trade-center`, league → `/leagues`, first AI → `/chimmy`, referral → `/referral`). No 404s.
- [x] **Completed tasks persist** — Completing a task (e.g. selecting sports in funnel, joining a league) is reflected after refresh; checklist state comes from profile + league count + EngagementEvent.
- [x] **Reminder cards open correct destination** — Each return/reminder/recap/creator/sport-season nudge has an href and CTA that open the expected page (dashboard, feed, onboarding, leagues, Chimmy, creator profile).
- [x] **Dismiss action works** — Dismiss (X) on a retention card calls `POST /api/retention/nudges/dismiss`; card disappears; same nudge does not reappear within cooldown (e.g. 24h).
- [x] **Return prompts don’t create dead links** — All nudge `href` and CTA values point to valid app routes (no broken or placeholder URLs).
- [x] **Mobile onboarding feels clean and fast** — Funnel and checklist are responsive; tap targets are adequate; no horizontal scroll or clipped content.

---

## Backend requirements

- [x] **Progress persistence** — Checklist state derived from `UserProfile` (preferredSports, onboardingCompletedAt), league count (League where userId), and `EngagementEvent` (onboarding_tool_visit, onboarding_first_ai, onboarding_referral_share). Milestones recorded via `recordMilestone` → EngagementEvent.
- [x] **Event-based milestone tracking** — `OnboardingProgressService.recordMilestone` writes to `EngagementEvent` with eventType and optional meta, with duplicate suppression to avoid event spam.
- [x] **Sport-aware personalization** — Retention rules use `getSettingsProfile(userId).preferredSports` and `SUPPORTED_SPORTS`; creator recommendations and sport-season prompts filter by user sports and in-season windows.
- [x] **Anti-spam notification logic** — `PersonalizedNudgeService.getNudges` limits returned nudges (max 5), applies per-type caps, filters recently dismissed nudges (24h cooldown), sanitizes links, and persists dismissals in `UserProfile.retentionNudgeDismissedAt` (JSON).

---

## Frontend components

- [x] **OnboardingChecklist** — Renders tasks from API or initial state; each task has link and optional milestone record on click; shows completed count and “all set” when full.
- [x] **OnboardingProgressWidget** — Compact “X of Y complete” with link to funnel; hidden when checklist is fully complete.
- [x] **WelcomeFlow** — Multi-step flow (welcome, sports, tools, league); uses `/api/onboarding/funnel`; supports skip and next; sport options from `getSportOptions()` (all 7 sports).
- [x] **ReturnPromptCards** — Fetches `/api/retention/nudges`; renders cards with title, body, CTA link, dismiss button; dismiss calls `/api/retention/nudges/dismiss`.

---

## Retention rule types

- **Recap cards** — e.g. “Your weekly recap” → dashboard.
- **Return nudges** — Based on days since last engagement (e.g. “We miss you”, “Quick check-in”).
- **Unfinished reminders** — e.g. complete onboarding, create/join league.
- **Weekly AI summaries** — CTA to Chimmy for summary.
- **Creator league recommendations** — Public creator leagues by user’s preferred sports.
- **Sport-season prompts** — In-season sport (e.g. NFL in fall) with CTA to app.

---

## Optional / future

- Record `onboarding_first_ai` from Chimmy on first user message.
- Record `onboarding_referral_share` from share/invite actions.
- Weekly AI summary content generation (e.g. Chimmy endpoint).
- A/B tests or frequency caps per nudge type.
