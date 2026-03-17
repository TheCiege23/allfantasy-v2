# PROMPT 186 — AllFantasy Draft Automation vs AI API Architecture

Design for separating **deterministic draft automation**, **rules-engine automation**, **scheduled/cached calculations**, and **AI API usage only where interpretation adds value**. Goal: do not route everything through OpenAI, DeepSeek, or xAI.

---

## 1. Architecture spec

### 1.1 Principles

- **Deterministic-first:** All core draft mechanics (order, timer, validation, autopick, queue, ownership, commissioner controls, completion, reconnect) are pure logic and stored state. No LLM calls in the hot path.
- **Rules-engine for automation:** Queue reorder, CPU pick selection (mock/live orphan), position need scoring, ADP sorting, eligibility, and slot validation use configurable rules and formulas. Optional cached inputs (e.g. AI ADP, meta trends) are **precomputed** and consumed as data, not “call AI at pick time.”
- **AI only when interpretation adds value:** Use AI for explanation, ranking interpretation, trade reasoning, strategy synthesis, and human-style advisory output. Never for: who is on the clock, whether a pick is valid, what the next slot is, or persisting draft state.
- **Cost and latency safety:** AI features are opt-in or on-demand; failures degrade gracefully (no dead buttons); admin can see which features are automated vs AI-powered.

