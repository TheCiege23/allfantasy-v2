# Prompt 45 — Career XP + Tier System + Full UI Click Audit (Deliverable)

## 1. XP System Architecture

- **Purpose:** Gamified progression where managers earn XP from in-app actions (matchup wins, playoffs, championships, trades, season completion, draft accuracy, league participation, commissioner service) and advance through tiers: Bronze GM → Silver GM → Gold GM → Elite GM → Legendary GM.
- **Data flow:**
  - **Events:** `XPEvent` stores managerId, eventType, xpValue, sport, createdAt. Event types: win_matchup, make_playoffs, championship, successful_trade, season_completion, draft_accuracy, league_participation, commissioner_service.
  - **Aggregation:** `XPEventAggregator.aggregateXPForManager` reads `SeasonResult` and `Roster` (same pattern as GM Economy / CareerProgressionAggregator): resolves manager → rosters by platformUserId; loads season results by rosterId = managerId and by rosterId in Roster.ids; merges by league:season; for each season emits XP for wins (matchup), season completion, playoffs, and championship. Optionally writes `XPEvent` rows.
  - **Tier resolution:** `TierResolver` — `getTierFromXP(totalXP)`, `getXPToNextTier`, `getProgressInTier` (0–100 for progress bar), `getTierBadgeColor`. Thresholds: Bronze 0, Silver 100, Gold 300, Elite 600, Legendary 1000+.
  - **Profile:** `ManagerXPProfile` holds managerId, totalXP, currentTier, xpToNextTier, updatedAt. One row per manager; indexes on totalXP and currentTier for leaderboards.
  - **Engine:** `XPProgressionEngine.runForManager` clears existing XPEvents for the manager (to avoid duplicates on re-run), runs aggregator with writeEvents: true, then upserts ManagerXPProfile from aggregated totalXP and TierResolver. `runForAllManagers` runs for all distinct platformUserIds from Roster.
  - **Query:** `ManagerXPQueryService` — getProfileByManagerId, getOrCreateProfileView (default 0 XP when no profile), getEventsByManagerId (sport/eventType/limit), getLeaderboard (tier, limit).
  - **Explain:** `XPExplainService.explainXPForManager` builds narrative from profile + events (breakdown by event type: label, count, total XP). Exposed via POST /api/xp/explain.
- **Sport:** All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) via `lib/sport-scope`; events store sport; leaderboard is global (no sport filter on profile).
- **Preserved:** GM Economy, Legacy Score, Reputation, Hall of Fame, and existing Career tab behavior unchanged. XP is additive (new tables, engine, APIs, Career tab XP section).

---

## 2. Tier Calculation Logic

- **Tiers and thresholds (min totalXP):** Bronze GM 0, Silver GM 100, Gold GM 300, Elite GM 600, Legendary GM 1000.
- **XP to next tier (for progress bar):** Bronze→100, Silver→200, Gold→300, Elite→400, Legendary→0 (max tier).
- **Progress in tier:** `progressInTier = min(100, round((totalXP - threshold) / xpToNextTier * 100))`. Legendary shows 100%.
- **Badge colors (UI):** Bronze orange, Silver zinc, Gold emerald, Elite yellow, Legendary amber.
- **XP values (examples):** win_matchup +10, make_playoffs +50, championship +200, successful_trade +10, season_completion +25, draft_accuracy +15, league_participation +5, commissioner_service +25. Defined in `lib/xp-progression/types.ts` (`XP_VALUES`).

---

## 3. Schema Additions

- **ManagerXPProfile** (`manager_xp_profiles`): id (cuid), managerId (VarChar 128, unique), totalXP (Int default 0), currentTier (VarChar 32), xpToNextTier (Int default 0), updatedAt. Indexes: totalXP, currentTier.
- **XPEvent** (`xp_events`): id (cuid), managerId (VarChar 128), eventType (VarChar 64), xpValue (Int default 0), sport (VarChar 16), createdAt. Indexes: managerId, (managerId, sport), (eventType, createdAt).

Migration: `20260320000000_add_xp_progression`. Apply with `npx prisma migrate deploy`.

