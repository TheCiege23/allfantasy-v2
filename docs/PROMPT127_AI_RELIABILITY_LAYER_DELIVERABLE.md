# Prompt 127 — AI Confidence / Fact Guard / Provider Failure Handling + Full UI Click Audit

**Deliverable.** Production implementation of the AI reliability layer: confidence handling, fact guards, provider failure handling, deterministic fallback, and full reliability-related UI click audit.

---

## 1. AI Reliability Architecture

The reliability layer is split across **lib/unified-ai** (orchestration-level guardrails) and **lib/ai-reliability** (tool-level confidence, provider failure, deterministic fallback).

| Module | Location | Purpose |
|--------|----------|--------|
| **AIFactGuard** | lib/unified-ai, lib/ai-reliability | **unified-ai:** Validates model output for invented/intuition language and hard-constraint override; suggests disclaimer when confidence is low. **ai-reliability:** Caps confidence by data quality (coverage, missing data, stale injury/valuation/ADP); blockUnsupportedClaim. |
| **AIConfidenceResolver** | lib/unified-ai, lib/ai-reliability | **unified-ai:** Resolves confidence label/percentage from envelope metadata and model outputs; formatConfidenceLine for UI. **ai-reliability:** Resolves final confidence from deterministic + LLM + data quality with fact-guard cap; partialProviderFailure flag. |
| **ProviderFailureResolver** | lib/ai-reliability | resolveProviderFailure(providerResults) → allFailed, someFailed, fallbackUsed, message, providerSummary. providerStatusFromError(error) → ok \| failed \| timeout \| invalid_response. |
| **ConsensusDisagreementResolver** | lib/ai-reliability | resolveConsensusDisagreement(stances) → hasDisagreement, explanation, primaryVerdict, primaryConfidence, alternateVerdicts. Used when multiple providers give different verdicts. |
| **DeterministicFallbackService** | lib/ai-reliability | buildDeterministicFallback(tradeContext) → payload (verdict, winner, confidence, reasons, warnings, dataQualityTier) + explanation. Trade-only; preserves data-only result when all AI providers fail. |
| **AIResultStabilityService** | lib/ai-reliability | buildReliabilityMetadata(providerResults, confidence, usedDeterministicFallback, …). buildStableFallbackResponse(tradeContext) when consensus is null. providerResultMeta(provider, error). |
| **AIFailureStateRenderer** | components/ai-reliability | Renders fallback banner, retry button, confidence %, expandable data quality & provider details. Used by DynastyTradeForm when usedDeterministicFallback. |

**Data flow:** Tool/route runs providers → collects ProviderResultMeta[] → on full failure uses DeterministicFallbackService (trade) or safe message (Chimmy) → builds ReliabilityMetadata → UI shows AIFailureStateRenderer or confidence/error state.

---

## 2. Confidence and Fact-Guard Design

**Confidence resolution (unified-ai):**
- From envelope.confidenceMetadata.score (0–100) → label (low/medium/high) and reason.
- From envelope.dataQualityMetadata: stale → low (35%); missing → medium (55%); deterministicPayload present → medium (65%).
- From model outputs: any error/skipped → low (45%); else multi-model consensus → medium (60%).

**Confidence capping (ai-reliability):**
- capConfidenceByDataQuality: dataCoveragePercent ≤30 → ceiling 35; ≤50 → 55; ≤70 → 75; &lt;85 → 90. missingDataCount penalizes. injuryDataStale → max 70; valuationDataStale → max 65.
- blockUnsupportedClaim(confidence, minThreshold): blocks when confidence &lt; threshold (default 40).

**Fact guard (unified-ai):**
- INVENTED_PATTERNS: “I think/feel”, “my gut”, “without data”, “guaranteed 100%”, “invented/made up/guess” → warnings.
- GOOD_PATTERNS: “based on data/numbers”, “engine shows”, “according to league/roster”, “confidence is low/medium/high” → positive signal.
- When deterministicPayload present and text long but no good pattern and no numbers → warning “response may not reference specific data”.
- suggestedPrefix when warnings and low confidence: “Based on the data we have (confidence is limited): ”.

Deterministic rules are preserved: envelope.hardConstraints and deterministic payload are not overridden by AI; quality gate in trade pipeline can hard-fail on violations.

---

## 3. Provider Failure Handling Design

**One provider fails:**
- Continue with remaining providers (Chimmy: OpenAI + Grok + DeepSeek in parallel; use consensus from whichever responded).
- ProviderFailureResolver: someFailed=true, fallbackUsed=true; message “Some AI providers didn’t respond; results are based on X and Y.”
- Reliability metadata includes providerResults with status per provider; UI can show “Show data quality & provider details”.

