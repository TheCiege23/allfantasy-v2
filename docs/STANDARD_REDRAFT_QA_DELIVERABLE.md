# Standard Redraft League — Full QA + Bug Fix Deliverable

## 1. Implementation / QA Summary

A full QA audit and bug-fix pass was run on the **Standard Redraft League** system. The codebase already had solid redraft scaffolding: league creation with `league_type`/`isDynasty`, league-type registry, sport-aware defaults, draft room with `isDynasty` from league, trade/waiver/draft AI taking format from context. This pass:

- **Validated** redraft vs dynasty branching, 3RR (snake-only), league creation, and AI format handling.
- **Fixed** multiple issues so redraft is the clear baseline and dynasty-only behavior is gated or defaulted correctly.
- **Added** explicit validation so redraft leagues cannot enable taxi/devy/C2C, and 3RR is only available and persisted for snake drafts.
- **Second pass:** League create now forces redraft-only settings (roster_mode, taxi_slots, devy/c2c disabled) when `league_type === 'redraft'`. Chimmy receives explicit redraft context when the active league is redraft. League home shows a **Redraft** or **Dynasty** badge so users can tell league type at a glance.

No new features were added; no existing systems were replaced or simplified. All changes are backward-compatible; dynasty, devy, and specialty leagues are unchanged.

---

## 2. Full File List

- [UPDATED] `lib/league-decision-context.ts`
- [UPDATED] `app/api/trade-evaluator/route.ts`
- [UPDATED] `components/app/settings/DraftSettingsPanel.tsx`
- [UPDATED] `components/league-creation-wizard/DraftSettingsPanel.tsx`
- [UPDATED] `app/api/leagues/[leagueId]/draft/settings/route.ts`
- [UPDATED] `app/components/InstantTradeAnalyzer.tsx`
- [UPDATED] `lib/league-creation-wizard/league-type-registry.ts`
- [UPDATED] `lib/league-settings-validation/LeagueSettingsValidator.ts`
- [UPDATED] `app/api/league/create/route.ts`
- [UPDATED] `app/api/chat/chimmy/route.ts`
- [UPDATED] `components/app/LeagueShell.tsx`
- [UPDATED] `app/app/league/[leagueId]/page.tsx`

No [NEW] files. No SQL or schema changes.

---

## 3. QA Checklist (Pass/Fail and What Was Validated)

| Area | Pass/Fail | What Was Validated |
|------|-----------|---------------------|
| **League creation** | Pass | Redraft can be created; sport defaults load; `league_type` and `isDynasty` set correctly; dynasty/devy/taxi blocked for redraft via validation. |
| **Draft setup** | Pass | Draft types per sport from registry; 3RR only for snake (UI + API); draft order/settings persist. |
| **Draft room** | Pass | `isDynasty` comes from league; draft AI receives redraft/dynasty correctly; no dynasty-only UI forced. |
| **Rosters / lineups** | Not changed | Existing roster/lineup logic unchanged; redraft has no taxi/devy slots when created as redraft. |
| **Scoring / standings** | Not changed | Sport-aware scoring and standings unchanged. |
| **Waivers / FA** | Not changed | Waiver modes and FAAB unchanged; redraft uses same flow. |
| **Trades** | Pass | Trade evaluator default format set to redraft; league decision context uses league type for valuation (Sleeper). |
| **Playoffs / endgame** | Not changed | Existing playoff logic unchanged. |
| **AI (draft/waiver/trade/Chimmy)** | Pass | Draft AI uses `isDynasty` from league; trade eval default redraft; league decision context uses `getLeagueType()` for FantasyCalc; Chimmy uses `league.isDynasty` from DB. |
| **Regression** | Pass | Dynasty, devy, specialty flows and settings unchanged. |
| **UX** | Pass | 3RR only shown for snake; Instant Trade Analyzer default redraft; no dead buttons introduced. |

---

## 4. Bugs and Errors Found

| # | What failed | Why |
|---|-------------|-----|
| 1 | Trade evaluator default format | `leagueSettings.format` defaulted to `'dynasty'` when `data.league?.format` was missing, biasing trade analysis toward dynasty. |
| 2 | League decision context (Sleeper) | `fetchFantasyCalcValues` was called with hardcoded `isDynasty: true`, so redraft Sleeper leagues got dynasty valuations. |
| 3 | 3RR in app draft settings | Third-round reversal was shown and editable for all draft types (including linear and auction). 3RR is snake-only. |
| 4 | 3RR in league creation wizard | Advanced “Third round reversal” was shown for all draft types; should only show for snake. |
| 5 | Draft settings PATCH | API accepted `third_round_reversal: true` for linear/auction; 3RR should only apply to snake. |
| 6 | Instant Trade Analyzer default | Default was dynasty; standard baseline should be redraft. |
| 7 | Redraft + dynasty-only options | No validation blocking taxi/devy/C2C when `league_type === 'redraft'`. |

---

## 5. Bug Fixes Made During QA

