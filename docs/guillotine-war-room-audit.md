# Guillotine AF War Room — Audit & Data-Path Decision

_Audited 2026-06-14 against live Neon. Guillotine is its OWN format: SURVIVAL-FIRST. Each
scoring period the lowest team(s) are CHOPPED (eliminated); avoiding last place matters more
than chasing a ceiling. No fabrication of scores, standings, elimination lines, FAAB, or
dropped-player pools._

## Existing guillotine infrastructure

| Area | Status | Notes |
| --- | --- | --- |
| Guillotine config/settings | **complete** | `lib/guillotine/GuillotineLeagueConfig.ts` — `getGuillotineConfig` (eliminationStartWeek/EndWeek, teamsPerChop, dangerMarginPoints, tiebreakerOrder, correctionWindow, rosterReleaseTiming). `GuillotineLeagueConfig` table. |
| League creation / detection | **complete** | `League.guillotineMode` (boolean) + `leagueVariant='guillotine'`. `lib/league-concepts/guillotineDefaults.ts`. |
| Danger / elimination engine | **complete** | `lib/guillotine/GuillotineDangerEngine.ts` `getDangerTiers` → chop_zone / danger / safe tiers + `pointsFromChopZone` (the survival/elimination-line core). Also `GuillotineWeekEvaluator`, `GuillotineEliminationEngine`, `GuillotineStandingsProjectionService`. |
| Survival / scores data | **complete (migrated, empty)** | `GuillotineRosterState` (`choppedAt`/`choppedInPeriod` → eliminated), `GuillotinePeriodScore` (`periodPoints`, `seasonPointsCumul`). Plus season-based set: `GuillotineSeason`, `GuillotineElimination`, `GuillotineSurvivalLog`, `GuillotineWaiverRelease`, `GuillotineAIInsight`. All tables present; 0 rows (no guillotine leagues yet). |
| Roster source | **complete** | Legacy `Roster` (`platformUserId`, `playerData`, `faabRemaining`). |
| Dropped-player pool | **partial / provider-limited** | `GuillotineWaiverRelease` (eliminated rosters' released players → waivers) + `lib/guillotine/playerPoolRecycler.ts` / `GuillotineRosterReleaseEngine.ts`. Tied to `GuillotineSeason`; mark limited when absent. |
| FAAB / waiver | **complete** | `Roster.faabRemaining` + `League` waiver settings; `rosterReleaseTiming` config. |
| Trade support | **provider-limited** | Guillotine typically has no trades; gate on league settings, default OFF. |
| Player value / ADP | **available** | redraft ADP (`AllFantasyAdpSnapshot` leagueType=`redraft`). |
| Projections / weekly scores | **available** | `GuillotinePeriodScore.periodPoints` (actuals) + `fantasyProjection` (projected) for safety margin. |
| Injuries / news | **available** | `fetchRedraftInjuryNews`. |
| Chimmy / global AI | **partial (settings-level)** | `lib/guillotine/ai/guillotineContextForChimmy.ts` (`buildGuillotineContextForChimmy`) is already injected — a lightweight survival summary. The War Room adds a deeper grounding adapter (coexists, like dynasty's two adapters). |
| Frontend tab | **partial** | `GuillotineTab` exists (standings/danger view); no War Room (survival-plan/FAAB/lineup-safety) panel. |
| Entitlement / gating | **complete** | same `war_room_draft_strategy` / AF War Room gate as the other formats. |
| Guillotine War Room (intelligence layer) | **missing** | no `lib/guillotine-war-room`, no context/engines/prompt/routes/panel. |

## Step 3 — data-path decision (native guillotine)

| Concern | Authoritative source |
| --- | --- |
| Detection | `League.guillotineMode === true` OR `leagueVariant === 'guillotine'`. |
| Config / settings | `getGuillotineConfig` (elimination cadence, teamsPerChop, dangerMargin, tiebreaker). |
| **Survival risk / elimination line** | `getDangerTiers` (chop_zone/danger/safe + `pointsFromChopZone`) — the core signal. Driven by `GuillotinePeriodScore` projected/period points + `dangerMarginPoints`. |
| Eliminated / surviving teams | `GuillotineRosterState` (`choppedAt`/`choppedInPeriod`). |
| Standings / scores | `GuillotinePeriodScore` (`periodPoints`, `seasonPointsCumul`) → survival standings (active rosters ranked). |
| Projected safety margin | danger-tier `pointsFromChopZone` + `fantasyProjection` for the user's starters; limited when no projections/scores. |
| Roster / lineup | legacy `Roster.playerData` (user-managed lineup → lineup-safety is relevant), enriched via `SportsPlayer`. |
| FAAB | `Roster.faabRemaining` + league waiver settings. |
| Dropped-player pool | `GuillotineWaiverRelease` (eliminated rosters' released players); limited when absent. |
| Player value | redraft ADP; projections via `fantasyProjection`. |
| Injuries / news | `fetchRedraftInjuryNews`. |
| Trade availability | league settings (default OFF for guillotine). |
| Global Chimmy context | new Guillotine War Room context/engines/prompt (the existing settings summary stays). |

**Decision:** Build a **native** Guillotine War Room (`lib/guillotine-war-room`) over the real
guillotine survival data (`getDangerTiers` + `GuillotineRosterState` + `GuillotinePeriodScore`
+ config) plus legacy `Roster` for lineup/FAAB, redraft ADP/projections/injuries for player
signals, and `GuillotineWaiverRelease` for the dropped-player pool. Every recommendation is
**survival-first**: prioritize not finishing last (safe floor + projected safety margin),
conserve FAAB unless survival risk is high, and weigh eliminated-team drops. Elimination line,
FAAB, scores, and dropped pools are flagged limited when their data is absent — never invented.

## Classification summary
- **complete:** config, detection, danger/elimination engine, survival/score tables (migrated),
  roster source, FAAB, ADP/projection/injury providers, entitlement.
- **available (wire it):** danger tiers, period scores, redraft ADP, projections, injuries.
- **partial / provider-limited:** dropped-player pool (`GuillotineWaiverRelease`, season-based),
  trades (default OFF), settings-level Chimmy summary (extend with War Room grounding).
- **missing/to build:** Guillotine War Room context, engines, prompt, consolidated routes,
  War-Room-grade global-Chimmy grounding, frontend panel, runtime seed + E2E.

## Build plan (mirrors the established standard)
`lib/guillotine-war-room/{types,guillotineWarRoomContext,guillotineWarRoomPrompt,guillotineChimmyGrounding}`
+ engines (`survivalRisk, rosterRisk, lineupSafety, waiver, faab, droppedPlayer, trade(if allowed), weeklyPlan`)
→ `GET /api/leagues/[leagueId]/guillotine-war-room` + `POST .../[action]` →
`GuillotineWarRoomPanel` in `WarRoomTab` → seed + `e2e/guillotine-war-room-runtime.spec.ts`.
