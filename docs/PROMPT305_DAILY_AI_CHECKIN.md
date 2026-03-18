# PROMPT 305 — Daily AI Check-In

## Objective

**Bring users back daily** via a daily engagement loop.

## Feature

**“Ask Chimmy” daily insight** — A daily prompt that encourages users to open Chimmy (AI chat) and ask a focused question. Rotating by day of week; completion feeds into engagement streak.

## Deliverable: Daily Engagement System

### Implementation

| Piece | Description |
|-------|-------------|
| **Daily prompts** | `lib/daily-checkin/daily-prompts.ts` — Rotating prompts by weekday vs weekend (e.g. “What’s the one thing I should focus on in my fantasy league today?”, “Who are the top waiver wire targets…?”, “Give me one lineup tip…”). Deterministic by day of week. |
| **Service** | `lib/daily-checkin/DailyCheckInService.ts` — `getDailyCheckInData(userId)` returns today’s prompt, Chimmy href (with prompt pre-filled), and engagement streak (`completedToday`, `currentStreak`, `longestStreak`, `activeDaysCount`) from `getEngagementStreak`. |
| **API** | **GET /api/daily-checkin** (auth) — Returns daily prompt, `chimmyHref`, and streak. **POST /api/daily-checkin** (auth) — Records `daily_checkin` engagement event and returns updated streak; use when user clicks “Ask Chimmy” so the click counts for today. |
| **Engagement event** | New event type `daily_checkin` in `lib/engagement-engine/types.ts`. Recorded when user starts their daily check-in (e.g. clicks the card CTA). Counts toward “today active” and streak. |
| **UI** | `components/daily-checkin/DailyCheckInCard.tsx` — Client component that fetches GET /api/daily-checkin, shows today’s label and prompt preview, “Ask Chimmy” / “Ask again” CTA (links to Chimmy with prompt), and streak. Optional: call POST on click before navigating so check-in is recorded. |

### Flow

1. User sees **DailyCheckInCard** (e.g. on home or dashboard): “Today’s focus — Ask Chimmy: ‘What’s the one thing I should focus on…?’” with **Ask Chimmy** button.
2. User clicks **Ask Chimmy** → optional POST /api/daily-checkin (records `daily_checkin`) → navigate to Chimmy with prompt pre-filled (`getChimmyChatHrefWithPrompt(daily.prompt)`).
3. User chats with Chimmy (existing flow); other engagement (e.g. `chimmy_chat`) also counts for streak.
4. **Streak** comes from `getEngagementStreak` (engagement-engine): any activity that day (including `daily_checkin`) sets `todayActive` and updates current/longest streak.

### Dependencies

- `lib/engagement-engine` — `recordEngagementEvent`, `getEngagementStreak`.
- `lib/ai-product-layer/UnifiedChimmyEntryResolver` — `getChimmyChatHrefWithPrompt`.

### Placement

- Use **DailyCheckInCard** on the app home page, dashboard, or a dedicated “Daily” section so users see it once per day and are prompted to ask Chimmy.

## Summary

- **Daily engagement system** built around “Ask Chimmy” daily insight: rotating daily prompt, API (GET + POST), `daily_checkin` event, and **DailyCheckInCard** with streak.
- Drives daily return by giving a concrete, low-friction action (one Chimmy question) and surfacing streak to reinforce the habit.
