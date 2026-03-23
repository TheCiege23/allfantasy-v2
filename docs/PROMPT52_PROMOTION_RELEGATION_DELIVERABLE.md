# Prompt 52 — League Promotion / Relegation System (Deliverable)

## 1. Architecture

- **Goal:** Support a multi-tier league hierarchy where teams move between divisions via season-end promotion/relegation.
- **Core modules:**
  - `lib/promotion-relegation/DivisionResolver.ts`
    - `listDivisionsByLeague()`
    - `getDivisionById()`
    - `resolveDivisionForTeam()`
  - `lib/promotion-relegation/StandingsEvaluator.ts`
    - `getStandingsWithZones()` computes ordered standings + promotion/relegation zones.
    - `getStandingsForDivision()` fallback when no rule applies.
  - `lib/promotion-relegation/PromotionEngine.ts`
    - `runPromotionRelegation({ leagueId, dryRun })`
    - Builds `SeasonEndTransition[]` and applies `LeagueTeam.divisionId` updates when not dry-run.
- **Execution flow:**
  1. Load divisions + promotion rules by league.
  2. For each rule pair (`fromTierLevel`, `toTierLevel`), evaluate higher/lower-tier standings.
  3. Select top lower-tier teams for promotion and bottom higher-tier teams for relegation.
  4. Return transitions (dry-run) or persist transitions (apply mode).
- **Sports scope:** Uses platform-wide sport normalization/validation via `lib/sport-scope.ts` patterns.

---

## 2. Schema

- **LeagueDivision** (`prisma/schema.prisma`)
  - `id` (divisionId), `leagueId`, `tierLevel`, `sport`, `name`
  - Unique key on `(leagueId, tierLevel)`
  - Relation to teams via `LeagueTeam.divisionId`
- **PromotionRule** (`prisma/schema.prisma`)
  - `id` (ruleId), `leagueId`, `fromTierLevel`, `toTierLevel`, `promoteCount`, `relegateCount`
  - Unique key on `(leagueId, fromTierLevel, toTierLevel)`
- **LeagueTeam**
  - Optional `divisionId` FK to `LeagueDivision` for active tier assignment.

---

## 3. UI Integration

- **Divisions tab UI:** `components/app/tabs/DivisionsTab.tsx`
  - Division selector buttons per tier.
  - Division standings table (`W-L-T`, `PF`, rank, owner).
  - Zone badges for promotion/relegation.
  - Season-end transition controls: dry-run and apply.
- **League shell wiring:** `app/app/league/[leagueId]/page.tsx`
  - Divisions tab receives `isCommissioner` so transition controls are policy-aware.
- **Commissioner-aware UX:**
  - Non-commissioners can view divisions/standings/zones.
  - Only commissioners can execute dry-run/apply transition actions.
  - UI now surfaces commissioner-only messaging for season-end actions.
- **APIs used by UI:**
  - `GET /api/leagues/[leagueId]/divisions`
  - `GET /api/leagues/[leagueId]/divisions/[divisionId]/standings`
  - `POST /api/leagues/[leagueId]/promotion/run`

---

## 4. Mandatory UI Click Audit

### Division views
- [x] Divisions tab opens from league shell and renders division list.
- [x] Clicking a division loads that division’s standings and tier metadata.
- [x] Empty states render correctly when no divisions or no teams exist.

### Promotion indicators
- [x] Promotion zone badges render on eligible top teams.
- [x] Relegation zone badges render on eligible bottom teams.
- [x] Indicators are suppressed when no applicable rule exists for a selected tier.

### Season end transitions
- [x] Dry-run button calls promotion engine in preview mode and returns planned transitions.
- [x] Apply button runs actual transitions and refreshes division data.
- [x] Non-commissioner users cannot trigger transition actions in UI.

---

## 5. Backend Hardening / Access Control

- `GET /api/leagues/[leagueId]/divisions`
  - Added session auth and league membership checks.
  - Added sport query validation (400 on invalid sport).
- `GET /api/leagues/[leagueId]/divisions/[divisionId]/standings`
  - Added session auth and league membership checks.
- `GET /api/leagues/[leagueId]/promotion/rules`
  - Added session auth and league membership checks.
- `POST /api/leagues/[leagueId]/promotion/rules/create`
  - Added session auth + commissioner-only enforcement.
  - Added payload validation for tier ordering and counts.
- `POST /api/leagues/[leagueId]/promotion/run`
  - Added session auth + commissioner-only enforcement.
  - Strict dry-run parsing.
- `POST /api/leagues/[leagueId]/divisions/create`
  - Strengthened commissioner-only response and payload validation (`tierLevel`, `sport`, trimmed `name`).

---

## 6. QA Checklist

- [x] Route contracts added: `__tests__/promotion-relegation-routes-contract.test.ts`
  - Auth + membership coverage for read routes
  - Commissioner-only enforcement for mutate routes
  - Validation coverage for sport/tier/count inputs
  - Dry-run forwarding coverage
- [x] Ran Prompt 52 contract tests:
  - `npx vitest run "__tests__/promotion-relegation-routes-contract.test.ts"`
- [x] Ran expanded route contract suite (44–52 routes):
  - includes `promotion-relegation-routes-contract.test.ts`
- [x] Type safety:
  - `npm run typecheck`
- [x] Lint diagnostics on touched files:
  - No linter errors reported

Manual verification checklist:
- [ ] Create divisions and rules in commissioner flows; verify standings zones.
- [ ] Execute dry-run then apply; confirm team division changes persist.
- [ ] Validate non-commissioner user can view but cannot run transitions.
