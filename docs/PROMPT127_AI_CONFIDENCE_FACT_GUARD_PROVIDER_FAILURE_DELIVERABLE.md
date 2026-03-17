# Prompt 127 — AI Confidence / Fact Guard / Provider Failure Handling + Full UI Click Audit

## 1. AI reliability architecture

The reliability layer sits between AI providers (OpenAI, Grok) and the UI to keep results **trustworthy**, **explainable**, and **stable**.

- **Existing:** Trade analyzer already uses `lib/trade-engine/quality-gate.ts` (confidence capping, phantom references, coverage tier, violations) and `lib/trade-engine/dual-brain-trade-analyzer.ts` (primary + fallback provider). Analytics use `lib/analytics/confidence.ts` and `confidence-types.ts` (TrustState, risk chips). UI uses `ConfidencePill`, `GuardianStateOverlay`, `DataFreshnessBanner`, `TradeAnalysisBadges`, etc.

- **New:** `lib/ai-reliability/` provides shared modules used by the dynasty-trade-analyzer and any other AI flows:
  - **AIFactGuard** — Caps confidence by data quality; blocks unsupported claims.
  - **AIConfidenceResolver** — Resolves final confidence from deterministic + LLM + data quality.
  - **ProviderFailureResolver** — From provider result list, derives all-failed / some-failed / fallback-used and user-facing message.
  - **ConsensusDisagreementResolver** — Explains when providers disagree and picks primary stance.
  - **DeterministicFallbackService** — Builds deterministic-only payload when all AI fails (trade context).
  - **AIResultStabilityService** — Builds reliability metadata and stable fallback response.
  - **AIFailureStateRenderer** — React component for fallback banner, retry, and expandable details.

- **Flow:** Dynasty trade analyzer: assemble context → run peer review (OpenAI + Grok, with fallback) → if consensus is null, return **200** with deterministic verdict + `reliability.usedDeterministicFallback` + fallback explanation instead of 500. UI shows result + failure banner and **Retry AI analysis**. When consensus exists, response includes `reliability` (provider results, confidence, warnings) for future UI use.

---

## 2. Confidence and fact-guard design

- **Fact guard (AIFactGuard):** Caps confidence by data coverage (e.g. ≤30% → 35% ceiling, ≤50% → 55%, ≤70% → 75%, &lt;85% → 90%). Applies additional ceilings for missing data count, stale injury, stale valuation, stale ADP. Returns violations (rule, detail, severity). `blockUnsupportedClaim(confidence, minThreshold)` can block when confidence is below threshold.

- **Confidence resolver (AIConfidenceResolver):** Takes deterministic confidence, optional LLM confidence, and data-quality inputs. Uses fact guard to compute final confidence and source (deterministic / llm / capped). Flags `partialProviderFailure` when at least one provider failed but another succeeded.

- **Trade quality gate (existing):** `runQualityGate` in `lib/trade-engine/quality-gate.ts` remains the main gate for trade analyzer (phantom references, league constraints, injury/roster checks, coverage tier). The new AIFactGuard is a lighter, reusable cap for other AI flows; trade analyzer continues to use the full quality gate.

---

## 3. Provider failure handling design

- **One provider fails:** Dual-brain analyzer already tries primary then fallback. Consensus is built from whichever provider(s) return valid verdicts. Result is returned with `reliability.providerResults` indicating ok/failed per provider.

- **All providers fail:** Previously the API returned 500. Now it returns **200** with:
  - `deterministicVerdict` from `computeDeterministicVerdict(ctx)`
  - `analysis` derived from `buildDeterministicFallback(ctx)` (verdict, confidence, reasons, warnings)
  - `deterministicFallback`, `fallbackExplanation`, `reliability` (usedDeterministicFallback: true)
  So the tool UI never breaks; user sees data-only result and a clear message + retry.

- **ProviderFailureResolver:** Converts a list of `ProviderResultMeta` (provider, status, error) into `ProviderFailureState`: allFailed, someFailed, fallbackUsed, message, providerSummary. Used for messaging and logging.

- **Stale / missing data:** Handled inside quality gate and fact guard (confidence ceilings). Data freshness is already shown in the app via `DataFreshnessBanner` and coverage tier in trade context.