**All providers fail:**
- **Trade (dynasty-trade-analyzer):** consensus null → buildStableFallbackResponse(tradeContext) → return deterministic verdict + deterministicFallback payload + fallbackExplanation + reliability (usedDeterministicFallback: true). UI shows AIFailureStateRenderer with “Retry AI analysis” and deterministic result.
- **Chimmy:** When !openaiRaw && !grokRaw return 200 with safe message (“I couldn’t complete that analysis right now. Re-ask…”) and meta with providers, confidencePct: 0, providerStatus. No crash; user can re-send.

**Logging:** Failures logged server-side (console.error) with no secrets. Provider status and error snippets are in reliability metadata for support/debug; not exposed beyond allowed UI.

---

## 4. Backend Guardrail Updates

- **dynasty-trade-analyzer:** Already uses buildStableFallbackResponse when consensus is null; returns reliability with providerResults, usedDeterministicFallback, fallbackExplanation, dataQualityWarnings. buildReliabilityMetadata used on success path with quality-gate adjusted confidence.
- **Chimmy route:** On full provider failure, response now includes meta.confidencePct: 0 and meta.providerStatus so clients can show confidence and provider state consistently.
- **unified-ai AIOrchestrator:** Already applies resolveConfidence and applyFactGuardToAnswer to every mode (single_model, specialist, consensus, unified_brain). OrchestrationResult includes confidencePct, confidenceLabel, factGuardWarnings.
- **Trade quality gate:** runQualityGate in dynasty-trade-analyzer uses deterministic confidence and LLM confidence and applies adjustments; violations (hard/soft) feed into reliability.hardViolation and dataQualityWarnings.

No additional backend guardrail changes required for this deliverable; behavior matches reliability rules.

---

## 5. Frontend Confidence / Error / Fallback Updates

- **DynastyTradeForm:** Shows AIFailureStateRenderer when reliability?.usedDeterministicFallback; passes onRetry={handleAnalyze}, retryLoading={loading}, confidence, reliability. Expandable “Show data quality & provider details” and “Retry AI analysis” button. Confidence % shown in verdict and value sections.
- **TradeFinderV2:** Confidence detail expand/collapse (showConfidenceDetail), Retry button (onClick={runFinder}), Try Rebuild / Try Deep Scan when applicable. Error state shows message + Retry.
- **ChimmyChat:** On API error shows toast “Failed to send message”; response content already includes “Re-ask your fantasy question” when all providers fail. Optional future: show confidencePct or “Some providers didn’t respond” when meta is present (not required for this deliverable).
- **ai-confidence (ConfidenceBadge, TrustExplanationSheet, TrustTimeline):** Used on af-legacy for trade/rankings trust and confidence state; integrates with analytics confidence types.
- **AIFailureStateRenderer:** Renders fallback message, retry button (with loading state), confidence %, and expandable provider/data quality details. Used wherever deterministic fallback or provider failure is surfaced.

---

## 6. Full UI Click Audit Findings

| # | Element | Component / Route | Handler | Backend / API | State / Reload | Status |
|---|--------|-------------------|--------|---------------|----------------|--------|
| 1 | Retry AI analysis | DynastyTradeForm | onRetry → handleAnalyze | POST /api/dynasty-trade-analyzer | setResult, setSections, setReliability, setLoading | OK |
| 2 | Fallback banner | DynastyTradeForm | AIFailureStateRenderer (usedDeterministicFallback) | — | reliability from API | OK |
| 3 | Confidence % (trade) | DynastyTradeForm | — | reliability.confidence, detVerdict.confidence | Display only | OK |
| 4 | Show data quality & provider details | AIFailureStateRenderer | onClick → setDetailsOpen(!detailsOpen) | — | detailsOpen | OK |
| 5 | Retry (finder) | TradeFinderV2 | onClick={runFinder} | POST /api/legacy/trade/roster, finder API | setError(''), setResponse, setCurrentCardIndex | OK |
| 6 | Try Rebuild / Try Deep Scan | TradeFinderV2 | setMode + runFinder | Same | mode, response | OK |
| 7 | Confidence expand/collapse | TradeFinderV2 | setShowConfidenceDetail(!showConfidenceDetail) | — | showConfidenceDetail, ConfidenceDetailModal | OK |
| 8 | Chimmy send error | ChimmyChat | catch → toast.error('Failed to send message') | POST /api/chat/chimmy | messages, isTyping | OK |
| 9 | Chimmy full-provider failure | Chimmy API | 200 + safe message + meta.confidencePct: 0 | — | Client shows reply text (includes “Re-ask…”) | OK |
| 10 | Error state recovery (finder) | TradeFinderV2 | Retry, Try Rebuild, Try Deep Scan | — | setError(''), runFinder | OK |
| 11 | ConfidenceBadge / TrustExplanationSheet | af-legacy | Trust data from analytics; sheet open/close | — | trustData, buildDataSources | OK |
| 12 | Waiver AI error | waiver-ai page, WaiverAI | setError, display error message | POST /api/waiver-ai | Local state | OK |
| 13 | Rankings / psychology / story errors | Various panels | setError, catch → setError | Respective APIs | Local state | OK |

