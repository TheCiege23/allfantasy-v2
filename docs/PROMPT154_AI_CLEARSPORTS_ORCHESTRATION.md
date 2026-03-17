# PROMPT 154 — AI and ClearSports Orchestration Layer

AI provider layer and ClearSports/sports-data layer are wired so AI features receive **normalized, deterministic sports context**. Deterministic-first; no invented stats; missing data surfaced via uncertainty; provider fallback when ClearSports is unavailable.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.  
**Sports data from router (ClearSports or fallback):** NFL, NBA, MLB only today; other sports get metadata/uncertainty only.

---

## 1. Data assembly flow

1. **Caller** builds an `AIContextEnvelope` (e.g. via `buildTradeEnvelope`, `buildWaiverEnvelope`, Chimmy, etc.) with `featureType`, `sport`, `deterministicPayload`, etc.
2. **Orchestration** (`runUnifiedOrchestration`) validates the request, then **enriches** the envelope with sports data via `enrichEnvelopeWithSportsData(envelope)`.
3. **Enricher** (`lib/ai-orchestration/sports-context-enricher.ts`):
   - For sport in `['NFL','NBA','MLB']` calls `getSportsData` for `teams` (and optionally `games` for matchup/rankings/commentary).
   - Puts result in `envelope.statisticsPayload.sportsData` and `sportsDataSource` / `sportsDataCached`.
   - Sets `envelope.dataQualityMetadata.missing` when a requested type is unavailable; sets `dataQualityMetadata.stale` when data is cached.
   - Appends a **hard constraint**: "Do not invent or assume data for: [missing]. When information is unavailable, say so explicitly."
4. **buildMessages** (orchestration-service) includes `statisticsPayload.sportsData` and `dataQualityMetadata.missing` in the prompt so the model sees teams/games and is told to state when info is unavailable.
5. **runOrchestration** receives the enriched envelope; **resolveConfidence** uses `dataQualityMetadata.stale` and `missing` to lower confidence and set reason (e.g. "Some context missing: teams, games").
6. **mergeDataQualityWarnings** in AIOrchestrator / UnifiedBrainComposer appends a fact-guard line: "Context limited: [missing] unavailable or from fallback. Do not invent." so the response carries it to the UI.
7. **normalizeToUnifiedResponse** maps orchestration result to `UnifiedAIResponse` (evidence, uncertaintyExplanation, factGuardWarnings, confidencePct, confidenceLabel).

---

## 2. Where ClearSports enriches context

- **All AI tools** that go through `runUnifiedOrchestration` (orchestrate, chimmy, run, compare) get enrichment when `envelope.sport` is set.
- **Feature types that also get games/schedule:** `matchup`, `matchup_simulator`, `rankings`, `commentary`, `story_creator` (see `FEATURE_TYPES_WITH_GAMES` in sports-context-enricher).
- **Tools reviewed for data wiring:**  
  Trade Analyzer, Waiver Wire AI, Draft Helper, Matchup Simulator/Explainer, Rankings Explainer, Fantasy Coach Mode, Player Comparison Lab, Trend Detection, Power Rankings Engine, Chimmy — all use the same envelope pipeline; when they pass `sport` and call the unified orchestration endpoint, they automatically get ClearSports-backed (or fallback) teams/games in context.

---

## 3. Backend context builders and routes

| Component | Role |
|-----------|------|
| **sports-context-enricher** | `fetchSportsContextForEnvelope(sport, options)` → teams/games from getSportsData; `enrichEnvelopeWithSportsData(envelope, options?)` → merges into envelope, sets dataQuality and hard constraints. |
| **orchestration-service** | After validation, calls `enrichEnvelopeWithSportsData(envelope)`; uses enriched envelope for `buildMessages` and `runOrchestration`. |
| **buildMessages** | Adds `statisticsPayload.sportsData` and `dataQualityMetadata.missing` to user prompt so AI sees sports context and missing-data instructions. |
| **AIConfidenceResolver** | Uses `dataQualityMetadata.stale` and `missing` to set lower confidence and reason. |
| **AIOrchestrator / UnifiedBrainComposer** | Merge data-quality missing list into `factGuardWarnings` so UI shows "Context limited: ...". |
| **Routes** | No change required: POST /api/ai/orchestrate, /api/ai/chimmy, /api/ai/run, /api/ai/compare all call `runUnifiedOrchestration`; enrichment is internal. |

---

## 4. AI never claims facts not in context

- **Hard constraints** on the envelope include "Do not override fairness score / accept probability / VORP" (tool-specific) and the enricher-added "Do not invent or assume data for: [missing]. When information is unavailable, say so explicitly."
- **Prompt** includes "Sports context (teams/games — use only this, do not invent)" and "Unavailable or missing data: ... State when information is unavailable; do not invent."
- **AIFactGuard** and **ToolFactGuard** continue to check model output against deterministic payload and flag overconfident or invented claims.

