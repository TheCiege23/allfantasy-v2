# OS Consumer Matrix (Phase 5H Audit)

Which shared canonical facts each OS consumes, and whether it maintains a private competing truth. `C` = canonical/shared, `L` = legacy table, `–` = n/a.

| OS | players | teams | schedules | statistics | history | valuations | projections | injuries | images | freshness | provenance | private truth? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Lineup OS** | C (identity) + L | L | C (games) | L | L | – | – | – | L (headshot) | C (5E) | C (5E) | no |
| **Waiver OS** | C + L (pool) | L | C | L | L | C (FantasyCalc) | – | L (pool) | L | C | C | no |
| **Trade OS** | C (identity) | – | – | L | L | C (FantasyCalc) | – | – | – | C | C | no |
| **Draft OS** | L (pool) | L | – | – | – | C | – | – | L | C | C | no |
| **Matchup OS** | L | L | C (games) | L | L | – | – | – | – | C | C | no |
| **Scoring OS** | L | L | C (games/finality) | L (`PlayerWeeklyScore`) | L | – | – | – | – | C | C | no |
| **Intelligence OS** | C (identity) | C (health) | C | C (evidence avail.) | – | – | – | – | – | C | C | no |
| **Coach / Chimmy** | grounding only | grounding | grounding | grounding | – | – | – | – | – | C | C | no |
| **Observability** | – | – | C (freshness) | C (coverage) | – | – | – | – | – | C | C | no |

## Findings
- **No OS maintains a hidden competing PROVIDER truth** — all provider access is centralized; every OS reads either legacy canonical tables or the certified plane. ✅
- **But most OS still read legacy Prisma tables (`L`) for authoritative facts**, with certified plane (`C`) added as grounding/identity/freshness. This is the documented temporary legacy dependency; converging every `L` to a single canonical port is **REQ-WIRING** (and history/values need **REQ-MIGRATION**).
- **Images and detailed statistics** are the most fragmented consumer inputs (multiple legacy tables/modules).

## Rule going forward
Every OS must depend on the shared canonical port layer. New OS work must not introduce a new private player/team/statistics/image truth. The boundary test (`unified-plane-provider-boundary.test.ts`) enforces no direct-provider imports; a follow-on test should assert canonical-entity-id usage once the canonical port layer is the single source.
