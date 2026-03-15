# Prompt 18 — Waiver Defaults by Sport + Full UI Click Audit

## 1. Waiver defaults architecture

- **Single source of truth:** `lib/sport-defaults/SportDefaultsRegistry.ts` holds `WAIVER_DEFAULTS` per `SportType` (NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER). NFL IDP uses the same waiver preset as NFL via `getWaiverDefaults(sportType, formatType)` (variant is ignored for waiver type; IDP only changes roster/draft).
- **Registry layer:** `lib/waiver-defaults/WaiverDefaultsRegistry.ts` exposes `getWaiverPreset(sport, variant)` and re-exports `getWaiverDefaults` for league creation, bootstrap, and processor.
- **Resolvers:**
  - **WaiverPresetResolver** — `resolveWaiverPreset(sport, variant)` returns preset + sport/variant for creation/UI.
  - **LeagueWaiverBootstrapService** — `bootstrapLeagueWaiverSettings(leagueId)` creates `LeagueWaiverSettings` when missing, using `getWaiverDefaults(league.sport, league.leagueVariant)`; idempotent, does not overwrite existing rows.
  - **WaiverProcessingConfigResolver** — `getWaiverProcessingConfigForLeague(leagueId)` returns processing config (waiver_type, processing_days, processing_time_utc, claim_limit, game_lock, free_agent_unlock, continuous_waivers); uses DB when present, else sport/variant defaults.
  - **ClaimPriorityResolver** — `getClaimPriorityRule(tiebreakRule)`, `isFaabPriority(waiverType, tiebreakRule)` for UI and processor.
  - **FAABConfigResolver** — `getFAABConfigForLeague(leagueId)` returns faab_enabled, faab_budget, faab_reset_rules; DB when present, else defaults.
  - **WaiverConfigResolver** — `getWaiverConfigForLeague(leagueId)` aggregates processing + FAAB + effective settings (tiebreak, instant_fa) for the app waiver/config API and WaiverSettingsPanel.
- **Effective settings:** `lib/waiver-wire/settings-service.ts` now has `getEffectiveLeagueWaiverSettings(leagueId)` which returns the DB row when present, otherwise a shape derived from `getWaiverDefaults(league.sport, league.leagueVariant)` so GET settings and commissioner UI always show correct values; waiver process engine uses this so manual runs respect sport defaults when no row exists.
- **Persistence:** `LeagueWaiverSettings` (Prisma) stores waiverType, processingDayOfWeek, processingTimeUtc, claimLimitPerPeriod, faabBudget, faabResetDate, tiebreakRule, lockType, instantFaAfterClear. Commissioner and waiver-wire PUT upsert these; bootstrap only creates when missing.

---

## 2. Per-sport and per-variant waiver preset definitions

All presets live in `SportDefaultsRegistry.ts` under `WAIVER_DEFAULTS`. Variant only affects NFL (IDP uses same as NFL).

| Sport   | waiver_type | processing_days | processing_time_utc | FAAB_budget | faab_enabled | claim_priority | continuous_waivers | free_agent_unlock | game_lock | drop_lock | same_day_add_drop | max_claims_per_period |
|--------|-------------|-----------------|----------------------|-------------|---------------|----------------|--------------------|-------------------|-----------|-----------|-------------------|------------------------|
| NFL    | faab        | [3]             | 10:00                | 100         | true          | faab_highest   | false              | after_waiver_run  | game_time | lock_with_game | allow_if_not_played | null |
| NBA    | faab        | [1, 4]          | 12:00                | 100         | true          | faab_highest   | true               | after_waiver_run  | game_time | lock_with_game | allow_if_not_played | null |
| MLB    | faab        | [1]             | 12:00                | 100         | true          | faab_highest   | true               | after_waiver_run  | first_game | lock_with_game | allow_if_not_played | null |
| NHL    | faab        | [1, 4]          | 12:00                | 100         | true          | faab_highest   | true               | after_waiver_run  | game_time | lock_with_game | allow_if_not_played | null |
| NCAAF  | faab        | [3]             | 10:00                | 100         | true          | faab_highest   | false              | after_waiver_run  | game_time | lock_with_game | allow_if_not_played | null |
| NCAAB   | faab        | [1, 4]          | 12:00                | 100         | true          | faab_highest   | true               | after_waiver_run  | game_time | lock_with_game | allow_if_not_played | null |
| SOCCER | faab        | [1, 4]          | 12:00                | 100         | true          | faab_highest   | true               | after_waiver_run  | slate_lock | lock_with_game | allow_if_not_played | null |

