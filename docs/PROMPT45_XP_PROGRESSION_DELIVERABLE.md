# Prompt 45 — Career XP + Tier System + Full UI Click Audit (Deliverable)

## 1. XP system architecture

Career XP is now a full progression subsystem with persisted event history, global profile tiering, and sport-aware filtering.

- **Core modules**
  - `lib/xp-progression/XPProgressionEngine.ts`
  - `lib/xp-progression/TierResolver.ts`
  - `lib/xp-progression/XPEventAggregator.ts`
  - `lib/xp-progression/ManagerXPQueryService.ts`
- **Primary storage**
  - `ManagerXPProfile` stores global progression per manager.
  - `XPEvent` stores normalized XP events by source and sport.
- **Flow**
  1) run XP aggregation (`/api/xp/run`)  
  2) write generated `XPEvent` rows  
  3) recompute global `totalXP` from all events for manager  
  4) upsert tiered `ManagerXPProfile`  
  5) surface via profile, leaderboard, event history, and AI explain APIs

## 2. Tier calculation logic

- Tier thresholds remain:
  - Bronze GM: 0
  - Silver GM: 100
  - Gold GM: 300
  - Elite GM: 600
  - Legendary GM: 1000+
- Resolver behavior:
  - `getTierFromXP(totalXP)` picks tier by threshold floor.
  - `getProgressInTier(totalXP)` computes 0-100 progress in current span.
  - `getXPRemainingToNextTier(totalXP)` now provides true remaining XP (Legendary = 0).
- UI progress labels now align with remaining XP semantics (no misleading tier-span display).

## 3. Schema additions

No new migration needed in this pass; Prompt 45 schema already exists:

- `manager_xp_profiles`
- `xp_events`

Existing migration:
- `prisma/migrations/20260320000000_add_xp_progression/migration.sql`

## 4. UI integration points

Updated XP UI is centered in `components/app/tabs/CareerTab.tsx`:

- **Your XP card**
  - Tier badge + progress bar
  - `How did I earn this XP?` toggles event history panel
  - `Explain with AI` calls `/api/xp/explain`
- **XP leaderboard**
  - Tier filter
  - Sport filter (`SUPPORTED_SPORTS`)
  - Row actions: `How earned` and `Explain AI`
- **XP event history panel**
  - Manager-scoped history
  - Event-type dropdown filter
  - Refresh, loading, and error states

Additional UX hardening:
- profile page badge now exposes XP-load failure state (`XP unavailable`).
- run/explain paths now handle non-200 responses and show meaningful errors.

## 5. UI click audit findings

### Verified click paths and wiring

- Career tab refresh -> `refreshXPProfile`, `refreshXPLeaderboard`, `refreshXPEvents`.
- Run XP engine -> `POST /api/xp/run` -> profile + leaderboard + events refresh.
- Tier dropdown -> `useXPLeaderboard({ tier })`.
- Sport dropdown -> `useXPLeaderboard({ sport })` -> `/api/xp/leaderboard?sport=...`.
- `How did I earn this XP?` / `How earned` -> event history panel via `useXPEvents`.
- `Explain with AI` / `Explain AI` -> `POST /api/xp/explain`.
- Progress bars and tier badges render from profile/leaderboard state and update after run/refresh.

### Issues found and fixed

1. Duplicate XP controls (`How did I earn this XP?` and `Explain`) were functionally identical.  
   - Split into separate behaviors: history vs AI explain.
2. XP run/explain paths accepted failed responses silently.  
   - Added `res.ok` checks and explicit error messaging.
3. XP leaderboard lacked sport filter despite sport-aware event model.  
   - Added sport dropdown and sport-aware backend query path.
4. XP event history API existed but was not surfaced in Career tab.  
   - Added a full event-history panel with filters and refresh.
5. Progress-bar “to next tier” value represented span, not remaining.  
   - Added remaining-XP resolver and aligned UI label.
6. Profile badge had no failure visibility.  
   - Added error fallback indicator on profile page.

## 6. QA findings

### Backend aggregation coverage

`XPEventAggregator` now awards XP for:
- `win_matchup`
- `make_playoffs`
- `championship`
- `successful_trade`
- `draft_accuracy`
- `league_participation`
- `season_completion`
- `commissioner_service`

### API and query behavior

- `/api/xp/leaderboard` now supports sport filter and forwards normalized sports.
- `/api/xp/events` validates/normalizes sport and eventType filter.
- `/api/xp/run` remains auth-required and now blocks running other manager IDs.
- profile tier fields are derived from total XP on read to prevent stale tier drift.

### Executed checks

- `npm run typecheck` ✅
- `npx vitest run __tests__/xp-tier-resolver.test.ts __tests__/xp-routes-contract.test.ts __tests__/gm-economy-routes-contract.test.ts` ✅
- `npx vitest run __tests__/prompt4-multisport-ui-ai-integration.test.ts` ✅

## 7. Issues fixed

- Implemented missing XP source ingestion for trade, draft, participation, commissioner service.
- Added sport-aware XP leaderboard filtering end-to-end (hook -> API -> query service).
- Added and wired XP event history panel in Career tab.
- Hardened run/explain button flows against backend failures.
- Corrected progress-bar next-tier semantics.
- Added profile-level XP error indicator.
- Added route and tier contract tests for XP subsystem.

## 8. Final QA checklist

- [ ] Run XP engine from Career tab; verify profile + leaderboard + event history refresh.
- [ ] Verify XP events appear for matchup/playoff/championship/trade/draft/participation/season/commissioner sources.
- [ ] Verify tier transitions around boundaries: 99/100, 299/300, 599/600, 999/1000.
- [ ] Verify progress bar label reflects remaining XP to next tier.
- [ ] Verify XP leaderboard tier filter works.
- [ ] Verify XP leaderboard sport filter works across NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- [ ] Verify `How did I earn this XP?` and `How earned` open correct manager history.
- [ ] Verify AI explain buttons return narrative and handle errors gracefully.
- [ ] Verify profile page shows badge when loaded and `XP unavailable` on failure.
- [ ] Verify `/api/xp/run` denies unauthenticated and cross-manager unauthorized calls.

## 9. Explanation of the XP progression system

The Career XP system is now a persistent, gamified progression layer that rewards both competitive outcomes and managerial behavior across leagues and sports. Every qualifying action creates an XP event. Those events roll into a single manager-level XP profile, which determines current tier and progress to the next tier. The UI now supports both narrative understanding (`Explain with AI`) and factual auditing (`How earned` event history), while maintaining sport-aware filtering and cross-sport aggregation. This gives managers a clear long-term progression identity (Bronze -> Legendary) and a robust foundation for future progression mechanics.
