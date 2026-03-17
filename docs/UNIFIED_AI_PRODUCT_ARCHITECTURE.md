# Unified AI Product Architecture — AllFantasy

**Purpose:** Technical architecture for a single shared orchestration layer that powers all AI features while preserving tool-specific deterministic pipelines. Design only; no implementation in this document.

**Binding context:** AllFantasy Master Project Context; seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER); deterministic-first; Chimmy as product face; existing `lib/unified-ai`, `lib/ai-reliability`, `lib/ai-tool-layer`.

---

## 1. Target architecture

### 1.1 Principles

- **Deterministic-first:** Every tool runs its deterministic pipeline (trade fairness, waiver scores, rankings, simulation, etc.) before any AI call. AI explains and synthesizes; it does not invent facts or override hard rules.
- **Single orchestration entry:** All AI-powered features flow through one orchestration layer (request → envelope → provider abstraction → model calls → consensus/merge → fact guard → confidence → response). Tool-specific code builds the envelope and consumes the result; it does not call providers directly in an ad-hoc way.
- **Model roles fixed:** OpenAI = final user-facing synthesis + calm Chimmy voice; DeepSeek = structured analytical interpretation; Grok = narrative framing + social/media. No role swapping in production without an explicit mode.
- **Four execution modes:** Single Model, Specialist (e.g. DeepSeek + OpenAI), Consensus (parallel, pick/merge), Unified Brain (deterministic + all three models → one answer). Mode is selected by envelope + optional user preference; UI must never expose a mode or provider choice that has no backend path (no dead buttons).
- **Graceful fallback:** If one or all providers fail, the layer returns deterministic-only result + clear user message; never a generic 500 or blank screen. Retry and “compare providers” (when multiple responded) are first-class UI actions.
- **Secrets server-side:** No API keys or provider credentials in frontend; no dead “provider selector” that would require client-side provider choice without server support.

### 1.2 High-level layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UI LAYER (mobile-first, premium)                                            │
│  Provider selector (when multi available) · Mode selector · Result cards ·   │
│  Expand details · Re-run · Copy/Share · Save · Ask follow-up · Open Chimmy   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRODUCT / TOOL LAYER                                                        │
│  Trade · Waiver · Draft · Matchup · Rankings · Psychology · Story ·         │
│  Commissioner · Coach · Content/Blog/Social/Podcast · Chimmy Chat            │
│  Each: build deterministic result → build envelope → call orchestration     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  UNIFIED ORCHESTRATION LAYER                                                 │
│  Envelope validation · Mode resolution · Tool registry · Prompt builder      │
│  Provider abstraction · Model role registry · Consensus/Merge ·             │
│  Fact guard · Confidence/quality gate · Logging/Observability               │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROVIDER ABSTRACTION LAYER                                                  │
│  OpenAI · DeepSeek · Grok (XAI) — single interface: chat(text/json),         │
│  timeout, retry, health check; no raw client exposure above this            │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DETERMINISTIC ENGINES (per tool)                                            │
│  Trade engine · Waiver scoring · Rankings · Simulation · Story context      │
│  Psychology evidence · Legacy score · Reputation · Hall of Fame · etc.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data flow (text diagram)

### 2.1 Standard tool flow (e.g. Trade, Waiver, Rankings)

```
User action (e.g. "Analyze trade")
    → Tool handler runs DETERMINISTIC pipeline (fairness, scores, verdict)
    → Tool builds AIContextEnvelope (featureType, sport, leagueId, deterministicPayload, …)
    → Tool optionally resolves mode (or uses default from envelope)
    → Orchestration layer:
        a) Validates envelope (sport, featureType, required payloads)
        b) Resolves mode (single_model | specialist | consensus | unified_brain)
        c) Resolves model set from Model Role Registry + envelope hints
        d) Prompt Builder produces per-model prompts from envelope + tool template
        e) Provider Abstraction runs model calls (parallel where needed) with timeout/retry
        f) Each provider returns ModelOutput { model, raw, structured?, error?, skipped? }
    → Consensus/Merge (if multi-model): pick or merge primary answer; prefer OpenAI for final text
    → Fact Guard: validate no invented facts, no override of hard constraints; optional prefix
    → Confidence/Quality Gate: cap confidence from data quality; attach label (low/medium/high)
    → Build unified AIResponse (primaryAnswer, confidencePct, providerStatus, modelOutputs, …)
    → Logging: write to AiOutput + optional trace/debug payload for admins
    → Return to tool; tool maps to ToolOutput (verdict, keyEvidence, confidence, risksCaveats, …)
    → UI: result card, expand details, re-run, copy, share, save, “Ask follow-up” → Chimmy
```

