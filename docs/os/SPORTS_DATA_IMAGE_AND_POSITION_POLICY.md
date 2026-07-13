# Image & Position Policy (Phase 5H Audit + Governed Model)

## Canonical position accuracy — status: GOVERNED SERVICE EXISTS (5H-b) + SPORT-ISOLATED (5H-b2); adoption is a governed, per-caller migration
The single governed normalizer is **`lib/sports-data-gateway/canonical/canonicalPosition.ts`** (Phase 5H-b). Phase 5H-b2 hardened it with explicit **sport isolation** (`SUPPORTED_POSITION_SPORTS = ['NFL','NCAAF']`, `isSupportedPositionSport`) so a non-football code can never resolve to a plausible football position (no cross-sport fallback), and added a repo-enforcement test that fails if a **new** competing collapse map is introduced.

### Adoption status (Phase 5H-b2) — full audit of competing position logic
A repo-wide re-audit found **24+ independent position maps / eligibility derivations**. Each audited caller was assessed for safe migration. **None could be migrated in a single safe increment** — each has a concrete disqualifier, so per the "clean checkpoint" rule they are **retained unchanged** and their governed migration path is recorded here:

| Source | Class | Sport | Disposition (why not migrated now) |
|---|---|---|---|
| `canonical/canonicalPosition.ts` | **CANONICAL_SOURCE** | NFL/NCAAF | the governed target (detail-preserving, league-rule eligibility, sport-isolated) |
| `lib/team-abbrev.ts` `POSITION_CANONICAL` | CALLER_TO_MIGRATE (deferred) | NFL | de-facto shared normalizer imported by **~40 files**; it **collapses** DE→DL, CB/S→DB, OLB/ILB→LB and those callers depend on the collapse for **roster-slot legality** — changing it is a tree-wide legality regression. Governed per-caller migration required. |
| `lib/idp-kicker-values.ts` | valuation grouping | NFL | groups collapsed LB/DL/DB + K to assign **dynasty/redraft VALUES** → belongs to **Phase 5H-c (valuation services)**. |
| `lib/dynasty-tiers.ts` | valuation grouping | NFL | age curves / tier values / `isIDPPosition` branch **valuation** → **Phase 5H-c**. |
| `lib/idp/types.ts` `IDP_SPLIT_TO_GROUP` | LEAGUE_RULE_LOGIC | NFL/NCAAF | config-driven IDP split↔group slot families (part of `IdpLeagueConfig`); league legality, not canonical normalization. |
| `lib/sport-teams/SportPlayerPoolResolver.ts` | pool filter grouping | NFL (sport-scoped) | collapses IDP for draft/waiver **player-pool filtering**; already sport-aware; changing it changes filter results. |
| `lib/devy-classification.ts` `normalizePosition` | matching heuristic | NCAAF | long-form CFBD position parse + **intentional** collapse used for name-based **identity matching** (`positionsMatch`, `ATH` wildcard); migrating changes matching. Distinct input domain (full words) from the canonical abbreviation map. |
| `lib/api-football.ts` | OUT_OF_SCOPE | **SOCCER** | soccer sync; **sport isolation** — must NOT pass through the NFL/NCAAF service. |
| `lib/fantrax-parser.ts` | PROVIDER_PARSE_ONLY | import | CSV parser; positions read **verbatim** from cells (`position`/`eligiblePositions`/`primaryPosition`), **no normalization at all** — nothing to migrate; raw parsing is retained. |
| FLEX / SUPER_FLEX derivations (`auto-sub-lineup-engine`, `LineupOptimizerEngine`, `redraft/sportConfig`, `sportConfig/configs/nfl`, `draftPoolPositionGroups`, `trade-engine/rosterPositionFormat`, import mappers) | LEAGUE_RULE_LOGIC | NFL/multi | these ARE the roster-slot **legality** layer the canonical service defers to (`deriveFantasyEligibility` reads league rules); they remain authoritative. |
| `devy/constants.ts` `NBA_POSITION_TO_DEVY`, `nba-devy-adapter.ts` | OUT_OF_SCOPE | **NBA** | sport isolation. |
| `clear-sports/normalize.ts` | stub / unverified provider | multi | trims only; ClearSports is `configured_not_verified`. |