### 1.2 Layered model

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION (draft room UI, mock draft UI)                             │
│  - Labels: "Instant" vs "AI explanation"                                 │
│  - Disable/hide AI actions when AI disabled or unavailable              │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│  EXECUTION POLICY LAYER                                                  │
│  - DraftAutomationPolicy: what runs without AI                           │
│  - AIInvocationPolicy: when AI is allowed and which features             │
│  - Feature flags / platform config for AI availability                   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│ AUTOMATED (no AI) │   │ RULES + CACHED DATA    │   │ AI OPTIONAL / ON-DEMAND│
│ - Timer           │   │ - Queue reorder (need) │   │ - Explain best pick    │
│ - Draft order     │   │ - CPU pick (need+ADP)  │   │ - Explain reach/value  │
│ - Pick validation │   │ - AI ADP (precomputed) │   │ - Trade review         │
│ - Ownership       │   │ - Meta trends (cached) │   │ - Draft recap         │
│ - Commissioner    │   │ - Player filter/sort   │   │ - Queue reorder story  │
│ - Resync          │   │ - Eligibility          │   │ - League story        │
│ - Completion      │   │ - Post-draft summary   │   │ - Coach-style advice  │
└───────────────────┘   └───────────────────────┘   └───────────────────────┘
```

### 1.3 Data flow

- **Automated path:** User action or timer tick → service (e.g. `DraftSessionService`, `PickSubmissionService`, `DraftTimerService`, `DraftOrderService`, `PickValidation`, `PickOwnershipResolver`) → DB / snapshot. No external API.
- **Rules + cached path:** User action or cron → rules engine (e.g. `reorderQueueByNeed`, `RecommendationEngine`, `DraftAIManager` with `useMeta: true`) → reads cached data (AI ADP table, meta trends, player pool) → result. AI ADP and meta are **ingested/scheduled** separately; draft path only reads.
- **AI path:** User explicitly requests explanation/recap/review → check `AIInvocationPolicy` and provider health → call LLM with context envelope → return text. If disabled or unavailable, return fallback message or hide the control.

### 1.4 Graceful degradation

- If AI provider is down or disabled: hide or disable “AI recap,” “Explain reorder,” “Trade review,” etc. Show “Instant” results (deterministic recommendation, reordered queue, post-draft summary numbers) without narrative.
- No dead buttons: every visible action either runs deterministic logic or checks “AI allowed + available” before showing the AI option.

---

## 2. File / folder plan

### 2.1 New or extended modules (policy and visibility)

| Path | Purpose |
|------|--------|
| `lib/draft-automation-policy/` | **DraftAutomationPolicy** — registry of features that run without AI; used by execution layer and admin visibility. |
| `lib/draft-automation-policy/DraftAutomationPolicy.ts` | Define and export list of automated feature IDs (timer, order, validation, queue reorder, CPU pick, etc.). |
| `lib/draft-automation-policy/index.ts` | Re-export policy and types. |
| `lib/ai-invocation-policy/` | **AIInvocationPolicy** — when AI may be invoked and for which draft-related features. |
| `lib/ai-invocation-policy/AIInvocationPolicy.ts` | Check feature flag + provider health for “draft_recap”, “draft_explain”, “trade_review”, “queue_reorder_explain”, etc. |
| `lib/ai-invocation-policy/index.ts` | Re-export. |
| `lib/draft-automation-policy/ExecutionPolicyMatrix.ts` | **Execution policy matrix** — map feature → execution path (automated | rules_and_cached | ai_optional). Used by routes and UI to decide what to call and what to show. |

### 2.2 Existing modules (align with policy)

| Existing path | Role in architecture |
|---------------|------------------------|
| `lib/live-draft-engine/` | **Automated:** Timer, order, pick validation, ownership, session, completion, resync. No AI. |
| `lib/draft-helper/RecommendationEngine.ts` | **Automated:** Deterministic recommendation; already used by `/api/draft/recommend`. |
| `lib/draft-queue-engine/reorder-by-need.ts` | **Rules:** Queue reorder; optional explanation is static or later AI. |
| `lib/ai-adp-engine/` | **Scheduled/cached:** Aggregate picks, compute ADP; cron or on-demand job writes to DB. Draft room **reads** only. |
| `lib/mock-draft-simulator/DraftAIManager.ts` | **Rules + cached:** Need + ADP + optional meta; `predictWithMeta` uses cached meta, not live LLM. |
| `lib/mock-draft-simulator/MetaDraftPredictor.ts` | **Cached:** Reads from MetaQueryService (precomputed). |
| `app/api/leagues/[leagueId]/draft/recap/route.ts` | **AI optional:** Calls `openaiChatText`; should gate with AIInvocationPolicy and degrade. |
| `app/api/leagues/[leagueId]/draft/trade-proposals/.../review/route.ts` | **AI optional:** Trade review; gate and degrade. |
| `lib/feature-toggle/` | **Config:** Add or use keys for AI features (e.g. draft_ai_recap, draft_ai_explain, trade_ai_review). |
| `lib/admin/provider-status-service.ts` | **Health:** Provider availability; AIInvocationPolicy consults for “can call AI”. |

### 2.3 Recommended placement

- **Policies:** New folders `lib/draft-automation-policy/` and `lib/ai-invocation-policy/` keep “what is automated” and “when is AI allowed” explicit and testable.
- **Execution matrix:** Single source of truth in `lib/draft-automation-policy/ExecutionPolicyMatrix.ts` (or equivalent) so routes and UI can branch on feature ID.
- **No change to core engine:** `live-draft-engine`, `DraftOrderService`, `DraftTimerService`, `PickValidation`, `PickOwnershipResolver` remain AI-free; policy layer only documents and optionally checks before calling AI in **other** modules (recap, trade review, etc.).

---

## 3. Execution policy matrix

| Feature ID | Execution path | Backend / lib | AI used? | When AI unavailable |
|------------|----------------|---------------|----------|----------------------|
| `timer_progression` | Automated | DraftTimerService, DraftSessionService | No | N/A |
| `draft_order` | Automated | DraftOrderService | No | N/A |
| `pick_validation` | Automated | PickValidation | No | N/A |
| `pick_ownership` | Automated | PickOwnershipResolver | No | N/A |
| `autopick` | Automated | PickSubmissionService + deterministic next (queue or ADP) | No | N/A |
| `queue_management` | Automated | Queue CRUD, prune drafted | No | N/A |
| `commissioner_controls` | Automated | controls route, session/settings | No | N/A |
| `roster_slot_validation` | Automated | RosterAssignmentService, eligibility | No | N/A |
| `player_search_filter_sort` | Automated / rules | PlayerPanel, pool resolver | No | N/A |
| `adp_sorting` | Rules + cached | Sort by ADP or AI ADP from DB | No (AI ADP is precomputed) | Fallback to standard ADP |
| `sport_eligibility` | Automated | PositionEligibilityResolver, sport-scope | No | N/A |
| `draft_completion` | Automated | completeDraftSession, finalizeRoster | No | N/A |
| `reconnect_resync` | Automated | buildSessionSnapshot, fetch session/queue/settings | No | N/A |
| `queue_reorder` | Rules | reorderQueueByNeed | No | N/A |
| `queue_reorder_explain` | AI optional | Same reorder + optional narrative | Yes (optional) | Return deterministic explanation only |
| `draft_recommendation` | Rules | RecommendationEngine | No | N/A |
| `draft_explain_best_pick` | AI optional | Optional layer on top of recommendation | Yes | Hide or show “Explanation unavailable” |
| `draft_recap` | AI optional | draft/recap route | Yes | Return “Recap unavailable” or short deterministic summary |
| `post_draft_summary` | Rules + cached | PostDraftView summary/teams/replay/value | No | N/A |
| `cpu_pick_mock` | Rules + cached | DraftAIManager (need + ADP + meta) | No | N/A |
| `trade_review` | AI optional | trade-proposals/.../review | Yes | Hide or show “Review unavailable” |
| `counter_trade_suggestion` | AI optional | Trade/proposal AI | Yes | Hide or show “Suggestion unavailable” |
| `league_story_recap` | AI optional | League story / narrative | Yes | Hide or show “Story unavailable” |
| `ai_adp_aggregation` | Scheduled / cached | ai-adp-engine + cron | Yes (ingestion) | Draft still runs on last cached ADP or standard ADP |
| `image_logo_stat_ingestion` | Scheduled / cached | Ingestion jobs | Optional | Use cached or placeholder |

---

## 4. Feature-by-feature automation matrix

### 4.1 Automated without AI API

| Feature | Description | Current / target implementation |
|---------|-------------|----------------------------------|
| Timer engine | Compute remaining time, run/pause/expired | `DraftTimerService.computeTimerState`, `computeTimerEndAt`; session status from DB. |
| Draft order engine | Slot from overall, snake/3RR, format label | `DraftOrderService.getSlotInRoundForOverall`, `formatPickLabel`, `getRosterIdForOverall`. |
| Pick ownership resolver | Resolve owner for (round, slot) with trades | `PickOwnershipResolver.resolvePickOwner`; reads session slotOrder + tradedPicks. |
| Pick validation | Duplicate check, on-clock check, session state | `PickValidation.validatePickSubmission`; SKIP allowed for commissioner skip. |
| Autopick | Choose next player (queue or ADP), submit pick | Client: next from queue or first available by ADP; POST pick. No LLM. |
| Queue management | Add, remove, reorder, persist, prune drafted | Queue route GET/PUT; client state; prune when picks change. |
| Queue reorder (rules) | Reorder by roster need / position weights | `reorderQueueByNeed`; returns reordered + static explanation. |
| Commissioner controls | Start, pause, resume, timer, undo, skip, complete | Controls route; all call DraftSessionService / PickSubmissionService. |
| Roster/slot validation | Roster template, position eligibility | RosterAssignmentService, PositionEligibilityResolver, roster defaults. |
| Player search/filter/sort | Pool, position filter, ADP sort | PlayerPanel + league section data; sort by ADP or AI ADP from cache. |
| Bye week display | Show bye week in pool/roster | Player data; deterministic. |
| Sport eligibility | Positions per sport (NFL/NHL/.../SOCCER) | Sport-scope, roster defaults, eligibility resolver. |
| Draft completion logic | Mark completed, finalize rosters | completeDraftSession, finalizeRosterAssignments. |
| Reconnect/resync state | Rebuild snapshot, refetch session/queue/chat | buildSessionSnapshot, GET session/queue/settings/chat. |
| CPU draft (baseline) | Mock or orphan pick by need + ADP (+ optional meta) | DraftAIManager.makeAIPick; need/ADP/meta from cache; no LLM. |
| Traded pick resolution | Who owns a (round, slot) after trades | PickOwnershipResolver + session.tradedPicks. |
| Post-draft summary calculations | Counts, by position, earliest by position, team lists | PostDraftView + session.picks; pure computation. |
| AI ADP aggregation job | Cron aggregates picks, writes ADP table | ai-adp-engine + cron; draft reads only. |
| Image/logo/stat ingestion | Background jobs, cache | Existing ingestion; no AI in hot path. |

### 4.2 AI optional / on-demand

| Feature | Description | When to use AI | Fallback |
|---------|-------------|----------------|----------|
| Explain best pick | Narrative for “why this pick” | User asks for explanation | Deterministic explanation from RecommendationEngine |
| Explain reach vs value | Reach/value vs ADP narrative | User asks | Show reach/value warnings from engine only |
| Explain positional need | Why position is needed | User asks | Show need scores / static text |
| Private trade review | Verdict + reasons + decline/counter | User requests review | “Review unavailable” or hide button |
| Counter trade suggestion | AI-generated counter | User requests | “Suggestion unavailable” or hide |
| Draft recap | 2–4 paragraph draft summary | User clicks “Generate AI recap” | “Recap unavailable” or short deterministic summary |
| Explain queue reorder rationale | Narrative for reorder | Optional after reorder | Use static explanation from reorder-by-need |
| League story / narrative recap | Human-style league story | Separate feature | Hide or “Story unavailable” |
| Premium coach-style advice | Deeper advisory content | Optional premium path | Hide or show “Advice unavailable” |

---

## 5. Recommended implementation phases

### Phase 1 — Policy and matrix (no new AI calls)

- Add **DraftAutomationPolicy**: list of feature IDs that are automated (timer, order, validation, ownership, queue, commissioner, completion, resync, queue reorder, recommendation, CPU pick, post-draft summary, eligibility, etc.).
- Add **ExecutionPolicyMatrix**: map each feature ID to `automated` | `rules_and_cached` | `ai_optional`. Implement as a single module (e.g. `ExecutionPolicyMatrix.ts`) or config.
- Add **AIInvocationPolicy**: function `isAIAllowedForFeature(featureId: string): Promise<boolean>` that checks (1) feature flag / platform config for that feature, (2) provider health if needed. Use existing feature-toggle and provider-status where possible.
- **No change** to existing live-draft or mock-draft behavior; only document and centralize “what is what.”

### Phase 2 — Gating and degradation

- **Draft recap:** Before calling `openaiChatText`, check `AIInvocationPolicy.isAIAllowedForFeature('draft_recap')`. If false, return 503 or a body like `{ recap: null, error: 'AI recap unavailable', fallbackSummary: deterministicSummary }`. Frontend: if no recap, show fallback or “Recap unavailable.”
- **Trade review:** Similarly gate the trade-proposal review route with `ai_optional` and provider check; return clear error or hide “AI review” when disabled/unavailable.
- **Queue reorder:** Already deterministic; optionally add a separate “Explain with AI” that is gated and clearly labeled “AI explanation” so users see “instant reorder” vs “AI explanation.”

### Phase 3 — UI distinction and admin visibility

- **Frontend labels:** Where a flow has both an instant result and an optional AI step, label explicitly: e.g. “Reorder queue (instant)” vs “Explain reorder (AI)”. Same for “Best pick” (instant) vs “Explain pick (AI)” if that’s added.
- **No dead AI buttons:** For every button that would call AI, either (1) hide it when AI is disabled/unavailable, or (2) show it disabled with tooltip “AI temporarily unavailable,” or (3) show it and return a clear message when clicked. Never leave a button that always errors with no feedback.
- **Admin visibility:** Expose in admin or system health: list of features that are “automated” vs “AI-optional” and, for AI-optional, whether the provider is available (from existing provider-status). Optionally: simple dashboard “Draft automation vs AI” showing feature IDs and execution path.

### Phase 4 — Optional enhancements

- **Deterministic draft recap fallback:** When AI recap is unavailable, return a short structured summary (e.g. “Draft complete. 12 teams, 15 rounds. Top positions: QB 12, RB 24, …”) from post-draft summary logic so users still get something.
- **Queue reorder explanation:** If “Explain with AI” is added, gate it and use a short prompt; otherwise keep returning the existing static explanation from `reorderQueueByNeed`.
- **Mock draft CPU mode flag:** Explicit “rules-only” vs “rules + meta” (current behavior) so leagues can force no meta/cache dependency if desired.

---

## 6. Summary

- **Automated without AI:** Timer, draft order, pick validation, ownership, autopick, queue management, commissioner controls, roster/slot validation, player search/filter/sort, ADP sorting (including cached AI ADP), sport eligibility, draft completion, resync, queue reorder (rules), draft recommendation (deterministic), CPU pick (rules + cached meta), traded-pick resolution, post-draft summary calculations, scheduled AI ADP job, ingestion/caching.
- **AI optional / on-demand:** Explain best pick, explain reach/value, explain positional need, private trade review, counter suggestion, draft recap narrative, explain queue reorder, league story recap, premium coach-style advice.
- **Policies:** DraftAutomationPolicy (list of automated features), AIInvocationPolicy (when AI is allowed per feature), ExecutionPolicyMatrix (feature → path). Implement in new folders under `lib/` and gate existing AI routes and UI so that cost and latency stay under control and no AI button is dead when AI is disabled or unavailable.