- **faab_reset_rules:** `never` for all in registry (DB has `faabResetDate` for commissioner override).
- **NFL IDP:** Same as NFL; defensive player claims are supported by roster/position logic and player pool; no separate waiver preset.

---

## 3. Backend processor and resolver updates

- **settings-service.ts:** Added `getEffectiveLeagueWaiverSettings(leagueId)`. Returns DB row when present; otherwise builds same shape from `getWaiverDefaults(sport, variant)` (processing_days[0], processing_time_utc, FAAB_budget_default, claim_priority_behavior → tiebreakRule, game_lock_behavior → lockType, free_agent_unlock_behavior → instantFaAfterClear).
- **waiver-wire GET settings:** Uses `getEffectiveLeagueWaiverSettings` instead of `getLeagueWaiverSettings` so response is never null and reflects sport defaults when no row exists.
- **commissioner GET waivers?type=settings:** Same change; commissioner UI sees effective settings.
- **process-engine.ts:** Uses `getEffectiveLeagueWaiverSettings(leagueId)` instead of raw `leagueWaiverSettings.findUnique`; `waiverType` and `faabBudget` (and thus FAAB/rolling/reverse order) come from effective settings so manual waiver run respects sport defaults when no row exists.
- **WaiverConfigResolver (new):** `getWaiverConfigForLeague(leagueId)` combines `getWaiverProcessingConfigForLeague`, `getFAABConfigForLeague`, and `getEffectiveLeagueWaiverSettings` into a single config (waiver_type, processing_days, processing_time_utc, claim_limit, game_lock, free_agent_unlock, continuous_waivers, faab_enabled, faab_budget, faab_reset_rules, sport, variant, tiebreak_rule, instant_fa_after_clear).
- **App API:** Added GET `api/app/league/[leagueId]/waiver/config` (path `league`, leagueId, `waiver`, `config`) returning `getWaiverConfigForLeague(leagueId)`.
- **waiver-defaults/index.ts:** New barrel exporting WaiverDefaultsRegistry, WaiverPresetResolver, LeagueWaiverBootstrapService, WaiverProcessingConfigResolver, ClaimPriorityResolver, FAABConfigResolver, WaiverConfigResolver and their types.

---

## 4. Waiver UI integration updates

- **WaiverSettingsPanel (new):** `components/app/settings/WaiverSettingsPanel.tsx` loads `waiver/config` via `useLeagueSectionData(leagueId, 'waiver/config')` and displays waiver type, processing days/time, claim limit, game lock, free agent unlock, continuous waivers, FAAB enabled/budget/reset, tiebreaker, instant FA after clear, sport/variant.
- **LeagueSettingsTab:** Added “Waiver Settings” subtab and render `WaiverSettingsPanel` when active.
- **WaiverWirePage:** No code change; it already loads settings from `GET /api/waiver-wire/leagues/[leagueId]/settings`, which now returns effective settings (sport defaults when no DB row), so new and legacy leagues show correct rules.
- **CommissionerTab:** No code change; it loads `GET /api/commissioner/leagues/[leagueId]/waivers?type=settings`, which now returns effective settings.

---

## 5. Full UI click audit findings

