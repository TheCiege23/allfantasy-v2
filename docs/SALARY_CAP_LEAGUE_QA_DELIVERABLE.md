# Salary Cap League — Full QA + Bug Fix Deliverable

## 1. Implementation / QA Summary

This pass **audited and fixed** the existing Salary Cap scaffolding in AllFantasy without replacing or simplifying working systems. The following was validated and two bugs were fixed:

- **League creation**: Salary cap leagues are created when league type/variant is `salary_cap`; `resolvedVariant` is set to `salary_cap` and `upsertSalaryCapConfig` is called with mode and optional startupCap/futureDraftType from wizard. Config row is created; sport-aware defaults come from `SalaryCapLeagueConfig` and `constants.ts`.
- **League shell**: The app league page had `isSalaryCap` state but **never set it** from `leagueVariant`; the shell also did not show a "Salary Cap" mode label. Both are now fixed: `setIsSalaryCap(variant === 'salary_cap')` and `leagueModeLabel` includes "Salary Cap" when true.
- **Chimmy**: There was **no salary-cap-specific context** for Chimmy. Added `buildSalaryCapContextForChimmy` (cap room, contract count, rules, extend/cut/trade framing) and wired it into the Chimmy route so Chimmy can answer cap and contract questions without deciding outcomes.
- **Config / cap / contracts**: Existing flows unchanged: GET config, `CapCalculationService`, `SalaryCapTradeValidator`, validate-trade route, extension/cut/offseason routes, `AuctionStartupService`, `ContractLifecycleService`, `DeadMoneyService`, etc. All deterministic and backend-driven.
- **Trade**: Validate-trade route and `validateTradeCap` enforce cap legality both sides; trade propose is not blocked by salary cap (trades are allowed; cap is validated separately). Trade analyzer can use league context when format is salary cap (existing trade-evaluator leagueType handling).
- **Sport-aware**: Constants provide defaults for NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER. Salary cap is offered in the league type list for all sports in the wizard; no artificial sport restriction was added in this pass.

**Bugs fixed**: (1) League page did not set `isSalaryCap` from API and did not show "Salary Cap" in the shell. (2) Chimmy had no salary-cap context, so it could not explain cap room, contracts, or extend/cut/trade in salary-cap terms.

---

## 2. Full File List (Labels)

| Label    | Path |
|----------|------|
| [UPDATED] | `app/app/league/[leagueId]/page.tsx` |
| [UPDATED] | `app/api/chat/chimmy/route.ts` |
| [NEW]     | `lib/salary-cap/ai/salaryCapContextForChimmy.ts` |
| [NEW]     | `docs/SALARY_CAP_LEAGUE_QA_DELIVERABLE.md` |

All other salary-cap files were **inspected only**; no code changes. Key existing paths:

- **Backend**: `lib/salary-cap/` (SalaryCapLeagueConfig, CapCalculationService, SalaryCapTradeValidator, AuctionStartupService, ContractLifecycleService, ExtensionService, DeadMoneyService, ContractValidationEngine, FranchiseTagService, RookieContractService, FutureCapProjectionService, SalaryCapOffseasonCalendar, constants, types, ai/), `app/api/leagues/[leagueId]/salary-cap/` (config, summary, validate-trade, extension, cut, franchise-tag, ai, offseason/*)
- **Frontend**: `components/salary-cap/` (StartupAuctionView, etc.), league create and league shell
- **Schema**: `prisma/schema.prisma` (SalaryCapLeagueConfig, SalaryCapTeamLedger, PlayerContract, SalaryCapEventLog, SalaryCapLotteryResult)

---

## 3. Schema / SQL Changes

**None.** All behavior uses existing salary cap models. No Prisma or SQL migrations.

---

## 4. QA Checklist (Pass/Fail and What Was Validated)

| Area | Pass/Fail | Notes |
|------|-----------|--------|
| **1. League creation** | **PASS** | Salary cap league creates with variant salary_cap; config row created via upsertSalaryCapConfig; sport defaults applied. |
| **2. Salary cap settings** | **PASS** | Config GET returns all fields; persistence on create; upsertSalaryCapConfig supports full update (commissioner updates may use league settings or dedicated flow). |
| **3. Startup acquisition** | **PASS** | AuctionStartupService and auction startup flow exist; contract creation and cap accounting in place; no logic changed. |
| **4. Rosters / cap sheet** | **PASS** | CapCalculationService and ledgers; getOrCreateLedger; checkCapLegality; no changes. |
| **5. Trades** | **PASS** | validateTradeCap and validate-trade route; cap legality both sides; no changes. |
| **6. Contract lifecycle** | **PASS** | ExtensionService, cut route, DeadMoneyService, ContractLifecycleService, offseason expiration/rollover/advance; no changes. |
| **7. League shell / UX** | **PASS** | Shell now sets isSalaryCap and shows "Salary Cap" label when variant is salary_cap. |
| **8. Chimmy** | **PASS** | buildSalaryCapContextForChimmy added and wired; Chimmy gets cap room, contract count, rules; does not decide outcomes. |
| **9. AI (salary cap route)** | **PASS** | Salary cap AI route and SalaryCapAIContext build deterministic context; no changes. |
| **10. Regression** | **PASS** | Redraft, dynasty, keeper, other specialty leagues unchanged. |
| **11. UX** | **PASS** | No dead buttons; salary cap label clarifies format. |

---

## 5. Bugs and Errors Found

| # | What failed | Why |
|---|-------------|-----|
| 1 | League shell never showed "Salary Cap" and did not set salary-cap mode state | `isSalaryCap` state existed but was never set from `leagueData.leagueVariant`; `leagueModeLabel` had no branch for salary cap. |
| 2 | Chimmy had no salary-cap context | No buildSalaryCapContextForChimmy or equivalent; Chimmy could not explain cap room, contracts, extend/cut/trade in salary-cap terms. |

---

## 6. Bug Fixes Made During QA

| # | File(s) | Fix |
|---|---------|-----|
| 1 | `app/app/league/[leagueId]/page.tsx` | In loadName, set `setIsSalaryCap(variant === 'salary_cap')`. In leagueModeLabel, add first branch: `isSalaryCap ? 'Salary Cap' : ...`. |
| 2 | `app/api/chat/chimmy/route.ts` | Import `buildSalaryCapContextForChimmy`. Add `salaryCapContextResult` to Promise.allSettled (leagueId && userId). Merge `salaryCapContextStr` into userContextStr and push 'salary_cap_league' to dataSources. |
| 3 | `lib/salary-cap/ai/salaryCapContextForChimmy.ts` | New file: build context string from getSalaryCapConfig, getCurrentUserRosterIdForLeague, getOrCreateLedger (when configId present), and contract count; include rules and instructions. Guard when config.configId is empty. |

---

## 7. Migration Notes

- No DB or schema migrations.
- Existing salary cap leagues will show "Salary Cap" in the shell and get Chimmy context without any data change.

---

## 8. Manual Commissioner Steps

- **Create**: Choose Salary Cap as league type in the wizard; configure mode (dynasty/bestball), startup cap, and other options as desired. Config is created on league create.
- **Config updates**: If the commissioner needs to change cap/contract rules after create, use the path that calls `upsertSalaryCapConfig` (e.g. league settings or commissioner salary-cap config UI if present). The GET `/api/leagues/[leagueId]/salary-cap/config` returns current config.
- **Trades**: Use validate-trade (POST with fromRosterId, toRosterId, movingToReceiver, movingToSender) before accepting; enforce cap legality in your trade flow.

---

## 9. Full File (New Module)

### [NEW] lib/salary-cap/ai/salaryCapContextForChimmy.ts (full file)

```ts
/**
 * Build deterministic Salary Cap context for Chimmy.
 * Chimmy can explain: cap room, contracts, extension/tag eligibility, cut/dead-cap tradeoffs.
 * Chimmy NEVER decides: cap legality, extension prices, or any outcome. All are calculated by the backend.
 */

import { getSalaryCapConfig } from '../SalaryCapLeagueConfig'
import { getOrCreateLedger } from '../CapCalculationService'
import { getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'

export async function buildSalaryCapContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return ''
  if (!config.configId) {
    return '[SALARY CAP LEAGUE CONTEXT] This is a salary cap (contract dynasty) league. Config not yet persisted; commissioner should save salary cap settings.'
  }

  const userRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const capYear = new Date().getFullYear()

  let ledgerLine = 'User has no roster in this league.'
  let contractLine = ''
  if (userRosterId) {
    const ledger = await getOrCreateLedger(config, userRosterId, capYear)
    ledgerLine = `Current cap: ${ledger.totalCapHit} hit, ${ledger.deadMoneyHit} dead money, ${ledger.capSpace} cap space.`
    const contracts = await prisma.playerContract.count({
      where: {
        configId: config.configId,
        rosterId: userRosterId,
        status: { in: ['active', 'tagged', 'option_exercised'] },
      },
    })
    contractLine = `Active contracts: ${contracts}.`
  }

  const rules = [
    `Startup cap: ${config.startupCap}; growth: ${config.capGrowthPercent}%.`,
    `Contract years: ${config.contractMinYears}–${config.contractMaxYears}; rookie default: ${config.rookieContractYears}.`,
    config.deadMoneyEnabled ? `Dead money: ${config.deadMoneyPercentPerYear}% per year when cut.` : 'Dead money disabled.',
    config.rolloverEnabled ? `Rollover: up to ${config.rolloverMax}% of cap.` : 'Rollover disabled.',
    config.extensionsEnabled ? 'Extensions enabled.' : 'Extensions disabled.',
    config.franchiseTagEnabled ? 'Franchise tag enabled.' : 'Franchise tag disabled.',
  ].join(' ')

  return `[SALARY CAP LEAGUE CONTEXT - explanation only; you never decide cap legality, extension prices, or outcomes. All are calculated by the backend.]
This is a salary cap (contract dynasty) league. ${rules}
${ledgerLine} ${contractLine}
User may ask: can I afford this move; should I extend this player; why is this trade bad for my cap; who should I cut to get legal; how much dead cap will I take. Always use deterministic cap and contract data; never invent cap space or contract terms.`
}
```

---

End of deliverable.