### 2.2 Chimmy chat flow

```
User message + optional context (e.g. league, team, last tool result)
    → Chimmy route builds envelope (featureType: chimmy_chat, userMessage, behaviorPayload, …)
    → Mode: unified_brain (or single_model if user preference)
    → Orchestration: parallel OpenAI + DeepSeek + Grok (or subset if mode = single_model)
    → Consensus: prefer OpenAI for final message; attach confidencePct and providerStatus in meta
    → Fact guard on final message; confidence from AIConfidenceResolver
    → Log AiOutput; record memory (AIMemoryEvent) if enabled
    → Response: { message, meta: { confidencePct, providerStatus } }
    → UI: show message; optional confidence badge; “Re-run” / “Open in [tool]” where applicable
```

### 2.3 Fallback flow (one or all providers fail)

```
Provider abstraction returns ModelOutput { model, error, skipped: true } for failed calls
    → Orchestration continues with remaining modelOutputs
    → If no successful modelOutputs:
        a) If envelope.deterministicPayload exists → return deterministic-only answer
           (e.g. “Based on the data: [summary]”) + reliability.usedDeterministicFallback
        b) Else return safe message: “I couldn’t complete the analysis right now. Please try again or check your data.”
    → ProviderFailureResolver state (allFailed, someFailed, fallbackUsed, message, providerSummary)
    → UI: show result + banner when someFailed/allFailed; “Retry” button; no dead state
```

---

## 3. Contracts and interfaces

### 3.1 Provider abstraction layer

- **IProviderClient**
  - `chatText(request: ProviderChatRequest): Promise<ProviderChatResult>`
  - `chatJson?(request: ProviderChatRequest, schema?: JsonSchema): Promise<ProviderChatResult>`
  - `healthCheck?(): Promise<boolean>`
- **ProviderChatRequest:** `{ messages: Message[]; model?: string; maxTokens?: number; temperature?: number; timeoutMs?: number }`
- **ProviderChatResult:** `{ text: string; json?: unknown; model: string; tokensPrompt?: number; tokensCompletion?: number; error?: string; timedOut?: boolean }`
- **ProviderRegistry:** map `AIModelRole` → `IProviderClient`; resolve from env (OPENAI_*, DEEPSEEK_*, XAI_*/GROK_*); one implementation per provider (OpenAI, DeepSeek, Grok).

### 3.2 Model role registry

- **ModelRoleEntry:** `{ role: AIModelRole; primary: string; bestFor: string[]; defaultModel?: string; fallbackOrder?: AIModelRole[] }`
- **Registry:** OpenAI (explanation, chat, synthesis, voice); DeepSeek (analysis, numbers, projections); Grok (narrative, social, story, engagement). Used by ModelRoutingResolver and Prompt Builder to pick model and template.

### 3.3 AI tool registry

- **ToolRegistryEntry:** `{ key: ToolAIEntryKey; name: string; deterministicFirst: boolean; defaultMode: OrchestrationMode; allowedModes: OrchestrationMode[]; promptTemplates: Record<AIModelRole, string>?; qualityGate?: QualityGateConfig }`
- **ToolAIEntryKey:** trade_analyzer, trade_evaluator, waiver_ai, rankings, draft_helper, chimmy_chat, graph_insight, psychological_profiles, legacy_score, reputation, story_creator, matchup, commentary, commissioner, coach, content_blog, content_social, content_podcast, bracket_intelligence, simulation, etc.
- Registry used to: validate featureType, resolve default mode, resolve prompt templates per model, and enforce quality gate.

### 3.4 Deterministic context envelope contract

- **AIContextEnvelope** (existing; extend as needed):
  - **Required for all:** `featureType`, `sport`
  - **Required when in league context:** `leagueId` (optional for Chimmy global chat)
  - **Deterministic:** `deterministicPayload` (engine output; AI must not override)
  - **Optional payloads:** `statisticsPayload`, `behaviorPayload`, `simulationPayload`, `rankingsPayload`
  - **Intent/UI:** `promptIntent`, `uiSurface`, `userMessage`
  - **Constraints:** `hardConstraints[]`, `confidenceMetadata`, `dataQualityMetadata`
  - **Routing:** `modelRoutingHints`, `userId`