| Area | Element | Component | Handler | State/API | Persistence/Reload | Status |
|------|--------|-----------|---------|-----------|---------------------|--------|
| League creation | (no dedicated waiver step) | League creation flow | N/A | Waiver defaults applied at bootstrap after create | Bootstrap creates LeagueWaiverSettings from sport/variant | OK |
| Waivers tab | Refresh | WaiverWirePage | `onClick={() => load()}` | `load()` refetches settings, claims, players, roster, history | All from API | OK |
| Waivers tab | Tabs: Available / Pending / History | WaiverWirePage | `onClick={() => setActiveTab(tab)}` | Local `activeTab` | N/A | OK |
| Waivers tab | Claim form open | WaiverPlayerRow → WaiverWirePage | `onAddClick` → `setDrawerPlayer(p); setDrawerOpen(true)` | Local drawer state | N/A | OK |
| Waivers tab | Bid submit | WaiverClaimDrawer | `onClick={handleSubmit}` → `onSubmit(opts)` | `submitClaimForPlayer` POST /claims then `load()` | Persisted by API | OK |
| Waivers tab | Cancel claim | WaiverWirePage (pending list) | `onClick={() => cancelClaimById(c.id)}` | DELETE /claims/[claimId] then `load()` | Persisted | OK |
| Waivers tab | Cancel drawer | WaiverClaimDrawer | `onClick={onClose}` | Parent sets drawer closed | N/A | OK |
| Waivers tab | Add/drop selectors | WaiverClaimDrawer | `<select value={dropId} onChange={...}>` | Local `dropId`; submitted with claim | Sent in POST body | OK |
| Waivers tab | FAAB bid input | WaiverClaimDrawer | `onChange={(e) => setBid(e.target.value)}` | Local `bid`; clamped on submit | Sent in POST body | OK |
| Waivers tab | Filters (search, position, team, status, sort) | WaiverFilters | `onSearchChange`, `onPositionChange`, etc. | WaiverWirePage state; filters applied in `filteredPlayers` | Client-only | OK |
| Waivers tab | League waiver rules (read-only) | WaiverWirePage | N/A | Rendered from `settings` from GET settings | Effective settings now used | OK |
| Waivers tab | Save (pending claim edit) | WaiverWirePage | `onClick` → `updateClaimById(c.id, patch)` | PATCH /claims/[claimId] then `load()` | Persisted | OK |
| Commissioner | Run waiver processing | CommissionerTab | `onClick={triggerWaiverRun}` | POST /commissioner/leagues/[id]/waivers | processWaiverClaimsForLeague | OK |
| Commissioner | Waiver settings (read) | CommissionerTab | Fetched in useEffect | GET waivers?type=settings | Effective settings | OK |
| Settings | Waiver Settings subtab | LeagueSettingsTab | `onClick={() => setActive(tab)}` | Renders WaiverSettingsPanel | N/A | OK |
| Settings | Waiver config (read) | WaiverSettingsPanel | useLeagueSectionData(leagueId, 'waiver/config') | GET /api/app/league/[id]/waiver/config | From resolvers (DB + defaults) | OK |
| Waivers tab | Run AI | WaiversTab | `onClick={runAiAdvice}` | POST .../waivers/ai-advice | N/A | OK |

**Watchlist:** Status filter in WaiverFilters includes “Watchlist” but there is no watchlist persistence in this codebase; filter is client-only. Prompt noted “watchlist or save actions if present” — no backend watchlist found; no change made.

**Commissioner waiver override:** Commissioner can change settings via a dedicated commissioner settings API if one exists; current flow uses CommissionerTab “Run waiver processing” and displays pending/settings. Editing waiver type/FAAB/processing is done via PUT to waiver-wire settings or commissioner waivers PUT; UI for editing in Commissioner tab is not a full form in the audited code (only display + run button). WaiverSettingsPanel is read-only; commissioners can override via API or future commissioner waiver form.

---

## 6. QA findings

- **Waiver settings initialize per sport:** Bootstrap runs on league creation; `getWaiverDefaults(sport, variant)` is used; NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER (and NFL IDP) have distinct presets where applicable. Verified from WAIVER_DEFAULTS and bootstrap mapping.
- **FAAB defaults:** All presets use faab, FAAB_budget_default 100; bootstrap maps to faabBudget; GET settings and waiver/config return faab_enabled and faab_budget; WaiverWirePage and drawer show FAAB when settings.waiverType === 'faab'.
- **Rolling and reverse standings:** orderClaimsForProcessing supports rolling, reverse_standings, fcfs, faab, and default priority order; no regression.
- **NFL IDP claims:** Player pool and roster templates support IDP positions; waiver logic does not exclude defensive players; claim submission uses addPlayerId/dropPlayerId; no change that would block IDP claims.
- **Free agent unlock and lock timing:** Stored in effective settings (instantFaAfterClear, lockType); processing config exposes free_agent_unlock_behavior and game_lock_behavior; sport-specific (e.g. game_time vs first_game vs slate_lock) come from defaults.
- **Existing NFL waiver flows:** Effective settings return same values when a DB row exists; process engine uses same ordering logic with effective waiverType/faabBudget; no intentional breaking change.