**Summary:** Retry, fallback display, confidence expand/collapse, and provider/details expand are wired. No dead retry buttons or missing handlers found. Chimmy full failure returns consistent meta with confidencePct: 0.

---

## 7. QA Findings

- **Low-confidence cases:** unified-ai and ai-reliability cap confidence by data quality; suggestedPrefix and formatConfidenceLine surface “confidence is limited”. OK.
- **Stale-data cases:** dataQualityMetadata.stale and injuryDataStale/valuationDataStale reduce or cap confidence. OK.
- **Missing-data cases:** dataQualityMetadata.missing and missingDataCount reduce confidence; dataQualityWarnings in reliability. OK.
- **One-provider failure:** Chimmy and trade use remaining providers; ProviderFailureResolver reports someFailed, fallbackUsed; message and providerSummary available. OK.
- **Multi-provider disagreement:** ConsensusDisagreementResolver available for verdict stances; trade pipeline uses consensus method and quality gate. OK.
- **Deterministic fallback:** buildStableFallbackResponse used in dynasty-trade-analyzer when consensus is null; deterministic payload and explanation returned; UI shows banner and retry. OK.
- **Full-provider failure:** Trade returns deterministic result + fallback explanation; Chimmy returns safe message and meta with confidencePct: 0. OK.
- **Reliability-related click paths:** Retry, expand details, and error recovery verified. OK.

---

## 8. Issues Fixed

| Issue | Fix |
|-------|-----|
| Chimmy full failure response missing confidencePct | When !openaiRaw && !grokRaw, meta now includes confidencePct: 0 and providerStatus so clients can show confidence and provider state consistently. |

No dead retry buttons or broken fallback handling were found; existing wiring was confirmed.

---

## 9. Final QA Checklist

- [x] Fact validation: AIFactGuard (unified-ai + ai-reliability) blocks unsupported claims and caps confidence by data quality.
- [x] Deterministic rule enforcement: hardConstraints and deterministic payload respected; quality gate and buildStableFallbackResponse preserve data-only result.
- [x] Confidence scoring: Resolvers in unified-ai and ai-reliability; confidence shown in trade UI and available in Chimmy meta.
- [x] Provider failure fallback: ProviderFailureResolver; trade uses DeterministicFallbackService and buildStableFallbackResponse; Chimmy returns safe message and meta.
- [x] Partial-response handling: Consensus from available providers; partialProviderFailure and providerSummary in reliability.
- [x] Disagreement handling: ConsensusDisagreementResolver available; trade uses consensus method and gate.
- [x] Stale/missing data handling: dataQualityMetadata and fact-guard caps; dataQualityWarnings in reliability.
- [x] All seven sports supported via existing sport-scope and tool context; no sport-specific reliability logic.
- [x] Retry, fallback banner, confidence expand, and provider details expand wired and working.

---

## 10. Explanation of the AI Reliability Layer

The AI reliability layer keeps the system **trustworthy, explainable, and stable**. **AIFactGuard** (unified-ai and ai-reliability) blocks unsupported claims and caps confidence by data quality so we never overstate certainty. **AIConfidenceResolver** derives confidence from deterministic metadata, data quality, and provider results and surfaces “confidence is limited” when appropriate. **ProviderFailureResolver** classifies provider outcomes (ok/failed/timeout/invalid_response) and produces user-facing messages for all-failed vs partial-failure. **DeterministicFallbackService** and **AIResultStabilityService** ensure that when all AI providers fail, the **trade** flow still returns a deterministic verdict and explanation so the UI never breaks. **ConsensusDisagreementResolver** supports explaining and merging when multiple providers disagree. **AIFailureStateRenderer** shows the fallback banner, retry button, confidence %, and expandable data quality and provider details. The **dynasty-trade-analyzer** uses buildStableFallbackResponse when consensus is null; **Chimmy** returns a safe message and meta (including confidencePct: 0) when all providers fail. The **mandatory UI audit** confirmed that retry, fallback display, confidence expand/collapse, and error recovery are wired end-to-end with no dead buttons.

---

*End of Prompt 127 deliverable.*
