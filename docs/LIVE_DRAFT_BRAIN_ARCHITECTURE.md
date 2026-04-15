# Live Draft Brain — Architecture & Integration Plan

## Purpose

Add a **deterministic-first, AI-second** “Live Draft Brain” layer **on top of** existing draft systems (DraftRoom, `/api/draft-ai`, `/api/draft/recommend`, mock-draft `ai-pick`, ADP pools, trade hooks, commissioner settings). **Nothing in this document replaces** those paths; it **extends** them with strict JSON outputs and shared scoring.

## Existing touchpoints (do not remove)

| Area | Location | Role |
|------|----------|------|
| Draft AI assist | `app/api/draft-ai/route.ts`, `lib/draft-ai-engine` | Deterministic rec + optional explanation |
| Recommend | `app/api/draft/recommend/route.ts` | Token-aware recommendations |
| Mock / scout AI pick | `app/api/mock-draft/ai-pick/route.ts` | Scoring + OpenAI narrative |
| CPU / AI orphan drafter | `lib/automated-drafter/*`, `lib/orphan-ai-manager/*` | Autopick for empty teams |
| ADP | Multi-pool endpoints (existing) | External + site data |
| Trade during draft | `app/api/mock-draft/trade-propose/*` (and league draft trade flows) | Hooks for proposals |

## New module: `lib/live-draft-brain`

| File | Responsibility |
|------|------------------|
| `sport-universe.ts` | League sports via `sport-scope`; extended verticals (`GOLF`, `NASCAR`) for future drafts |
| `deterministic-pick-engine.ts` | Weighted **PickScore** breakdown + top 3 + tier/run signals (uses `computeDraftPlayerRankings`) |
| `combined-adp.ts` | **Combined ADP** blend (external + site + format adjustment) |
| `next-pick-prediction.ts` | Next-pick predictions (snake/linear/auction-aware hooks) |
| `format-adapters.ts` | Draft-format order resolution (traded picks pass **pre-resolved** `upcomingTeamOrder`) |
| `sport-adapters.ts` | Sport weight tuning (NBA/MLB/NHL/Soccer vs NFL) |
| `ai-manager.ts` | Commissioner AI team caps (**max 4**), styles, validation |
| `draft-trade-guardrails.ts` | **No AI↔AI** draft trades; commissioner toggles |
| `post-draft-grade.ts` | Deterministic grade stub + **league chat payload** builder |
| `orchestrator.ts` | `runLiveDraftBrainDeterministic` → strict Zod envelope |
| `schemas.ts` | Strict JSON shapes for UI + AI narration |

### Exported API

- `runLiveDraftBrainDeterministic(input: LiveDraftBrainInput)` → Zod-validated `LiveDraftBrainEnvelope`
- `blendCombinedAdp`, guardrails, AI assignment validators, post-draft helpers

### New HTTP surface

- `POST /api/draft/live-brain` — returns `{ envelope }` for UI panels and for wrapping with Chimmy / unified AI

## Deterministic flow

1. **Rank pool** — `computeDraftPlayerRankings` in `lib/draft-helper/RecommendationEngine.ts` (shared with existing recommendations).
2. **Expand to PickScore** — weighted sub-scores (ADP value, need, scarcity, format, projections when provided).
3. **Narration** — optional AI explains the envelope only (Chimmy `DraftAssistantModule` pattern: `requireDeterministicGrounding`).

## Combined ADP

- Default blend: **55% external / 35% site / 10% format adjustment** (tunable per league).
- Context filters (sport, scoring, draft type, roster size) should be applied **before** calling `blendCombinedAdp` by selecting the correct rows from ADP cache jobs.

## Commissioner AI managers (max 4)

- Store assignments on **draft session / league draft settings** (implementation: extend existing draft settings PATCH pattern, e.g. `lib/draft-defaults` + Prisma when ready).
- Orphan/AI drafter already exists — **wire** `CommissionerAiTeamAssignment` to that executor so assigned teams use `aiStyle` → `LiveDraftAssistantMode`.

## AI draft trades

- Enforce `canAiProposeTrade` / `canAiAcceptTrade` from `draft-trade-guardrails.ts`.
- Add **cooldown + max proposals/hour** in the trade service layer (not in UI only).

## Next-pick prediction

- Pass **`upcomingTeamOrder`** from the draft engine (includes traded picks).
- Auction: pass **budgets** + nomination order when available.

## Post-draft grades + league chat

- Run as **draft-complete job** (queue/cron) or session transition handler.
- Build body via `buildLeagueChatPostDraftPayload`; post through existing **league chat** message API with commissioner flag “post AI grades”.

## UI integration (incremental)

1. **Shipped:** League draft room (`DraftRoomPageClient`) calls `POST /api/draft/live-brain` in parallel with `POST /api/draft/recommend` when you are on the clock; `DraftHelperPanel` renders the **Live Draft Brain** strip (`data-testid="draft-live-brain-panel"`) with top-3 scored picks, next-pick probabilities, and board/run signals.
2. Commissioner modal: AI team assignment (reuse patterns from `DraftRoom` commissioner controls).
3. Toggle: “Post grades to chat” — persisted on league/draft settings.

Payload assembly: `lib/draft-room/buildLiveDraftBrainPayload.ts` (uses `getUpcomingPickOwners` from `DraftOrderService` for snake/linear; auction uses nomination order + budgets when present).

## Performance

- Cache external + site ADP snapshots (existing jobs).
- Brain call should reuse the same **80-player** cap as `RecommendationEngine` for clock-time picks.

## Tests

- Add unit tests for `runLiveDraftBrainDeterministic` with small synthetic boards (Vitest).
