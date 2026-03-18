# PROMPT 353 — Zombie League Backend Engine Deliverable

**Status:** Backend implemented. NFL-first; architecture sport-extensible.

---

## 1. Schema changes

All new models live under `// ========== Zombie League Engine (PROMPT 353) ==========` in `prisma/schema.prisma`.

| Model | Purpose |
|-------|--------|
| **ZombieUniverse** | Groups multiple leagues; name, sport, settings (JSON). |
| **ZombieUniverseLevel** | Level within universe (e.g. Gamma, Beta, Alpha); rankOrder, leagueCount. |
| **ZombieLeague** | Links League to Universe + Level; leagueId unique. |
| **ZombieLeagueConfig** | Per-league config (1:1 League when variant=zombie): whisperer selection, infection rules, serum/weapon/ambush, no-waiver, trade block, dangerous drop threshold. |
| **ZombieLeagueTeam** | Per-roster status: Survivor \| Zombie \| Whisperer; weekBecameZombie, killedByRosterId, revivedAt. |
| **ZombieInfectionLog** | Infection events (survivorRosterId, infectedByRosterId, week, matchupId, reversedAt). |
| **ZombieResourceLedger** | Serum/weapon/ambush balance per roster (resourceType, resourceKey, balance). |
| **ZombieResourceLedgerEntry** | Append-only award/spend lines (delta, reason, week). |
| **ZombieWeeklyWinnings** | Per roster/week amount and source. |
| **ZombieMovementProjection** | Projected level next year (currentLevelId, projectedLevelId, reason). |
| **ZombieAmbushEvent** | Whisperer ambush use (week, fromMatchupId, toMatchupId, targetRosterId). |
| **ZombieAuditLog** | leagueId, universeId?, zombieLeagueId?, eventType, metadata. |

**League relations added:** `zombieConfig ZombieLeagueConfig?`, `zombieLeague ZombieLeague?`.

**Migration:** Run `npx prisma migrate dev --name zombie_league_engine` (or deploy migration as appropriate).

---

## 2. Event / job / background task requirements

| Task | Trigger | Action |
|------|--------|--------|
| **Weekly result finalization** | After matchup results lock (or cron post-week) | Call `finalizeWeek({ leagueId, week, season, zombieLeagueId })` for each zombie league. |
| **Universe standings refresh** | After finalize or on-demand | Call `getUniverseStandings(universeId, season)`; optionally `refreshMovementProjections(universeId, season)`. |
| **Stat correction reversal** | When stats are corrected for a week | Re-run infection for that week: reverse ZombieLeagueTeam status for infected that week, set ZombieInfectionLog.reversedAt; then optionally re-run infection with corrected matchups. |
| **Whisperer selection** | Once at league start (post-draft) | Call `selectAndSetWhisperer(leagueId, config.whispererSelection, seed?)`; ensure `ensureLeagueTeamRows(leagueId, zombieLeagueId)` first. |
| **Collusion / dangerous drop flags** | Periodic or on trade/waiver | Call `evaluateCollusionFlags(leagueId)` and `evaluateDangerousDrops(leagueId)`; persist via `recordCollusionFlags` / `recordDangerousDropFlags`. |

No new queue names are mandated; use existing job runner or cron.

---