---

## 7. Issues fixed

1. **GET settings returning null for leagues without LeagueWaiverSettings** — Replaced with `getEffectiveLeagueWaiverSettings(leagueId)` so response is always a full object (DB or sport/variant defaults). Applied in both waiver-wire GET settings and commissioner GET waivers?type=settings.
2. **Manual waiver run with no DB row** — Process engine now uses `getEffectiveLeagueWaiverSettings` instead of raw findUnique so waiverType and faabBudget follow sport defaults when no row exists.
3. **No central waiver config for app UI** — Added WaiverConfigResolver and GET `/api/app/league/[leagueId]/waiver/config` so the app can show a single waiver config (e.g. WaiverSettingsPanel) consistent with settings and processing.
4. **No Waiver Settings in League Settings** — Added WaiverSettingsPanel and “Waiver Settings” subtab in LeagueSettingsTab, wired to waiver/config.

---

## 8. Final QA checklist

- [ ] Create new league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER); confirm LeagueWaiverSettings created with expected waiver_type, faabBudget, processingDayOfWeek, processingTimeUtc.
- [ ] Open Waivers tab; confirm “League waiver rules” and FAAB/priority badges match league sport.
- [ ] Submit a claim (add-only and add/drop); confirm POST succeeds and list refreshes; confirm pending tab shows claim and Save/Cancel work.
- [ ] As commissioner, run waiver processing; confirm no error and pending count updates.
- [ ] Open Settings → Waiver Settings; confirm waiver/config loads and displays type, days, time, FAAB, lock, unlock, sport/variant.
- [ ] League with no LeagueWaiverSettings (e.g. pre-bootstrap league): open Waivers tab and Commissioner waivers; confirm settings shown from sport defaults; run waiver processing and confirm it uses same defaults.
- [ ] NFL IDP league: confirm defensive players appear in player pool and can be claimed (add/drop).
- [ ] Regression: existing league with existing LeagueWaiverSettings still shows and uses stored values (no overwrite by bootstrap or effective-settings logic).

---

## 9. Explanation of waiver defaults by sport

- **NFL / NFL IDP:** Weekly cadence; waivers process Wednesday (day 3) at 10:00 UTC; FAAB 100; game-time lock; after waiver run free agents unlock. IDP uses same waiver rules; roster and player pool handle defensive positions.
- **NBA:** FAAB 100; processing Monday and Thursday (1, 4) at 12:00 UTC; continuous waivers; game-time lock; lineup-lock-aware behavior from game_lock and unlock.
- **MLB:** FAAB 100; processing Monday (1) at 12:00 UTC; first-game lock (typical for daily lineup sports); continuous waivers; high churn supported by processing and add/drop rules.
- **NHL:** FAAB 100; Monday and Thursday at 12:00 UTC; game-time lock; continuous waivers; skater/goalie claims use same waiver and roster validation.
- **NCAAF:** Same as NFL (Wednesday 10:00 UTC, FAAB 100, weekly cadence); college player pool and schedule drive eligibility.
- **NCAAB:** Same as NBA (Mon/Thu 12:00 UTC, FAAB 100, continuous); college basketball schedule and lineup lock drive behavior.
- **Soccer:** FAAB 100; Mon/Thu 12:00 UTC; slate_lock for game lock (slate-based); continuous waivers; sport-aware claim and lineup timing.

All use `allow_if_not_played` for same-day add/drop, `lock_with_game` for drop lock, and `faab_highest` claim priority when FAAB is enabled. Commissioners can override any stored field via PUT after creation.
