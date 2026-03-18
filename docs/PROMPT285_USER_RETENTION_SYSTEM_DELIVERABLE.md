# PROMPT 285 — User Retention System Deliverable

## Objective

Keep users active with reminders, streaks (non-gambling), AI check-ins, and weekly summaries.

---

## Features Delivered

### 1. Reminders

- **Source:** Retention rules in `lib/onboarding-retention/RetentionRulesService.ts`: **return nudges** (e.g. “We miss you” after 7 days inactive, “Quick check-in” after 3 days) and **unfinished reminders** (complete onboarding, create/join a league).
- **API:** `GET /api/retention/reminders` returns only reminder-type nudges (`return_nudge`, `unfinished_reminder`) for the current user.
- **UI:** Reminders appear in the existing **ReturnPromptCards** on the dashboard (from `GET /api/retention/nudges`); the reminders API is available for a dedicated “Reminders” view if needed.

### 2. Streaks (non-gambling)

- **Definition:** Consecutive days with any app activity (e.g. league view, AI use, app open). No gambling or betting.
- **Logic:** `lib/engagement-engine/UserActivityTracker.ts`: `getEngagementStreak(userId)` computes from `EngagementEvent`: distinct active days, then **current streak** (consecutive days ending today) and **longest streak**.
- **Recording:** Event type `app_open` added; dashboard loads can call `POST /api/engagement/activity` with `eventType: "app_open"` so viewing the app counts as activity. Other events (league_view, chimmy_chat, etc.) also count.
- **API:** `GET /api/retention/streak` returns `{ currentStreak, longestStreak, activeDaysCount, todayActive }`.
- **UI:** **RetentionStreakWidget** on the dashboard shows “X day streak” (and “best: Y” when different). Renders only when the user has at least one streak. On mount it records `app_open` once per session and refetches streak.

### 3. AI check-ins

- **Nudge type:** `ai_check_in` added in `lib/onboarding-retention/types.ts`.
- **Rule:** `getAICheckInNudges(userId)` in `RetentionRulesService` returns one card: “Chimmy check-in” — “Get a quick tip or ask how your league is doing,” CTA “Check in with Chimmy” → `/chimmy`.
- **Inclusion:** AI check-in is merged into `getAllRetentionNudges` and returned by `getNudges` (with dismiss/cooldown). Shown in **ReturnPromptCards** with MessageCircle icon.

### 4. Weekly summaries

- **Existing:** `buildWeeklyRecap`, `generateAndSendWeeklyRecap` in `lib/engagement-engine/WeeklyRecapGenerator.ts`; `GET /api/engagement/weekly-recap` (preview), `POST /api/engagement/weekly-recap` (send notification).
- **UI:** **WeeklySummaryCard** on the dashboard: fetches `GET /api/engagement/weekly-recap`, shows title and body, “Open dashboard” link, and “Send to my notifications” (calls POST to send the recap as an in-app notification).

---

## Key Files

| Area | Path |
|------|------|
| Streak logic | `lib/engagement-engine/UserActivityTracker.ts` (`getEngagementStreak`, `toDateKey`) |
| Streak API | `app/api/retention/streak/route.ts` |
| Reminders API | `app/api/retention/reminders/route.ts` |
| Retention rules | `lib/onboarding-retention/RetentionRulesService.ts` (return nudges, reminders, recaps, weekly summary, **ai_check_in**, creator recs, sport prompts) |
| Nudge types | `lib/onboarding-retention/types.ts` (added `ai_check_in`) |
| Engagement events | `lib/engagement-engine/types.ts` (added `app_open`) |
| Activity API | `app/api/engagement/activity/route.ts` (allows `app_open`) |
| Weekly recap | `lib/engagement-engine/WeeklyRecapGenerator.ts`, `app/api/engagement/weekly-recap/route.ts` |
| Dashboard UI | **`components/dashboard/FinalDashboardClient.tsx`** (main app dashboard at `/app/home`): RetentionStreakWidget after status strip, ReturnPromptCards (reminders + AI check-in) after quick actions, WeeklySummaryCard before Chimmy. Also `app/dashboard/DashboardContent.tsx` (legacy dashboard). |
| Widgets | `components/onboarding-retention/RetentionStreakWidget.tsx`, `WeeklySummaryCard.tsx`, `ReturnPromptCards.tsx` (ai_check_in icon) |

---

## Flow

- **Reminders:** User opens app dashboard (`/app/home`) → ReturnPromptCards fetches `GET /api/retention/nudges` → return and unfinished reminders shown as cards; optional list via `GET /api/retention/reminders`.
- **Streaks:** User opens app dashboard → RetentionStreakWidget records `app_open` (POST /api/engagement/activity) once per session and fetches `GET /api/retention/streak` → displays “X day streak” (and “best: Y”) when > 0. Non-gambling: based on any app activity.
- **AI check-in:** Included in nudges from RetentionRulesService (`ai_check_in`); shown in ReturnPromptCards with MessageCircle icon; CTA “Check in with Chimmy” → `/chimmy`.
- **Weekly summary:** WeeklySummaryCard on dashboard fetches `GET /api/engagement/weekly-recap`; user can “Send to my notifications” via `POST /api/engagement/weekly-recap`.
