# AF Pro Waiver AI

AI-powered waiver recommendations for AllFantasy users.

## What's included

### AF Pro — personal AI recommendations (`pro_waiver_ai`)

Available to all users with an active **AF Pro** (or higher) subscription.

| Feature | Route | Notes |
| --- | --- | --- |
| AI waiver recommendations | `POST /api/ai/waivers/recommend` | Personalized add/drop targets with FAAB bids |
| Chimmy waiver analysis | `POST /api/ai-tools/waiver-intelligence/chimmy` | Deep Chimmy explanation for any waiver context |
| Sleeper league waiver recs | `POST /api/ai/waiver-recs` | Sleeper-backed roster-aware recommendations |
| Waiver deadline reminder | `WAIVER_AI_REMINDER` (NotificationOutbox) | In-app reminder before waiver deadline |

### AF Commissioner — league-wide AI tools (`commissioner_waiver_ai`)

Available to users with an active **AF Commissioner** (or higher) subscription who are also the **league owner (commissioner)**.

| Feature | Route | Notes |
| --- | --- | --- |
| Commissioner waiver AI insights | `POST /api/ai/waivers/commissioner-insights` | Settings health, suspicious patterns, fairness warnings |

### Free (no subscription required)

- Basic waiver processing (cron, admin, commissioner manual run).
- Submitting and cancelling waiver claims.
- Viewing waiver runs and history.
- All waiver types: FAAB, Rolling, Reverse Standings, Standard, FCFS.

## Recommendation output shape

```json
{
  "recommendations": [
    {
      "addPlayerId": "...",
      "addPlayerName": "Justin Jefferson",
      "dropPlayerId": null,
      "dropPlayerName": null,
      "priority": 1,
      "suggestedFaabBid": 45,
      "confidence": "high",
      "risk": "low",
      "reasoning": "Jefferson returns from injury week 7 against a soft CB2...",
      "deeperAnalysisPath": "/chimmy/chat?topic=waiver-analysis&leagueId=...",
      "tags": ["WR", "waiver_target", "faab", "injury_return"]
    }
  ],
  "rosterNeeds": ["WR_depth", "RB_backup"],
  "leagueContext": {
    "leagueId": "...",
    "waiverType": "faab",
    "faabBudget": 1000,
    "faabRemaining": 620
  },
  "generatedAt": "2026-05-10T14:22:00.000Z",
  "meta": {
    "dataGaps": [],
    "mode": "quick"
  }
}
```

## Using the recommendation endpoint

```bash
# POST /api/ai/waivers/recommend — requires AF Pro session
curl -s -X POST http://localhost:3000/api/ai/waivers/recommend \
  -H "Content-Type: application/json" \
  -H "Cookie: <af-pro-session>" \
  -d '{"leagueId":"YOUR_LEAGUE_ID","mode":"quick","includeFaab":true}'
```

Non-Pro response (HTTP 402):

```json
{
  "error": "AF_PRO_REQUIRED",
  "message": "AI waiver recommendations are available with AF Pro.",
  "upgradePath": "/pricing?plan=af-pro&feature=waiver-ai"
}
```

## Commissioner insights endpoint

```bash
# POST /api/ai/waivers/commissioner-insights — requires AF Commissioner + commissioner role
curl -s -X POST http://localhost:3000/api/ai/waivers/commissioner-insights \
  -H "Content-Type: application/json" \
  -H "Cookie: <commissioner-session>" \
  -d '{"leagueId":"YOUR_LEAGUE_ID"}'
```

Non-commissioner response (HTTP 402):

```json
{
  "error": "AF_COMMISSIONER_REQUIRED",
  "message": "League-wide AI waiver tools require AF Commissioner.",
  "upgradePath": "/pricing?plan=af-commissioner&feature=commissioner-waiver-ai"
}
```

## Privacy rules

- Recommendations are **private** — shown only to the requesting user.
- Deeper analysis routes to **Chimmy AI chat** (private per-user conversation).
- **Never** posted to league chat.
- Commissioner insights are visible only to the commissioner, not league members.

## FAAB bid suggestions

When a league uses FAAB and the user has remaining FAAB budget, each recommendation includes a `suggestedFaabBid`. Bids are calculated as a percentage of remaining budget, tiered by priority. These are **suggestions only** — the user must submit their own claim.

## Environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres | ✅ |
| `NEXTAUTH_SECRET` | Session auth | ✅ |
| `CRON_SECRET` | Bearer auth for cron | ✅ for cron |
| `UPSTASH_REDIS_REST_URL` | Redis lock backend | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Redis lock backend | Optional |
| `AF_PRO_DEV_BYPASS` | `true` to bypass AF Pro gate locally | Dev/test only |
| `AF_COMMISSIONER_DEV_BYPASS` | `true` to bypass AF Commissioner gate locally | Dev/test only |