- **Sport:** Must be one of SUPPORTED_SPORTS (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER); validated at envelope acceptance.

### 3.5 Unified request/response schema (API boundary)

- **UnifiedAIRequest**
  - `envelope: AIContextEnvelope`
  - `mode?: OrchestrationMode`
  - `options?: { timeoutMs?: number; skipCache?: boolean; traceId?: string }`
- **UnifiedAIResponse**
  - `primaryAnswer: string`
  - `confidencePct?: number`
  - `confidenceLabel?: 'low' | 'medium' | 'high'`
  - `verdict?: string`
  - `keyEvidence?: string[]`
  - `risksCaveats?: string[]`
  - `suggestedNextAction?: string`
  - `modelOutputs: ModelOutput[]`
  - `reliability: { usedDeterministicFallback: boolean; providerStatus: ProviderStatus[]; message?: string }`
  - `factGuardWarnings?: string[]`
  - `traceId?: string`
  - `cached?: boolean`

### 3.6 Shared error schema

- **AIErrorCode:** `provider_unavailable` | `timeout` | `invalid_response` | `rate_limited` | `fact_guard_rejected` | `quality_gate_failed` | `envelope_validation_failed` | `unknown`
- **UnifiedAIError:** `{ code: AIErrorCode; message: string; userMessage: string; provider?: AIModelRole; traceId?: string; details?: Record<string, unknown> }`
- All AI routes return same error shape; frontend maps to user-facing message and retry/fallback UI.

### 3.7 Shared loading state schema (frontend)

- **AILoadingState:** `idle` | `loading` | `partial` (e.g. one provider returned) | `success` | `error` | `fallback`
- **AILoadingMeta:** `{ state: AILoadingState; startedAt?: number; providerStatus?: ProviderStatus[]; lastError?: UnifiedAIError }`
- Enables consistent skeletons, “partial result” display, and retry state.

### 3.8 Trace/debug schema (admins)

- **AITraceRecord:** `{ traceId: string; featureType: string; mode: OrchestrationMode; envelopeSummary: object; modelOutputs: ModelOutput[]; consensusChoice?: string; factGuardResult?: object; confidenceResult?: object; durationMs: number; cached?: boolean }`
- Stored server-side only; returned in response only when `Accept-Debug: true` or admin header; never to normal users.

### 3.9 User-facing explanation format

- **UserExplanation:** `{ summary: string; bullets?: string[]; verdict?: string; nextAction?: string; caveats?: string[]; confidenceLabel?: string }`
- Every tool maps OrchestrationResult + ToolOutput to this for cards and expand-details.

### 3.10 Internal reasoning metadata (no user display)

- **ReasoningMetadata:** `{ modelUsed: AIModelRole; structuredFactors?: string[]; confidencePct?: number; qualityGatePassed?: boolean; factGuardWarnings?: string[] }`
- Used for logging (AiOutput), trace, and quality analytics; not sent to client as “reasoning” to avoid overclaiming.

### 3.11 Hallucination rejection rules (fact guardrails)

- **Rules (extend existing AIFactGuard):**
  - Do not emit numbers (scores, percentages, ranks) that are not present in deterministicPayload or statisticsPayload.
  - Do not override fields listed in hardConstraints (e.g. fairnessScore, waiver priority order).
  - Do not use phrases that present intuition as fact (e.g. “I think the trade is…”, “guaranteed”, “100%”).
  - Prefer phrases that cite data (“Based on the data…”, “The engine shows…”, “According to your league…”).
- **Action:** If violation: attach factGuardWarnings; optionally prepend suggestedPrefix; never block response entirely unless policy is “strict” (configurable per tool).

---

## 4. Prompt builder architecture

- **PromptBuilder:** Input: `AIContextEnvelope`, `AIModelRole`, optional `toolTemplateId`. Output: `{ system: string; user: string; maxTokens?: number; temperature?: number }`.
- **Sources:**
  - **Tool template:** From AI tool registry (per featureType + model role); includes placeholders for sport, league, deterministic summary.
  - **Sport-aware block:** Injected from SportAIResolver / sport-scope (e.g. “NFL PPR”, “NHL categories”) so prompts are valid for all seven sports.
  - **Envelope payloads:** deterministicPayload, statisticsPayload, etc. serialized into user message or context block; no raw PII in system prompt.