---

## 5. Missing data and uncertainty

- **dataQualityMetadata.missing** is set by the enricher when teams/games cannot be fetched (e.g. sport not in NFL/NBA/MLB, or getSportsData failed).
- **resolveConfidence** returns lower score and reason when `dataQuality.missing` or `dataQuality.stale` is set.
- **factGuardWarnings** include "Context limited: [missing] unavailable or from fallback. Do not invent."
- **uncertaintyExplanation** in the response can come from model output or from extracted risksCaveats/factGuardWarnings in the normalizer.

---

## 6. Provider fallback

- **getSportsData** (sports-router) uses source priority and circuit breaker; ClearSports is one source. If ClearSports is down or unavailable, the router returns data from another source (e.g. ESPN, TheSportsDB) or fails and the enricher sets `missing` and does not inject sports data.
- No silent failure: when no data is returned, `missing` is set and the UI receives lower confidence and data-quality warnings.

---

## 7. Frontend evidence / state handling

- **Evidence blocks:** `keyEvidence`, `evidence`, and deterministic payload are unchanged; they update when the response updates (refresh = re-POST to same endpoint, which re-runs enrichment and orchestration).
- **Confidence/uncertainty:** `confidencePct`, `confidenceLabel`, and `factGuardWarnings` (and optional `confidenceReason` where passed) reflect data quality; **ConfidenceDisplay** and caveats sections should show these.
- **Refresh:** Refresh actions should re-submit the same request (e.g. POST /api/ai/orchestrate or tool-specific endpoint); the server re-enriches and re-runs orchestration, so evidence and confidence update.
- **Retry:** Retry should re-call the same API; no dead retry buttons if the button triggers the same fetch/submit.
- **Stale cards:** After data refresh, the client should replace the previous result with the new response (no mixing old evidence with new; full result replacement).
- **View details:** Any "view details" that depend on the current result should use the latest response; no dead buttons if the link/action is bound to the current `traceId` or result id.

---

## 8. QA checklist

- [ ] **Deterministic-first:** With valid deterministic payload (e.g. trade fairness, waiver rank), AI answer does not override or contradict it; evidence reflects deterministic context.
- [ ] **ClearSports enrichment:** For NFL/NBA/MLB, with ClearSports (or another source) available, envelope contains `statisticsPayload.sportsData` (teams and optionally games); prompt includes sports context.
- [ ] **Missing data:** For a sport without data or when getSportsData fails, `dataQualityMetadata.missing` is set; confidence is reduced; factGuardWarnings include "Context limited: ..."; AI does not invent teams/games.
- [ ] **Uncertainty explicit:** When data is missing or stale, response includes lower confidence and/or caveats/warnings; UI shows confidence and caveats.
- [ ] **Fallback:** With ClearSports disabled, other sources (e.g. ESPN) can still supply data; when no source has data, missing is set and no crash.
- [ ] **No one-sport hardcoding:** Sport is taken from envelope; all supported sports are handled (NFL/NBA/MLB get data when available; others get metadata/uncertainty).
- [ ] **Refresh:** Refresh re-posts request; evidence blocks and confidence/uncertainty update from new response.
- [ ] **Retry:** Retry works and returns new result; no dead retry.
- [ ] **No stale cards:** After refresh, UI shows only the new result.
- [ ] **No dead "view details":** Buttons/links use current result and remain functional.

---

## 9. File summary

| Path | Purpose |
|------|---------|
| `lib/ai-orchestration/sports-context-enricher.ts` | Fetch sports data; enrich envelope with statisticsPayload and dataQualityMetadata; hard constraints for missing data. |
| `lib/ai-orchestration/orchestration-service.ts` | Call enrichEnvelopeWithSportsData after validation; buildMessages includes statisticsPayload and dataQualityMetadata. |
| `lib/ai-orchestration/index.ts` | Export enrichEnvelopeWithSportsData, fetchSportsContextForEnvelope, EnrichmentOptions. |
| `lib/unified-ai/AIConfidenceResolver.ts` | Already uses dataQualityMetadata.stale and missing for confidence (unchanged). |
| `lib/unified-ai/AIOrchestrator.ts` | mergeDataQualityWarnings adds "Context limited: ..." to factGuardWarnings. |
| `lib/unified-ai/UnifiedBrainComposer.ts` | Same data-quality merge for unified_brain mode. |
| `lib/sports-router.ts` | Unchanged; used by enricher via getSportsData (ClearSports or fallback). |
| `app/api/ai/orchestrate/route.ts` | Unchanged; uses runUnifiedOrchestration (enrichment internal). |
| `app/api/ai/chimmy/route.ts` | Unchanged; same. |
| `components/ai-interface/UnifiedBrainResultView.tsx` | Already shows confidence, keyEvidence, risksCaveats, factGuardWarnings (no change required). |
