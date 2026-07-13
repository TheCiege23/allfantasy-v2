# Image & Position Policy (Phase 5H Audit + Governed Model)

## Canonical position accuracy — status: REQ-NORMALIZE (no single system today)
Position logic is **scattered** across `lib/api-football.ts`, `lib/devy-classification.ts`, `lib/idp-kicker-values.ts`, `lib/dynasty-tiers.ts`, `lib/fantrax-parser.ts` — there is **no single canonical position normalizer**. This is a documented gap.

### Governed canonical position model (target — to be implemented, non-migration where possible)
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
- **Position system:** AUDITED · scattered · **REQ-NORMALIZE** (build one governed canonical position module; broad eligibility derived from league rules).
- **Image system:** AUDITED · fragmented-but-present · **REQ-NORMALIZE** (unify behind one precedence resolver + a canonical image record; **REQ-MIGRATION** for a dedicated `PlayerImage` table).
- **TheSportsDB** is the intended imagery/identity source but is **BLOCKED** (configured_not_verified) — imagery from it is not yet certified.