## 3. Route list

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/api/leagues/[leagueId]/zombie/summary` | Zombie league summary (config, statuses, whisperer, survivors, zombies, movement watch). |
| GET | `/api/leagues/[leagueId]/zombie/config` | Get zombie league config. |
| PUT | `/api/leagues/[leagueId]/zombie/config` | Upsert zombie league config (body: partial config). |
| POST | `/api/leagues/[leagueId]/zombie/finalize` | Run weekly finalization (body: `{ week, season? }`). |
| GET | `/api/leagues/[leagueId]/zombie/can-trade?rosterId=` | Check if roster can trade (zombie trade restriction). |
| GET | `/api/zombie-universe/[universeId]/standings` | Universe standings and movement projections (query: `season`). |

---

## 4. File manifest ([NEW] / [UPDATED])

- **[UPDATED]** `prisma/schema.prisma` — Added Zombie models and League relations.
- **[NEW]** `lib/zombie/types.ts`
- **[NEW]** `lib/zombie/rosterTeamMap.ts`
- **[NEW]** `lib/zombie/ZombieLeagueConfig.ts`
- **[NEW]** `lib/zombie/ZombieUniverseConfig.ts`
- **[NEW]** `lib/zombie/ZombieAuditLog.ts`
- **[NEW]** `lib/zombie/ZombieOwnerStatusService.ts`
- **[NEW]** `lib/zombie/whispererSelection.ts`
- **[NEW]** `lib/zombie/ZombieInfectionEngine.ts`
- **[NEW]** `lib/zombie/ZombieSerumEngine.ts`
- **[NEW]** `lib/zombie/ZombieWeaponEngine.ts`
- **[NEW]** `lib/zombie/ZombieAmbushEngine.ts`
- **[NEW]** `lib/zombie/ZombieWeeklyWinningsLedger.ts`
- **[NEW]** `lib/zombie/ZombieResultFinalizationService.ts`
- **[NEW]** `lib/zombie/ZombieMovementEngine.ts`
- **[NEW]** `lib/zombie/ZombieUniverseStandingsService.ts`
- **[NEW]** `lib/zombie/ZombieUniverseProjectionService.ts`
- **[NEW]** `lib/zombie/ZombieWeeklyBoardService.ts`
- **[NEW]** `lib/zombie/ZombieCollusionFlagService.ts`
- **[NEW]** `lib/zombie/ZombieValuableDropGuard.ts`
- **[NEW]** `lib/zombie/ZombieReplacementOwnerService.ts`
- **[NEW]** `lib/zombie/index.ts`
- **[NEW]** `app/api/leagues/[leagueId]/zombie/summary/route.ts`
- **[NEW]** `app/api/leagues/[leagueId]/zombie/config/route.ts`
- **[NEW]** `app/api/leagues/[leagueId]/zombie/finalize/route.ts`
- **[NEW]** `app/api/leagues/[leagueId]/zombie/can-trade/route.ts`
- **[NEW]** `app/api/zombie-universe/[universeId]/standings/route.ts`

---

## 5. QA checklist

- [ ] **Infection logic** — Survivor loses to Whisperer or Zombie → status becomes Zombie; InfectionLog and audit written; no infection on tie or when loser not Survivor.
- [ ] **Revive logic** — Serum use at configured count converts Zombie → Survivor; balance decremented; audit and revivedAt set.
- [ ] **Serum timing window** — Config `serumUseBeforeLastStarter`; enforce in UI/API (engine assumes pre-use checks).
- [ ] **Weapon rules** — Score-threshold awards; Zombie cannot wield unless revived; top-two/bomb in config (enforcement in UI if needed).
- [ ] **Ambush legality** — Only Whisperer; balance and per-week count enforced in `canUseAmbush` and `recordAmbushUse`.
- [ ] **Zombie trade restriction** — `can-trade` returns `canTrade: false` when config.zombieTradeBlocked and status === Zombie.
- [ ] **Weekly board data** — `getWeeklyBoardData` returns whisperer, survivors, zombies, movement watch for league and optional universe.
- [ ] **Universe standings** — `getUniverseStandings` aggregates all leagues in universe; totalPoints, winnings, serums, weapons, weekKilled, killedBy.
- [ ] **Promotion/relegation projections** — `refreshMovementProjections` and `getMovementProjections` return current/projected level and reason.
- [ ] **No dead routes** — All listed routes respond (401/403/404/500 as specified); finalize and config require auth and league access.

---

## 6. Implementation notes

- **Roster vs team:** MatchupFact and TeamPerformance use LeagueTeam.id; Zombie uses Roster.id. `getRosterTeamMap(leagueId)` builds the map (draft slot order or index alignment).
- **Whisperer selection:** `selectAndSetWhisperer(leagueId, mode, seed?)` sets one roster to Whisperer and others to Survivor; call after draft and ensure ZombieLeagueTeam rows exist (`ensureLeagueTeamRows` or `initializeLeagueTeams`).
- **Finalization order:** Infection → serum awards (high score) → weapon awards (by threshold) → weekly winnings from matchups. Serums for bash/maul can be added in finalize when bash/maul outcomes are computed.
- **Universe:** Leagues join a universe via ZombieLeague (attachLeagueToUniverse). ZombieLeagueConfig.universeId is optional; ZombieLeague.leagueId is the source of truth for membership.