---

## 4. UI Integration Points

- **Career tab (app league):** New “Career XP & Tier” section at top of Career tab. Includes:
  - **Your XP card** (when session user is present): progress bar (`XPProgressBar`), tier badge (`XPTierBadge`), “How did I earn this XP?” and “Explain” buttons (POST /api/xp/explain → inline narrative).
  - **Run XP engine** button: POST /api/xp/run (optionally with managerId); then refresh profile + leaderboard.
  - **Refresh** button: refetches XP profile (for current user) and XP leaderboard.
  - **XP Leaderboard:** tier dropdown (All / Bronze / Silver / Gold / Elite / Legendary), list of managerId, tier badge, total XP, “Explain” per row (same explain API; narrative shown inline).
- **Components:** `XPTierBadge` (tier + tierBadgeColor), `XPProgressBar` (progressInTier, totalXP, xpToNextTier, currentTier). Reusable for profile cards or other surfaces.
- **Hooks:** `useXPProfile(managerId)`, `useXPLeaderboard({ tier, limit })`, `useXPEvents(managerId, { sport, eventType, limit })`.
- **APIs:** GET /api/xp/profile?managerId=, GET /api/xp/events?managerId=&sport=&eventType=&limit=, GET /api/xp/leaderboard?tier=&limit=, POST /api/xp/run (body managerId?, sport?), POST /api/xp/explain (body managerId).

---

## 5. UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **Career tab** | Career XP section | — | useXPProfile(managerId), useXPLeaderboard() | — | OK |
| **Career tab** | Refresh (XP) | onClick → refreshXPProfile(); refreshXPLeaderboard() | GET profile, GET leaderboard | Yes | OK |
| **Career tab** | Run XP engine | runXPEngine() | POST /api/xp/run, then refreshXPProfile + refreshXPLeaderboard | Yes | OK |
| **Career tab** | Your XP card | — | useXPProfile(session.user.id) | Refetch on refresh | OK |
| **Career tab** | “How did I earn this XP?” | explainXP(managerId) | POST /api/xp/explain; setXpExplainNarrative | Toggle show/hide | OK |
| **Career tab** | “Explain” (Your XP) | explainXP(managerId) | Same as above | Same | OK |
| **Career tab** | XP Leaderboard tier filter | setXpTierFilter(e.target.value) | useXPLeaderboard({ tier }) | Refetch on change | OK |
| **Career tab** | XP Leaderboard row “Explain” | explainXP(row.managerId) | POST /api/xp/explain | Inline narrative below row | OK |
| **XPTierBadge** | (display only) | — | Props tier, tierBadgeColor | — | OK |
| **XPProgressBar** | (display only) | — | Props progressInTier, totalXP, xpToNextTier, currentTier | — | OK |
| **GET /api/xp/profile** | Your XP, profile card | useXPProfile | Query managerId; returns default 0 XP if no profile | Yes | OK |
| **GET /api/xp/events** | “How did I earn this XP?” (data) | Optional; explain uses profile+events server-side | managerId, sport?, eventType?, limit? | — | OK |
| **GET /api/xp/leaderboard** | XP Leaderboard list | useXPLeaderboard | tier?, limit? | Yes | OK |
| **POST /api/xp/run** | Run XP engine | runXPEngine() | Body managerId? (else all); auth required | refresh after | OK |
| **POST /api/xp/explain** | Explain buttons | explainXP(mid) | Body managerId; returns narrative, totalXP, currentTier, eventSummary | — | OK |

**Notes:**

- All XP buttons (Refresh, Run XP engine, How did I earn this XP?, Explain) are wired to state and API. Leaderboard tier dropdown filters correctly.
- “Your XP” only renders when `session?.user?.id` is present; managerId for profile/run/explain uses that id.
- No dead buttons identified; progress bar and tier badge receive correct props from profile.

---

## 6. QA Findings