**Net: 0 audited callers force-migrated this increment; each retained with a documented reason.** The highest-impact SAFE slice shipped instead: sport-isolation hardening of the governed service + repo enforcement + contract/scenario tests + this ledger. Position normalization is therefore **NOT yet fully centralized** — the governed *source* exists and is locked, but legacy collapsing normalizers remain the production authority until routed through it via reviewed per-caller migrations (valuation → 5H-c; `team-abbrev` legality collapse → dedicated governed migration).

### Historical position persistence — NOT implemented
The service carries an `effectiveDate` field (append-only intent), but there is **no historical `PlayerPosition` table** and no effective-dated position store today. Persisting position history is **REQ-MIGRATION** (see Canonical Database Map). This doc does not claim historical persistence exists.

### Governed canonical position model (implemented in `canonicalPosition.ts`)
Store the **detailed** canonical position; derive **broad fantasy eligibility separately, governed by league rules**. Never collapse in a way that loses sport-specific meaning.

| field | meaning |
|---|---|
| `providerPosition` | raw provider position (e.g. ESPN `DE`, Sleeper `CB`) |
| `canonicalPrimaryPosition` | detailed canonical (e.g. `DE`, `DT`, `CB`, `S`, `OLB`, `ILB`) |
| `eligibleFantasyPositions` | derived per **league rules** (e.g. `DL` only where the league defines DL; `DB`, `LB`, `FLEX` similarly) |
| `sport` | NFL / NCAAF (isolated pools) |
| `isIDP` | boolean |
| `source`, `timestamp` | provenance + freshness |
| `historicalPositions` | effective-dated changes (append-only) |

Derivation rules (examples — **eligibility governed by league rules, not hardcoded**):
```
DE / DT → DL   only where league rules permit
CB / S  → DB   only where league rules permit
OLB / ILB → LB only where league rules permit
```
Broad buckets are **derived at read time from league config**, never stored destructively over the detailed position.

## Player & team imagery — status: EXISTS-BUT-FRAGMENTED (REQ-NORMALIZE)
Image resolution exists in `lib/player-assets/resolvePlayerHeadshot.ts`, `lib/player-media-urls.ts`, `lib/player-media.ts`; team logos in `TeamAsset.logoUrl`. There is **no single precedence model** across them.

### Governed image precedence (target)
```
1. verified official provider image
2. verified secondary sports provider (e.g. TheSportsDB)
3. approved fallback
4. placeholder
```
Each canonical image record should store: `canonicalEntityId`, `imageUrl`/managed-asset ref, `source`, `retrievalTimestamp`, `status`, `fallbackRank`, `contentValidationResult` (where available).

Rules:
- **Never overwrite a higher-confidence image with a weaker fallback** without explicit precedence.
- **Never present a broken/empty provider URL as a real image** — fall through to the next tier or placeholder.
- Images carry `source` + `retrievalTime` + `freshness/validation` for provenance.

## Honest classification
- **Position system:** governed source BUILT (5H-b) + SPORT-ISOLATED + enforcement-locked (5H-b2); **adoption REQ-NORMALIZE** (per-caller migration of ~40 `team-abbrev` legality callers + valuation callers → 5H-c; 0 migrated so far, each documented above).
- **Image system:** AUDITED · fragmented-but-present · **REQ-NORMALIZE** (unify behind one precedence resolver + a canonical image record; **REQ-MIGRATION** for a dedicated `PlayerImage` table).
- **TheSportsDB** is the intended imagery/identity source but is **BLOCKED** (configured_not_verified) — imagery from it is not yet certified.