> **Security:** `AF_PRO_DEV_BYPASS` and `AF_COMMISSIONER_DEV_BYPASS` are **never active in `NODE_ENV=production`**. They are safe to set in `.env.local` or Vercel Preview environment only.

## Testing AI waiver endpoints locally

```bash
# 1. Enable dev bypass in .env.local
AF_PRO_DEV_BYPASS=true

# 2. Sign in with any account

# 3. Call the recommendation endpoint
curl -s -X POST http://localhost:3000/api/ai/waivers/recommend \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_next_auth_session_cookie>" \
  -d '{"leagueId":"YOUR_LEAGUE_ID","mode":"quick"}'
```

## Locked preview for non-Pro users

Non-Pro users calling AI endpoints receive HTTP 402 with:

```json
{
  "error": "AF_PRO_REQUIRED",
  "message": "AI waiver recommendations are available with AF Pro.",
  "upgradePath": "/pricing?plan=af-pro&feature=waiver-ai"
}
```

UI components should render a locked card with:

> "AI waiver recommendations are an AF Pro feature."  
> "Unlock AF Pro to get add/drop suggestions, FAAB bids, roster-fit analysis, and waiver deadline reminders."  
> **[Upgrade to AF Pro]** → `/pricing?plan=af-pro&feature=waiver-ai`

## Waiver UI integration

The league waiver experience now integrates AF-gated AI panels directly on the waiver surface:

- Main waiver page: `components/waiver-wire/WaiverWirePage.tsx`
- Personal recommendations panel: `components/waivers/AIWaiverRecommendationsPanel.tsx`
- Commissioner panel: `components/waivers/CommissionerWaiverInsightsPanel.tsx`

### What non-Pro users see

- Core waiver wire remains fully usable (browse players, submit/cancel claims, view history).
- AI recommendations panel shows a locked AF Pro state when API returns `AF_PRO_REQUIRED`.
- Upgrade CTA points to `/pricing?plan=af-pro&feature=waiver-ai`.

### What AF Pro users see

- Personal AI recommendation list from `POST /api/ai/waivers/recommend` with:
  - add player, drop player
  - priority
  - suggested FAAB bid (when available)
  - confidence, risk, reasoning, tags
  - "Ask Chimmy for deeper analysis" link via `deeperAnalysisPath`
- Optional reminder toggle placeholder for waiver deadline reminders (no scheduling side effects yet).

### What AF Commissioner users see

- Commissioner-only panel from `POST /api/ai/waivers/commissioner-insights` with:
  - `settingsHealth`
  - `suspiciousPatterns`
  - `fairnessWarnings`
  - `recommendedSettingsChanges`
- Non-entitled commissioners see locked AF Commissioner upgrade state:
  - "League-wide AI waiver tools require AF Commissioner."
  - CTA to `/pricing?plan=af-commissioner&feature=commissioner-waiver-ai`

### Safety contract

- AI remains recommendation-only.
- No automatic waiver claim submission.
- No automatic league settings changes.
- No automatic league chat posting from AI panels.

## Scheduled waiver AI reminder (future)

The `WAIVER_AI_REMINDER` notification type is implemented in `NotificationOutbox`.  
Call `enqueueWaiverAiReminder()` from `lib/automation/notifications.ts`.

Future Vercel Cron schedule (not yet active):

```json
{
  "path": "/api/cron/waiver-ai-reminders",
  "schedule": "0 18 * * 2"
}
```

Tuned for Tuesday 6pm UTC (typical Wednesday waiver deadline leagues).

## Future roadmap

- **Auto-submit claims** — after user opt-in and preference confirmation. NOT in current phase.
- **User preference learning** — track accepted/ignored recs to improve future suggestions.
- **Push/email/SMS reminders** — Resend/Twilio dispatch from NotificationOutbox worker.
- **Scheduled AI refresh** — rebuild recommendations automatically before each waiver deadline.
- **Injury and schedule integration** — live data feeds for higher-confidence recommendations.

## Related files

- `lib/entitlements/afAccess.ts` — centralized AF Pro / AF Commissioner gate helpers
- `lib/ai/waivers/waiverRecommendationService.ts` — recommendation generation
- `lib/ai/waivers/waiverPreferenceService.ts` — preference event recording
- `lib/automation/notifications.ts` — `enqueueWaiverAiReminder`
- `app/api/ai/waivers/recommend/route.ts` — AF Pro recommendation endpoint
- `app/api/ai/waivers/commissioner-insights/route.ts` — AF Commissioner endpoint
- `app/api/ai/waiver-recs/route.ts` — Sleeper-backed recs (AF Pro gated)
- `app/api/ai-tools/waiver-intelligence/chimmy/route.ts` — Chimmy waiver analysis (AF Pro gated)
