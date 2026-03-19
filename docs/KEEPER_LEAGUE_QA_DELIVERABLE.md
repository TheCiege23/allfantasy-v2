# Keeper League — Full QA + Bug Fix Deliverable

## 1. Implementation / QA Summary

A full QA audit and bug-fix pass was run on **Keeper Leagues** in the AllFantasy codebase. The repo already had keeper scaffolding: league type `keeper` in the wizard, `isKeeperLeagueType` in the registry, keeper config and selections on `DraftSession`, `KeeperRuleEngine`, `KeeperPanel`, keeper locks in the draft board, and trade-evaluator format `redraft` | `dynasty` | `keeper`. This pass:

- **Validated** keeper as a distinct format from redraft and dynasty; keeper creation persists `league_type: 'keeper'` in settings and `isDynasty: false`.
- **Fixed** keeper visibility and context: leagues API now returns `leagueType` from settings so the app can show a **Keeper** badge; Chimmy receives explicit keeper context when the active league is keeper; draft pool excludes locked keeper players so they cannot be picked again.
- **Added** validation so keeper leagues cannot enable devy or C2C; added `isKeeperOnlyLeagueType()` to the league-type registry for exact keeper checks.

No existing systems were replaced or simplified. All changes are backward-compatible; redraft, dynasty, and specialty leagues are unchanged.

---

## 2. Full File List

- [UPDATED] `app/api/leagues/[leagueId]/route.ts`
- [UPDATED] `app/app/league/[leagueId]/page.tsx`
- [UPDATED] `app/api/chat/chimmy/route.ts`
- [UPDATED] `lib/league-settings-validation/LeagueSettingsValidator.ts`
- [UPDATED] `app/api/leagues/[leagueId]/draft/pool/route.ts`
- [UPDATED] `lib/league-creation-wizard/league-type-registry.ts`

- [NEW] `docs/KEEPER_LEAGUE_QA_DELIVERABLE.md`

No SQL or schema changes.

---

## 3. QA Checklist (Pass/Fail and What Was Validated)

| # | Area | Pass/Fail | What Was Validated |
|---|------|-----------|---------------------|
| 1 | League creation | Pass | Keeper can be created via wizard; `league_type` and `isDynasty` persist correctly; keeper is distinct from redraft/dynasty. |
| 2 | Keeper rules | Pass | Keeper config (maxKeepers, deadline, maxKeepersPerPosition) and selections live on DraftSession; APIs and KeeperRuleEngine validate; devy/C2C blocked for keeper in validator. |
| 3 | Pre-draft keeper flow | Pass | KeeperPanel and keeper APIs work; keeper locks built and shown on board; draft pool excludes kept players. |
| 4 | Draft setup | Pass | Draft types and 3RR (snake-only) unchanged; keeper session variant persists in draft settings. |
| 5 | Draft room | Pass | Player pool excludes locked keepers; keeper panel and locks display; duplicate pick prevented by pool exclusion and existing validation. |
| 6 | Rosters / lineups | Pass | No changes; keeper uses same roster/lineup flow as seasonal. |
| 7 | Scoring / standings | Pass | No changes; sport-aware scoring and standings apply. |
| 8 | Waivers / FA | Pass | No changes; same flow for keeper. |
| 9 | Trades | Pass | Trade evaluator accepts `format: 'keeper'`; client can pass league format. |
| 10 | Playoffs / endgame | Pass | No changes; seasonal playoff logic applies. |
| 11 | AI | Pass | Chimmy gets keeper context when active league is keeper; trade eval supports keeper format. |
| 12 | Regression | Pass | Redraft, dynasty, devy, specialty unchanged. |
| 13 | UX | Pass | Keeper badge on league home; labels clear; no dead buttons. |

---

## 4. Bugs and Errors Found

| # | What failed | Why |
|---|-------------|-----|
| 1 | Keeper not visible in UI | Leagues API did not return `league_type`; app could not show "Keeper" badge or distinguish keeper from redraft. |
| 2 | Chimmy treated keeper as redraft | Redraft context was injected whenever `!isDynasty`, so keeper leagues got redraft instructions instead of keeper-specific advice. |
| 3 | Draft pool included kept players | Pool API did not filter out players in keeperSelections; kept players could appear as available and cause duplicate-pick risk or confusion. |
| 4 | Keeper could enable devy/C2C | No validation blocked devy or C2C when `league_type === 'keeper'`; keeper must stay distinct from devy/C2C. |

---

## 5. Bug Fixes Made During QA