---

## 4. Backend guardrail updates

- **`app/api/dynasty-trade-analyzer/route.ts`:**
  - When `runPeerReviewAnalysis` returns `null`, call `buildStableFallbackResponse(tradeContext)` and return 200 with `deterministicVerdict`, `analysis`, `deterministicFallback`, `fallbackExplanation`, `reliability`, `hasAiConsensus: false`.
  - On success, add `reliability` and `hasAiConsensus: true` to the JSON (provider results, confidence, data quality warnings, hardViolation).

- **New lib:** `lib/ai-reliability/` (types, AIFactGuard, AIConfidenceResolver, ProviderFailureResolver, ConsensusDisagreementResolver, DeterministicFallbackService, AIResultStabilityService, index). No new environment variables; uses existing trade-engine and auth.

---

## 5. Frontend confidence / error / fallback updates

- **`components/ai-reliability/AIFailureStateRenderer.tsx`:**
  - Props: `usedDeterministicFallback`, `fallbackExplanation`, `onRetry`, `retryLoading`, `reliability`, `showDetails`, `confidence`.
  - Renders an amber banner with message and **Retry AI analysis** button; optional expandable “Show data quality & provider details” using `reliability.providerResults` and `reliability.dataQualityWarnings`.

- **`components/DynastyTradeForm.tsx`:**
  - State: `reliability` (from API response).
  - After a successful analyze response, sets `reliability` from `data.reliability`.
  - Result block condition changed from `result && sections` to `result && (sections || detVerdict)` so deterministic-only fallback still shows the verdict card.
  - When `reliability?.usedDeterministicFallback`, renders `AIFailureStateRenderer` above the result with `onRetry={handleAnalyze}` and `retryLoading={loading}`.
  - Clear reliability when clearing the trade.

---

## 6. Full UI click audit findings

| Location | Element | Handler | Backend / wiring | Status |
|----------|--------|---------|------------------|--------|
| DynastyTradeForm | Analyze button | handleAnalyze | POST /api/dynasty-trade-analyzer | OK |
| DynastyTradeForm | Retry AI analysis (banner) | handleAnalyze | Same POST, no duplicate submit guard | OK |
| DynastyTradeForm | Clear / reset trade | clearTrade | setResult/sections/detVerdict/reliability null | OK |
| DynastyTradeForm | Confidence display | detVerdict.confidence, result.confidence | From API analysis/deterministicVerdict | OK |
| Trade analyzer landing | Analyze CTA | Link to /trade-evaluator | Navigation | OK |
| InstantTradeAnalyzer | confidence badge | result.confidence | From API | OK |
| Waiver AI page | Analyze Waivers | submit, rate limit | retryAfterSec, cooldown | OK |
| Waiver AI page | Cooldown display | formatMMSS(retry) | State from response | OK |
| af-legacy trade | Inline analyze | run analysis, retry on failure | Retry count, rate limit | OK |
| af-legacy | Confidence / trust | TrustExplanationSheet, ConfidenceBadge | confidenceRisk, convertConfidenceRiskToTrustData | OK |
| DataFreshnessBanner | Expand/collapse | setExpanded | Local state | OK |
| ConfidencePill | Click (optional) | onClick | Optional expand/callback | OK |
| AIFailureStateRenderer | Retry | onRetry | Passed from parent (handleAnalyze) | OK |
| AIFailureStateRenderer | Show/Hide details | setDetailsOpen | Local state | OK |

- **Findings:** Dynasty trade form now shows deterministic result when all AI fails and exposes a single retry path. No dead retry button. Confidence and data quality remain surfaced via existing badges and data freshness; the new banner is additive for provider-failure and fallback explanation.

---

## 7. QA findings

