# Specialty League Factory Template

Reusable architecture for AllFantasy specialty league types (Guillotine, Survivor, Big Brother, Salary Cap, Devy, etc.). Add new types by implementing the extension points and registering a spec.

## Architecture

- **types.ts** — Extension point interfaces: config, detection, assets, UI components, summary/AI routes, automation, guards, AI, commissioner actions.
- **registry.ts** — Central registry: `getSpecialtySpec(id)`, `getSpecialtySpecByVariant(league.leagueVariant)`, `getSpecialtySpecByWizardType(leagueType)`. Guillotine is registered as the reference implementation.
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

## Adding a new specialty league

- **Step-by-step checklist:** See **docs/PROMPT336_SPECIALTY_LEAGUE_FACTORY_TEMPLATE.md**.
- **Reusable framework (deterministic / automation / AI / sports API / QA):** See **docs/PROMPT343_SPECIALTY_LEAGUE_REUSABLE_FRAMEWORK.md**.
- **Machine-readable categories:** Import `DETERMINISTIC_ENGINE_CATEGORIES`, `AUTOMATION_CATEGORIES`, `AI_CATEGORIES`, `QA_TEMPLATE_SECTIONS` from `@/lib/specialty-league` (or `./framework-categories`).