- **Single source of truth:** Prompt text lives in one module or CMS-friendly store (e.g. `lib/unified-ai/prompts/` or DB); no duplicate “system” strings across route files.
- **Versioning:** Optional `promptVersion` in envelope or options for A/B or rollback.

---

## 5. Consensus / merge orchestration flow

- **Input:** `modelOutputs: ModelOutput[]`, `preferModel: AIModelRole` (default OpenAI), optional `deterministicSummary`.
- **Steps:**
  1. Filter to successful outputs (no error, not skipped, non-empty raw).
  2. Select primary: first by preferModel, then fallback order (OpenAI → Grok → DeepSeek).
  3. If none: return deterministic-only answer if deterministicSummary else safe message.
  4. Optional merge: mergeStructuredConsensus for keyFactors, confidenceLabel, confidencePct from structured fields.
- **Output:** `primaryAnswer`, `reason`, `usedModels[]`. Already implemented in ConsensusEvaluator; extend to support “compare providers” by returning all model texts in modelOutputs to UI when requested.

---

## 6. Confidence and quality gate layer

- **AIConfidenceResolver:** Input envelope + modelOutputs; output `{ scorePct: number; label: 'low' | 'medium' | 'high' }`. Cap confidence when dataQualityMetadata.stale or missing fields; never exceed deterministic confidence when present.
- **Quality gate (per tool):** Optional threshold (e.g. confidencePct >= 40 to show “recommendation”; below show “explanation only”). Config in tool registry; result tagged so UI can show “Low confidence — review data” and still show expand details / re-run.

---

## 7. Logging / observability / audit strategy

- **Every AI response:** Call `logAiOutput` (or equivalent) with: provider(s), role, taskType (= featureType), targetType/targetId (leagueId, etc.), model, contentText (primaryAnswer), contentJson (full response or summary), confidence, meta (reliability, traceId), token counts when available.
- **Trace:** Optional AITraceRecord stored server-side with traceId; link in AiOutput.meta. Admins can fetch by traceId when needed.
- **Metrics:** Counts per featureType, per provider, latency, cache hit; export to existing metrics pipeline if any.
- **Audit:** AiOutput table is audit trail; retain for cost and quality review; no PII in content beyond ids.

---

## 8. Rate limit / retry / timeout / fallback policy

- **Rate limit:** Per user and per provider (e.g. N requests/minute for OpenAI); 429 → AIErrorCode.rate_limited; userMessage: “Too many requests; try again in a minute.”
- **Retry:** Per-provider retry (e.g. 1 retry with backoff for 5xx/timeout); after exhaustion, mark that provider as failed and continue with others or deterministic fallback.
- **Timeout:** Per-call timeout (e.g. 25s) from Provider Abstraction; on timeout return ModelOutput { error, skipped: true }; orchestration continues.
- **Fallback:** As in data flow: prefer other models; then deterministic-only; then safe message. No automatic switch to a different provider “button” without user action (e.g. “Retry” or “Try with one model”); avoid dead selector states.

---

## 9. AI result caching strategy

- **When:** Idempotent requests (same envelope hash + mode) for read-only tools (e.g. “explain rankings”, “explain legacy score”). Do not cache Chimmy chat or stateful flows.
- **Key:** hash(featureType + sport + leagueId + deterministicPayload digest + promptIntent + mode).
- **TTL:** Short (e.g. 5–15 minutes) to avoid stale explanations when league data changes.
- **Response:** Set `cached: true` in UnifiedAIResponse; optional cache header for client.
- **Invalidation:** On league/roster update or manual “Re-run” (bypass cache with skipCache).

---

## 10. Sport-aware context requirements

- **Envelope:** `sport` is required and must be one of SUPPORTED_SPORTS (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER). Resolved from league or DEFAULT_SPORT.
- **Prompt builder:** Injects sport-specific terminology (e.g. PPR vs categories, playoff format) via SportAIResolver / existing sport-defaults.
- **Tool adapters:** Trade, waiver, draft, matchup, rankings, story, etc. already receive league/context; they must pass correct sport into envelope and use it in deterministic pipelines. No single-sport assumptions in shared orchestration.