- **XP increments:** Aggregator derives XP from SeasonResult (wins → win_matchup, champion → championship, per season → season_completion + make_playoffs). Run engine clears events then re-creates from current data; totalXP and profile update.
- **Tiers:** TierResolver returns correct tier and xpToNextTier for given totalXP; progress bar uses progressInTier (0–100).
- **Progress bars:** XPProgressBar shows current XP, “X to next tier” (or “Max tier” for Legendary), and fill width from progressInTier.
- **Leaderboards:** GET /api/xp/leaderboard supports tier filter; UI dropdown (All / Bronze / … / Legendary) triggers refetch with tier param.
- **Explain:** POST /api/xp/explain returns narrative and eventSummary; “How did I earn this XP?” and “Explain” both use it; narrative displays inline.
- **Auth:** POST /api/xp/run requires session; unauthenticated requests get 401.

---

## 7. Issues Fixed

- **Schema:** ManagerXPProfile and XPEvent added to Prisma schema; migration `20260320000000_add_xp_progression` created and applied.
- **Engine:** XPProgressionEngine (runForManager with clear-events-then-aggregate, runForAllManagers), TierResolver, XPEventAggregator (SeasonResult + Roster, same manager resolution as CareerProgressionAggregator), ManagerXPQueryService, XPExplainService implemented in `lib/xp-progression`.
- **APIs:** GET xp/profile, GET xp/events, GET xp/leaderboard, POST xp/run, POST xp/explain.
- **UI:** Career tab XP section with Your XP card (progress bar, tier badge, How did I earn this XP?, Explain), Run XP engine, Refresh, XP Leaderboard with tier filter and per-row Explain; XPTierBadge and XPProgressBar components; hooks useXPProfile, useXPLeaderboard, useXPEvents.
- **Double-count:** Aggregator merges season results by league:season so the same season is not counted twice when both rosterId=managerId and rosterId=Roster.id exist.
- **Default profile:** getOrCreateProfileView returns a 0-XP view when no profile exists so the UI always has tier and progress bar data.

---

## 8. Final QA Checklist

- [ ] Open app league → Career tab; confirm “Career XP & Tier” section and (if logged in) “Your XP” card with progress bar and tier badge.
- [ ] Click “Run XP engine”; confirm loading then profile and leaderboard update (or empty leaderboard if no rosters/season results).
- [ ] Click “Refresh”; confirm profile and leaderboard refetch.
- [ ] Click “How did I earn this XP?” (and “Explain”) on Your XP; confirm narrative and optional event breakdown.
- [ ] Change XP Leaderboard tier filter; confirm list updates (or empty for that tier).
- [ ] Click “Explain” on a leaderboard row; confirm narrative appears below that row; click again to hide.
- [ ] Verify XP progress bar fills according to progressInTier; Legendary shows “Max tier” and full bar.
- [ ] Verify tier badge colors (Bronze orange, Silver zinc, Gold emerald, Elite yellow, Legendary amber).
- [ ] POST /api/xp/run without auth returns 401.
- [ ] GET /api/xp/profile?managerId= returns default 0 XP when no profile.

---

## 9. Explanation of the XP Progression System

Managers earn **Career XP** from actions across leagues and sports. Each action has a fixed XP value (e.g. +10 for a matchup win, +50 for making playoffs, +200 for a championship, +25 for completing a season). The system aggregates these from **season results** and rosters: your roster membership and win/loss/champion history are combined per league/season so that matchup wins, playoff appearances, championships, and season completions all grant XP. (Future sources can include trades, draft accuracy, league participation, and commissioner service, with event types and values already defined.)

**Total XP** determines your **tier**: Bronze GM (0+), Silver GM (100+), Gold GM (300+), Elite GM (600+), Legendary GM (1000+). The **progress bar** shows how far you are within your current tier toward the next (e.g. 150 XP = Silver, 50/200 toward Gold). **“How did I earn this XP?”** and **Explain** call the explain API, which returns a short narrative and a breakdown by event type (e.g. “Matchup wins (5×, +50 XP); Playoff appearances (2×, +100 XP)”).

The **XP engine** (Run XP engine) recomputes events from current season results and rosters, then updates your profile and the global **XP leaderboard**. The leaderboard can be filtered by tier. All flows are wired so that every button, filter, and navigation path works end-to-end from UI to API to persistence.
