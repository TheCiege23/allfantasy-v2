# Prompt 44 — Franchise / GM Economy System + Full UI Click Audit

## 1. GM economy architecture

The system now runs as a career layer on top of existing roster/season, reputation, legacy, and hall-of-fame data.

- **`ManagerFranchiseProfile`** remains the cross-league manager aggregate.
- **`GMProgressionEvent`** is now actively populated by the engine.
- **`GMEconomyEngine`** runs in two phases:
  1) aggregate + upsert profile
  2) idempotently append progression timeline events
- **Sport support** is platform-wide and uses `lib/sport-scope.ts` + `SportCareerResolver` for NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

## 2. Progression logic

`lib/gm-economy/GMEconomyEngine.ts` now writes progression events from real sources:

- **League participation**: `league_joined`
- **Season performance**: `season_completed`, `playoff_appearance`, `finals_appearance`, `championship`
- **Reputation progression**: `reputation_tier_up`
- **Legacy progression**: `legacy_milestone` (score threshold)
- **Career achievements**: `hall_of_fame_induction`

Events are deduped by `eventType + sourceReference` and inserted only if missing, so re-runs are safe.

## 3. Schema additions

No new migration was required in this pass because Prompt 44 schema models already existed:

- `manager_franchise_profiles`
- `gm_progression_events`

Existing migration: `prisma/migrations/20260319000000_add_gm_economy/migration.sql`.

## 4. UI integration points

Updated integrations:

- **Career tab** (`components/app/tabs/CareerTab.tsx`)
  - sport filter for GM leaderboard
  - manager comparison block
  - career timeline block (manager/sport/event filters + refresh)
  - all existing run/refresh/explain interactions preserved
- **Settings > GM Economy** (`components/app/settings/GMEconomyPanel.tsx`)
  - run button now shows completion/failure status
- **Settings tab routing** (`components/app/tabs/LeagueSettingsTab.tsx`)
  - subtab clicks now persist `settingsTab` in URL
- **Right rail AI quick asks** (`components/navigation/SharedRightRail.tsx`)
  - prompts are now clickable and deep-link to Chimmy with prompt prefill

## 5. Full UI click audit findings

### Confirmed wired paths

- Career leaderboard sort/filter, refresh, run engine, explain buttons
- GM timeline filters and refresh
- Manager comparison dropdowns
- Settings > GM Economy run + navigate
- Settings subtab navigation persistence
- Right-rail quick prompts -> AI chat routes

### Fixed issues

1. **Progression events were never persisted**
   - Fixed by writing GM progression events in `GMEconomyEngine`.
2. **Settings subtab URL drift**
   - Fixed by syncing `settingsTab` query param on click.
3. **Invalid `tab` query could leave stale URL**
   - Fixed by normalizing to `Overview` on invalid tab in league page route.
4. **AI quick asks were non-clickable text**
   - Fixed by turning each quick ask into a deep-link to Chimmy.
5. **No GM timeline UI for persisted progression**
   - Fixed by adding timeline section in Career tab with filters and refresh.

## 6. QA findings

- **Type safety**: `npm run typecheck` passes.
- **GM route contracts**: added and passing `__tests__/gm-economy-routes-contract.test.ts`.
- **Multi-sport regression checks**: passing targeted suites:
  - `__tests__/prompt4-multisport-ui-ai-integration.test.ts`
  - `__tests__/league-creation-sport-initialization-e2e.test.ts`
- **No new lints** in touched files.

## 7. Issues fixed

- Implemented GM progression event persistence and dedupe.
- Added sport-aware leaderboard filtering in GM query/hook/API path.
- Added Career timeline + manager comparison UI.
- Added Settings URL/state sync and run status feedback.
- Repaired quick AI prompt click behavior.
- Replaced hardcoded `'NFL'` fallback in career prestige orchestrator with `DEFAULT_SPORT`.

## 8. Final QA checklist

- [ ] Run GM economy from Career tab; verify profile rows refresh and timeline fills.
- [ ] Use sport filters (`NFL`, `NHL`, `NBA`, `MLB`, `NCAAB`, `NCAAF`, `SOCCER`) on leaderboard and timeline.
- [ ] Use manager comparison selectors and verify side-by-side stats change.
- [ ] Click all timeline controls (manager, sport, event type, refresh); verify API data reload.
- [ ] Run GM economy from Settings > GM Economy and verify status message.
- [ ] Switch Settings subtabs and refresh page; verify same subtab persists.
- [ ] Enter invalid `?tab=` manually and verify app normalizes to `Overview`.
- [ ] Click right-rail AI quick asks and verify deep-link to chat with prompt.

## 9. Explanation of the GM economy system

The Franchise/GM Economy System now tracks long-term manager career progression as a persistent, sport-aware platform system:

- `ManagerFranchiseProfile` provides aggregate career status (prestige, value, wins, championships, playoff history).
- `GMProgressionEvent` provides event-by-event history for timeline UX and future economy expansions (badges/titles/cosmetics).
- The Career tab is now a complete progression surface: leaderboard, comparison, timeline, and AI explanation.
- The model remains cross-league by manager identity while preserving per-sport filtering and sport-aware analytics.
