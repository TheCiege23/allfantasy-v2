# Specialty League Factory Template

Reusable architecture for AllFantasy specialty league types (Guillotine, Survivor, Big Brother, Salary Cap, Devy, etc.). Add new types by implementing the extension points and registering a spec.

## Current specialty leagues

- **Guillotine** — Reference implementation; elimination, danger tier, chop, roster release.
- **Salary Cap** — Cap tracking, contracts, auction; registered in wizard; separate config and home.
- **Survivor** — Tribes, tribal council, idols, exile island, tokens, merge/jury; full reusable contracts (PROMPT 350).
- **Zombie** — Status transformation (Survivor/Zombie/Whisperer), resource ledger (serum/weapon/ambush), one-to-many universe, promotion/relegation, weekly board, anti-collusion/neglect, AI recap hooks (PROMPT 357).

## Architecture

- **types.ts** — Extension point interfaces: config, detection, assets, UI components, summary/AI routes, automation, guards, AI, commissioner actions; capabilities, qaHarness.
- **registry.ts** — Central registry: `getSpecialtySpec(id)`, `getSpecialtySpecByVariant(league.leagueVariant)`, `getSpecialtySpecByWizardType(leagueType)`. Guillotine and Survivor registered.
- **League create** — When `leagueType` or `leagueVariant` matches a registered specialty, set `League.leagueVariant` and `avatarUrl`, then call `spec.upsertConfig(leagueId, {})` (see `app/api/league/create/route.ts`).
- **League home** — App league page fetches `leagueVariant` from `/api/leagues/[leagueId]`; use `getSpecialtySpecByVariant(variant)` to decide first-entry modal and Overview content (e.g. render `GuillotineHome` when variant is `guillotine`).
- **Overview tab** — Pass `isSpecialty` (or variant) into Overview tab so it can render the specialty home component instead of the default overview (see checklist: ensure league page passes variant/flag to Overview).

## Extracted Common Patterns (from Guillotine)

| Concern | Pattern | Guillotine location |
|--------|---------|---------------------|
| **Config** | Load from DB by leagueId; fallback from League.settings; sport-aware defaults (e.g. end week by sport) | `GuillotineLeagueConfig.ts`, `lib/sport-scope.ts` |
| **Detection** | Config row exists or `League.leagueVariant === '<variant>'` | `isGuillotineLeague()` |
| **Event log** | Append-only table per league type; typed event types | `GuillotineEventLog.ts` |
| **Guard** | `isEligible(leagueId, rosterId)` — e.g. chopped rosters cannot claim waivers or edit lineup | `guillotineGuard.ts` |
| **Waiver/roster** | Before claim or roster save, call guard or `getExcludedRosterIds` and reject if roster is excluded | Waiver claim + roster save APIs |
| **Intro media** | First-entry modal (localStorage per league), post-draft intro; asset paths from constants or env | `GuillotineFirstEntryModal`, constants |
| **AI** | Deterministic context builder → prompt builder → LLM; entitlement gate; route POST | `lib/guillotine/ai/*`, `/api/leagues/[leagueId]/guillotine/ai` |
| **Standings** | Custom standings shape (e.g. survival order, danger tiers); summary API for home | `GuillotineWeeklySummaryService`, `GuillotineStandingsProjectionService` |
| **Automation** | Weekly/period job: evaluate → eliminate → release rosters → event log | `GuillotineWeekEvaluator`, `GuillotineEliminationEngine`, `GuillotineRosterReleaseEngine` |
| **Commissioner** | Override actions (e.g. manual chop save); optional commissioner tab actions | Guillotine engine `commissionerOverride` |

## Sport scope

All specialty logic must be **sport-aware** where it matters (schedule weeks, positions, etc.). Use `lib/sport-scope.ts`: `SUPPORTED_SPORTS`, `DEFAULT_SPORT`, `normalizeToSupportedSport()`, `isSupportedSport()`.

## Reusable module contracts (PROMPT 350, PROMPT 357)

- **reusable-modules.ts** — Contracts: TribeOrchestration, HiddenPower, PrivateVoting, EliminationPipeline, SidecarLeague, TokenizedReturn, MiniGameRegistry, MergeJuryPhase, OfficialCommandParser, AIHost (context, prompt, generate, ChimmyContextBuilder). **Zombie-derived:** StatusTransformation, ResourceInventoryLedger, OneToManyUniverse, CrossLeagueStandings, PromotionRelegationEngine, WeeklyBoardGeneration, AntiCollusionFlagRegistry, AntiNeglectReplacement, AIRecapHooks. Implementations live in league engines (e.g. lib/survivor, lib/zombie).
- **common-automation.ts** — WeeklyAutomationRunner, AppendEventFn, SeasonPointsSourceFactory, COMMON_AUTOMATION_HOOKS (includes weekly_finalization, movement_refresh, weekly_board_generation, collusion_evaluation, dangerous_drop_evaluation, replacement_workflow).
- **common-ai.ts** — SPECIALTY_AI_RULE, BuildAIContextFn, BuildAIPromptFn, GenerateAIFn, COMMON_AI_HOST_TYPES, COMMON_AI_HELPER_TYPES, COMMON_AI_RECAP_TYPES.
- **qa-harness.ts** — runSpecialtyQAHarness(leagueId, spec), QA_HARNESS_CHECKS.

## Adding a new specialty league

- **Step-by-step checklist:** See **docs/PROMPT350_SPECIALTY_LEAGUE_FACTORY_UPDATE.md** (future specialty league build checklist).
- **Reusable framework (deterministic / automation / AI / sports API / QA):** See **docs/PROMPT343_SPECIALTY_LEAGUE_REUSABLE_FRAMEWORK.md**.
- **Machine-readable categories:** Import `DETERMINISTIC_ENGINE_CATEGORIES`, `AUTOMATION_CATEGORIES`, `AI_CATEGORIES`, `QA_TEMPLATE_SECTIONS` from `@/lib/specialty-league` (or `./framework-categories`).