- **Low-confidence:** Quality gate and fact guard cap confidence by coverage and missing/stale data; violations are logged and included in response.
- **Stale-data:** Handled in quality-gate (injury/valuation/ADP ceilings) and in context; DataFreshnessBanner shows last fetch.
- **Missing-data:** Coverage tier and missing-data penalties reduce confidence ceiling; warnings in gate and reliability.
- **One-provider failure:** Dual-brain uses fallback provider; consensus still returned when one succeeds.
- **Multi-provider disagreement:** Consensus logic and confidence adjustment in trade-analysis-schema; ConsensusDisagreementResolver available for explicit disagreement messaging.
- **Deterministic fallback:** When consensus is null, API returns 200 with deterministic verdict and fallback explanation; UI shows verdict + banner + retry.
- **Full-provider failure:** Same as deterministic fallback; no 500 for “all providers empty”.
- **Click paths:** Analyze, Retry AI analysis, Clear trade, and expand/collapse details are wired; state updates and API usage verified.

---

## 8. Issues fixed

- **All-provider failure returned 500:** Now returns 200 with deterministic result and `reliability.usedDeterministicFallback` so the UI can show result and retry.
- **Result hidden when only deterministic:** Form required both `result` and `sections`; when fallback sends `sections: null`, result card did not show. Condition changed to `result && (sections || detVerdict)`.
- **No retry for failed AI:** Added AIFailureStateRenderer with **Retry AI analysis** calling the same analyze handler.
- **No shared reliability metadata:** API now returns `reliability` (provider results, confidence, fallback flag, warnings) on both success and fallback for consistent handling and future UI (e.g. confidence expand, provider status).

---

## 9. Final QA checklist

- [ ] Run trade analyzer with valid sides; confirm full result and no fallback banner when both providers succeed.
- [ ] Simulate all-provider failure (e.g. invalid keys or timeout); confirm 200 response with deterministic verdict, fallback explanation, and `hasAiConsensus: false`.
- [ ] On dynasty trade form, after fallback response confirm verdict card is visible and **Retry AI analysis** is shown.
- [ ] Click **Retry AI analysis** and confirm the same analyze request runs again (loading state during retry).
- [ ] Clear trade and confirm result and reliability banner are cleared.
- [ ] Confirm confidence and data quality remain visible where already shown (e.g. detVerdict confidence %, badges, data freshness).
- [ ] Optional: Expand “Show data quality & provider details” in the failure banner and confirm provider status and warnings when present.
- [ ] No sport-specific logic changed; NFL/NHL/NBA/MLB/NCAAB/NCAAF/Soccer remain supported via existing sport-scope and trade context.

---

## 10. Explanation of the AI reliability layer

The layer keeps the AI system **trustworthy**, **explainable**, and **stable**:

1. **Fact validation:** AIFactGuard caps confidence by data coverage and missing/stale data so we never overstate certainty. The trade analyzer’s full quality gate continues to enforce hard rules (e.g. phantom assets, league constraints).

2. **Deterministic rule enforcement:** Deterministic verdict and reasons are always computed from league data and valuations. When all AI providers fail, we still return this deterministic result so the user gets a data-driven answer instead of a generic error.

3. **Confidence scoring:** AIConfidenceResolver combines deterministic and LLM confidence and applies the fact guard ceiling. The API exposes this via `reliability.confidence` and the existing quality gate adjusted confidence.

4. **Provider failure fallback:** If one provider fails, the dual-brain analyzer uses the other. If both fail, we no longer return 500; we return 200 with the deterministic verdict, a clear fallback explanation, and `reliability.usedDeterministicFallback`. The UI shows this with a banner and a **Retry AI analysis** button.

5. **Partial-response and disagreement:** Provider results are tracked in `reliability.providerResults`. ConsensusDisagreementResolver can explain provider disagreement; the existing merge logic in trade-analysis-schema already picks a single consensus.

6. **Stale and missing data:** Handled by the quality gate and fact guard (confidence ceilings and violations). Data freshness and coverage are already surfaced in the app.

7. **Stable tool UI:** By returning a valid payload (deterministic result + reliability) instead of 500 on full AI failure, the trade analyzer UI never breaks: the user always sees a verdict and can retry for a full AI analysis when providers are available.

All of this is implemented so that **deterministic outputs are preserved even when all AI providers fail**, **confidence and data quality are clearly reflected** where appropriate, and **every reliability-related click path** (analyze, retry, clear, expand details) is wired end to end with no dead buttons.