---

## 11. Future voice / TTS integration path for Chimmy

- **Interface:** VoicePlaybackController (existing) remains the client-side owner of playback. Server does not stream audio in this design.
- **Path:** (1) Chimmy returns primaryAnswer text. (2) Client optionally calls a dedicated TTS endpoint (e.g. POST /api/voice/synthesize with { text, voiceStyle? }) that uses a single provider (e.g. OpenAI TTS or other); response: audio URL or stream. (3) No provider selector for TTS in MVP; one voice style aligned with “calm” Chimmy. (4) Architecture: keep TTS out of the unified orchestration (it consumes orchestration output); add to “Content / voice” in product layer and document in tool registry as chimmy_voice.
- **Secrets:** TTS API key server-side only; no client-side voice provider choice that would require multiple keys.

---

## 12. UI/UX and click-audit requirements

### 12.1 Premium AI interface (design constraints)

- **Sleek, fast, mobile-first:** Result cards with clear hierarchy; skeletons during loading; no heavy layout shift.
- **Conversational, calm, trustworthy:** Tone from OpenAI final synthesis; confidence badge and caveats visible; no hype or overclaim.
- **Deterministic:** Show “Based on your league data” and data-derived verdict first; AI explanation as “Why” or “Summary.”
- **Premium consumer grade:** Consistent typography, spacing, and actions (copy, share, save, follow-up) across all tools.

### 12.2 Mandatory wiring for every AI surface

Each of the following must have a defined backend path and state transition; no dead elements.

| Element | Requirement |
|--------|--------------|
| **Provider selector** | Only show when multiple providers are available and product supports “compare”; selection sends mode or provider hint in request; backend resolves to real model set. If only one provider is configured, hide selector. |
| **Mode selector** | Single Model / Specialist / Consensus / Unified Brain — only if tool’s allowedModes includes them; selection passed as `mode` in request; backend uses it. |
| **Result cards** | Data from UnifiedAIResponse; map to UserExplanation; show verdict, evidence, confidence, caveats. |
| **Expand details** | Optional section with keyEvidence, risksCaveats, suggestedNextAction, and optionally “reason” or provider summary. |
| **Re-run analysis** | Same request with skipCache; loading state → success/fallback/error. |
| **Copy / Share** | Copy primaryAnswer or formatted summary; Share uses native or share sheet; no backend required. |
| **Save result** | POST to save endpoint (e.g. save to user’s notes or report); backend persists and returns id. |
| **Ask follow-up** | Navigate to Chimmy with prefill (e.g. prompt= or context=) so user can continue conversation. |
| **Open in Chimmy** | Same as ask follow-up; URL /af-legacy?tab=chat&prompt=... or /chimmy?prompt=... |
| **Compare providers** | Only when mode was consensus/unified_brain and multiple modelOutputs succeeded; show tabs or sections per model (e.g. “OpenAI”, “Grok”, “DeepSeek”) with raw text; no new API call. |
| **Fallback retry** | Button when reliability.allFailed or state=error; resend same request; show loading then result or error. |

---

## 13. Recommended folder structure

```
lib/
  unified-ai/
    types.ts                    # AIContextEnvelope, ModelOutput, OrchestrationResult, OrchestrationMode, AIModelRole
    AIOrchestrator.ts           # runOrchestration (existing)
    AIContextEnvelopeBuilder.ts
    DeterministicToAIContextBridge.ts
    ModelRoutingResolver.ts     # + Model Role Registry
    ConsensusEvaluator.ts
    UnifiedBrainComposer.ts
    AIFactGuard.ts
    AIConfidenceResolver.ts
    SportAIResolver.ts
    ToolAIEntryResolver.ts      # + AI Tool Registry
    prompts/                    # NEW: per-feature, per-model templates
      trade-analyzer.ts
      waiver-ai.ts
      chimmy-chat.ts
      ...
    prompt-builder/             # NEW: PromptBuilder, sport injection
      index.ts
      SportPromptBlockResolver.ts
    index.ts
  ai-reliability/
    types.ts
    AIFactGuard.ts              # re-export or extend unified-ai
    AIConfidenceResolver.ts
    ProviderFailureResolver.ts
    DeterministicFallbackService.ts
    ConsensusDisagreementResolver.ts
    AIResultStabilityService.ts
    index.ts
  ai-providers/                 # NEW: provider abstraction
    types.ts
    ProviderRegistry.ts
    OpenAIProvider.ts
    DeepSeekProvider.ts
    GrokProvider.ts
    index.ts
  ai-tool-layer/
    types.ts                    # ToolOutput, ToolKey, TOOL_MODEL_FLOW
    AIToolInterfaceLayer.ts
    TradeAIAdapter.ts
    WaiverAIAdapter.ts
    ... (existing)
    ToolFactGuard.ts
    AIResultSectionBuilder.ts
  ai-product-layer/            # existing
  ai/
    output-logger.ts            # logAiOutput; extend for traceId, meta
    memory.ts                   # existing
  sport-scope.ts                # SUPPORTED_SPORTS, normalizeToSupportedSport
```

