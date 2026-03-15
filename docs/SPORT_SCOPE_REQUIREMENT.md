# Sport Scope Requirement

Sports-related features must support **all seven platform sports** unless a task explicitly requires a single-sport implementation.

## Supported sports

| Code    | Display              |
|---------|----------------------|
| NFL     | NFL                  |
| NHL     | NHL                  |
| NBA     | NBA                  |
| MLB     | MLB                  |
| NCAAF   | NCAA Football        |
| NCAAB   | NCAA Basketball      |
| SOCCER  | Soccer               |

## Guidelines

- **Do not hardcode** UI or API logic for only one sport (e.g. dropdowns that only list NFL, NBA, MLB).
- **Use sport-aware abstractions**: resolvers, templates, and filters that accept `sport` and behave correctly per sport.
- **Prefer a single source of truth** for the sport list where possible (e.g. `SPORT_TYPES` in `lib/sport-defaults/types.ts`, or module-specific `SUPPORTED_SPORTS` that include all seven).
- **Default to a fallback** (e.g. `'NFL'`) only when resolving unknown or missing sport input — not to limit the feature to one sport.

## Reference

- **Types / canonical list**: `lib/sport-defaults/types.ts` — `SportType`, `SPORT_TYPES`
- **League creation**: `lib/league-defaults-orchestrator/SportVariantContextResolver.ts` — `SUPPORTED_SPORTS`
- **Meta / trend / strategy**: `lib/meta-insights/SportMetaUIResolver.ts`, `lib/player-trend`, `lib/strategy-meta`, `lib/global-meta-engine` — all include NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER

## Cursor rule

The same requirement is enforced for the AI agent via **`.cursor/rules/sport-scope.mdc`** (always apply).