| # | File(s) | Fix |
|---|---------|-----|
| 1 | `app/api/leagues/[leagueId]/route.ts` | Select `settings`; derive `leagueType` from `settings.league_type`; return `leagueType` in JSON so UI can show Keeper/Redraft/Dynasty. |
| 2 | `app/app/league/[leagueId]/page.tsx` | Add `isKeeper` state; set from `leagueData.leagueType === 'keeper'`; pass `leagueModeLabel="Keeper"` to LeagueShell when `isKeeper`, before Redraft/Dynasty. |
| 3 | `app/api/chat/chimmy/route.ts` | Replace redraft-only promise with `leagueFormatContextPromise`; fetch league with `settings`; if `leagueType === 'keeper'` inject keeper context; if redraft inject redraft context; append result and dataSource keeper_league or redraft_league. |
| 4 | `lib/league-settings-validation/LeagueSettingsValidator.ts` | When `leagueType === 'keeper'`, add errors if devy or C2C enabled so keeper stays distinct. |
| 5 | `app/api/leagues/[leagueId]/draft/pool/route.ts` | Select `keeperSelections` from draft session; before normalizing, filter `rawList` to exclude any player whose normalized name is in keeper selections so kept players are not in the pool. |
| 6 | `lib/league-creation-wizard/league-type-registry.ts` | Add `isKeeperOnlyLeagueType(leagueType)` (true when `leagueType === 'keeper'`) for exact keeper checks; keep existing `isKeeperLeagueType` for keeper config support. |

---

## 6. Migration Notes

- **No database migrations.** All changes are in application logic and API responses.
- **Existing keeper leagues:** Leagues already created as keeper have `settings.league_type === 'keeper'`; they will now get the Keeper badge and Chimmy keeper context once the app loads the updated API response.

---

## 7. Manual Commissioner Steps

- None required. Commissioners can create keeper leagues from the wizard, set keeper config (max keepers, deadline, max per position) in draft settings/keeper panel, and run the draft as before. Kept players are now excluded from the draft pool automatically.

---

## 8. Deterministic vs AI

- **Deterministic (unchanged):** Keeper league type validation, keeper rule validation (KeeperRuleEngine), keeper count and round-cost enforcement, draft pool exclusion of kept players, draft order and keeper locks (KeeperDraftOrder), roster/lineup legality, scoring, standings, waivers, trade legality, playoffs. All remain backend-driven.
- **AI:** Chimmy receives explicit keeper context when the active league is keeper; trade evaluator already supports `format: 'keeper'` from client. No AI overrides deterministic calculations.

---

## 9. Sport-Aware Keeper

- Keeper uses the same sport-aware stack as redraft/dynasty: `lib/sport-scope.ts`, sport defaults, and league creation. No new sport-specific logic was added; NFL, NHL, NBA, MLB, NCAAB, NCAAF, and Soccer remain supported per existing architecture for keeper where applicable.

---

## 10. Supported vs Unsupported Keeper Features

**Supported in this pass:**

- Keeper league creation and persistence as `league_type: 'keeper'`.
- Keeper config on draft session: maxKeepers, deadline, maxKeepersPerPosition.
- Keeper selections and locks; round-cost; validation via KeeperRuleEngine.
- Draft pool exclusion of kept players; keeper panel and draft board keeper display.
- Keeper distinct from devy/C2C (validation).
- Chimmy keeper context; trade evaluator format keeper.

**Not implemented in this pass (no fake support):**

- Keeper cost mode (fixed round vs prior round vs escalating) beyond round-cost per selection.
- Traded-player or waiver-pickup keeper eligibility flags (no schema or UI); commissioner override exists for eligibility.
- Preseason keeper lock date enforcement (deadline is stored but not enforced in a job).
- Offseason carryover state to next season (architecture may support later; not changed here).

Where a keeper variant is not supported, the codebase does not expose it without validation; the validator blocks devy/C2C for keeper so keeper remains a clean hybrid format.

---

## Appendix: Change Locations (Full Files Edited In Place)

- **app/api/leagues/[leagueId]/route.ts** — Select `settings`; compute `leagueType` from `settings.league_type`; return `leagueType` in response.
- **app/app/league/[leagueId]/page.tsx** — Add `isKeeper` state; set from `leagueData.leagueType`; pass `leagueModeLabel="Keeper"` when `isKeeper` in LeagueShell.
- **app/api/chat/chimmy/route.ts** — League format context: fetch `isDynasty` and `settings`; return keeper or redraft context string based on `league_type`; use `leagueFormatContextResult` and dataSource keeper_league/redraft_league.
- **lib/league-settings-validation/LeagueSettingsValidator.ts** — Block devy and C2C when `leagueType === 'keeper'` with clear errors.
- **app/api/leagues/[leagueId]/draft/pool/route.ts** — Select `keeperSelections`; filter `rawList` by keeper player names before `normalizeDraftPlayerList`.
- **lib/league-creation-wizard/league-type-registry.ts** — Add `isKeeperOnlyLeagueType(leagueType)`.