- **Routes:** Keep feature routes (e.g. `app/api/dynasty-trade-analyzer/route.ts`) that build envelope and call orchestration; add optional `app/api/ai/unified/route.ts` for a single POST entry that accepts UnifiedAIRequest and returns UnifiedAIResponse (for clients that want one endpoint). Most tools continue to use their own route and call `runOrchestration` + provider abstraction internally.

---

## 14. Implementation phases

### Phase 1 — Foundation (no behavior change)

- Define and document Provider Abstraction (IProviderClient, ProviderChatRequest/Result, ProviderRegistry).
- Implement OpenAIProvider, DeepSeekProvider, GrokProvider using existing env vars; route handlers continue to call existing clients during migration.
- Extend AIContextEnvelope and Tool registry: add missing tool keys (commissioner, coach, content_*, etc.); document deterministic envelope contract.
- Add unified request/response and error schemas (types only); one shared export (e.g. `lib/unified-ai/schemas.ts`).

### Phase 2 — Orchestration and prompts

- Introduce Prompt Builder and prompt templates per tool/model; inject sport-aware blocks from SportAIResolver.
- Migrate one route (e.g. dynasty-trade-analyzer or waiver-ai) to use Provider Abstraction + Prompt Builder + runOrchestration; keep deterministic pipeline unchanged.
- Ensure ConsensusEvaluator and DeterministicFallbackService cover all failure cases; add logging (logAiOutput) for that route with traceId.

### Phase 3 — Reliability and UI contract

- Add rate limit and retry in Provider Abstraction; return UnifiedAIError on 429/timeout.
- Extend fact guard and hallucination rejection rules; document in one place.
- Frontend: adopt shared loading state and error schema; wire “Re-run”, “Open in Chimmy”, “Expand details” for migrated tools. Ensure provider/mode selectors only appear when backend supports them.

### Phase 4 — Rollout and cache

- Migrate remaining AI routes to orchestration + provider abstraction; remove duplicate `new OpenAI()` where possible.
- Add optional caching for idempotent explain flows; set cached in response.
- Enable “Compare providers” UI when modelOutputs length > 1 and feature allows.

### Phase 5 — Voice and polish

- Document TTS path; implement POST /api/voice/synthesize if not present; wire Chimmy voice button to it.
- Full click audit: provider selector, mode selector, result cards, expand, re-run, copy, share, save, follow-up, open in Chimmy, compare, retry — all mapped to backend and state.

---

## 15. Risks and guardrails

| Risk | Mitigation |
|------|------------|
| **Breaking existing behavior** | Migrate one route at a time; keep deterministic pipelines and existing API shapes until frontend is updated. |
| **Dead provider/mode buttons** | Registry defines allowedModes per tool; UI only shows options that backend accepts; single-provider config hides provider selector. |
| **Overclaiming (hallucination)** | Fact guard + confidence capping + “Based on data” language; reject numbers not in envelope. |
| **Cost spike** | Rate limit per user; log every call to AiOutput; optional per-feature caps. |
| **Provider outage** | Fallback to other models then deterministic-only; clear user message and retry. |
| **Secret leakage** | All provider keys in env; only server-side provider abstraction; no client-side provider list that implies keys. |
| **Sport bugs** | Envelope.sport required; SUPPORTED_SPORTS and SportAIResolver used in prompts and tool adapters for all seven sports. |
| **Inconsistent UX** | Shared UnifiedAIResponse → UserExplanation mapping; same loading/error components across tools. |

---

*End of Unified AI Product Architecture. No implementation code; design only.*