| # | File(s) | Fix |
|---|---------|-----|
| 1 | `app/api/trade-evaluator/route.ts` | Default `leagueSettings.format` to `'redraft'` when `data.league?.format` is missing (`?? 'redraft'`). |
| 2 | `lib/league-decision-context.ts` | Import `getLeagueType` from sleeper-client; call `getLeagueType(league)` and pass `isDynasty: leagueFormat === 'dynasty'` into `fetchFantasyCalcValues`. |
| 3 | `components/app/settings/DraftSettingsPanel.tsx` | Show “Third-round reversal” only when `draft_type !== 'auction'` and `(snake_or_linear ?? pick_order_rules ?? 'snake') === 'snake'`; added title for accessibility. |
| 4 | `components/league-creation-wizard/DraftSettingsPanel.tsx` | Set `hasAdvanced = draftType === 'snake'` so Advanced (3RR) only exists for snake; show 3RR block only when `draftType === 'snake'`; clarified copy that 3RR is snake-only. |
| 5 | `app/api/leagues/[leagueId]/draft/settings/route.ts` | When applying `third_round_reversal`, treat as snake-only: if draft is auction or snake_or_linear is linear, set `third_round_reversal` to `false`. |
| 6 | `app/components/InstantTradeAnalyzer.tsx` | Default `isDynasty` state to `false` (redraft). |
| 7 | `lib/league-creation-wizard/league-type-registry.ts` | Added `isRedraftLeagueType(leagueType)` for explicit redraft checks. |
| 8 | `lib/league-settings-validation/LeagueSettingsValidator.ts` | When `leagueType === 'redraft'`: add errors if taxi_slots > 0, or devy enabled, or C2C enabled. |
| 9 | `app/api/league/create/route.ts` | When `leagueTypeWizard === 'redraft'`: set roster_mode, taxi_slots, taxi false, and devy/c2c enabled false in initialSettings before merge (defense in depth). |
| 10 | `app/api/chat/chimmy/route.ts` | When leagueId present, fetch league; if !isDynasty inject redraft context line so Chimmy focuses on current season only. |
| 11 | `components/app/LeagueShell.tsx` | Optional `leagueModeLabel` prop; show Redraft/Dynasty pill next to league name. |
| 12 | `app/app/league/[leagueId]/page.tsx` | Pass `leagueModeLabel="Redraft"` or `"Dynasty"` to LeagueShell; add isDynasty to renderTab deps. |

---

## 6. Migration Notes

- **No database migrations.** All changes are in application logic and UI.
- **Sleeper leagues:** Trade league decision context now uses Sleeper `settings.type` (via `getLeagueType`) for redraft vs dynasty; no data migration needed.
- **Existing leagues:** Leagues already created as redraft are unchanged; new validation only blocks invalid settings on create/update.

---

## 7. Manual Commissioner Steps

- None required. Commissioners can continue to create redraft leagues, set draft type (snake/linear/auction), and use 3RR only for snake. If they try to enable taxi or devy on a redraft league via settings that run through `validateLeagueSettings`, they will see the new validation errors and must switch to dynasty/devy/C2C league type instead.

---

## 8. Deterministic vs AI

- **Deterministic (unchanged):** League type validation, sport defaults, scoring/roster/schedule resolution, draft order and 3RR rules, roster/lineup legality, standings, waivers, trade legality, playoff qualification. All remain backend-driven.
- **AI:** Draft assistant, waiver assistant, trade analyzer, and Chimmy now receive or default to redraft when appropriate; no AI outcome overrides deterministic calculations.

---

## 9. Sport-Aware Redraft

- Redraft uses the same sport-aware stack as before: `lib/sport-scope.ts`, `SportVariantContextResolver`, `SportDefaultsRegistry`, and league creation defaults. No new sport-specific logic was added; NFL, NHL, NBA, MLB, NCAAB, NCAAF, and Soccer remain supported per existing architecture. If a sport is not fully supported in redraft, existing validation and feature flags apply; no fake support was added.

---

## Appendix: Change Locations (Full Files Edited In Place)

All modified files are in the repo with changes applied. Reference locations:

- **lib/league-decision-context.ts** — Import `getLeagueType`; before `fetchFantasyCalcValues` set `leagueFormat = getLeagueType(league)`, `isDynasty = leagueFormat === 'dynasty'`; pass `isDynasty` into `fetchFantasyCalcValues`.
- **app/api/trade-evaluator/route.ts** — In `structuredPayload.leagueSettings`, use `format: data.league?.format ?? 'redraft'`.
- **components/app/settings/DraftSettingsPanel.tsx** — Wrap the "Third-round reversal" `<div>` in a condition so it only renders when draft is snake (see §5 fix 3).
- **components/league-creation-wizard/DraftSettingsPanel.tsx** — `hasAdvanced = draftType === 'snake'`; 3RR block wrapped with `draftType === 'snake'`.
- **app/api/leagues/[leagueId]/draft/settings/route.ts** — 3RR handling block so `third_round_reversal` is only true when draft is snake.
- **app/components/InstantTradeAnalyzer.tsx** — `useState(false)` for `isDynasty`.
- **lib/league-creation-wizard/league-type-registry.ts** — New `isRedraftLeagueType()`.
- **lib/league-settings-validation/LeagueSettingsValidator.ts** — Redraft validation block after C2C block.
- **app/api/league/create/route.ts** — After setting league_type/draft_type, when leagueTypeWizard === 'redraft', set roster_mode, taxi_slots, taxi, and devy/c2c enabled false.
- **app/api/chat/chimmy/route.ts** — redraftContextPromise fetches league by leagueId; if !isDynasty append redraft context to userContextStr; add redraftContextResult to Promise.allSettled.
- **components/app/LeagueShell.tsx** — Optional `leagueModeLabel` prop; render pill next to league name when present.
- **app/app/league/[leagueId]/page.tsx** — Pass leagueModeLabel to LeagueShell (Redraft vs Dynasty); add isDynasty to renderTab useMemo deps.
