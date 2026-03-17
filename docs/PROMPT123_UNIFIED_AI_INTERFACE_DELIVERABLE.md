# Prompt 123 — Unified AI Interface Architecture + 3-AI Orchestration + Full UI Click Audit

**Deliverable.** Production implementation of the unified AI interface for AllFantasy: one architecture, deterministic-first, model-specific responsibilities, and full UI click audit.

---

## 1. Unified AI Architecture

The platform uses a **single AI layer** under `lib/unified-ai/`:

| Module | Purpose |
|--------|--------|
| **AIOrchestrator** | Entry point: given `AIContextEnvelope` and pre-fetched `ModelOutput[]`, resolves mode (single/specialist/consensus/unified_brain), runs ConsensusEvaluator or UnifiedBrainComposer, applies AIFactGuard and AIConfidenceResolver, returns `OrchestrationResult`. |
| **AIContextEnvelopeBuilder** | Builds `AIContextEnvelope` from feature inputs; normalizes sport via `lib/sport-scope`; supports all contract fields. |
| **DeterministicToAIContextBridge** | Turns deterministic payloads into prompt-safe summary strings and hard-constraint lists; sources: trade_engine, rankings_engine, waiver_engine, simulation, legacy_score, reputation, psychological, graph, draft_board. |
| **ModelRoutingResolver** | Resolves orchestration mode and which model(s) to use from envelope (featureType, promptIntent, modelRoutingHints, deterministicPayload). |
| **ConsensusEvaluator** | In consensus/unified_brain: selects or merges primary answer from model outputs; prefers OpenAI for user-facing text; supports deterministic-only fallback. |
| **UnifiedBrainComposer** | Composes one response from deterministic summary + DeepSeek + Grok + OpenAI; applies fact guard and confidence. |
| **AIFactGuard** | Validates responses for invented claims and deterministic-override; suggests disclaimer when confidence is low. |
| **AIConfidenceResolver** | Derives confidence label/percentage from envelope metadata and model outputs; surfaces “confidence is limited” when appropriate. |
| **SportAIResolver** | Sport-aware context for AI: `getSupportedSportsForAI()`, `resolveSportForAI()`, `getSportLabelForPrompt()`, `buildSportContextLine()`; uses `lib/sport-scope` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). |
| **ToolAIEntryResolver** | Maps every tool/surface to `apiPath` and `featureType`; used for routing and UI click audit. |

**Data flow:** Feature → build envelope (with deterministic payload when available) → route handler calls provider APIs → handler passes `modelOutputs` + envelope into `runOrchestration()` → result (primaryAnswer, confidencePct, factGuardWarnings) returned to UI.

---

## 2. Model Responsibility Design

| Model | Responsibility | Used for |
|-------|----------------|----------|
| **OpenAI** | Final user-facing explanation, action plans, calm conversational UX, Chimmy voice. | Explanation, chat, guidance, synthesis, voice. |
| **DeepSeek** | Structured analytical reasoning, numerical interpretation, deterministic review, projection/matrix support. | Analysis, numbers, projections, matrix_review, decision_support. |
| **Grok** | Trend interpretation, narrative framing, social/media summarization, league story, engagement. | Trends, narrative, social, story, engagement. |

Routing is intentional: `ModelRoutingResolver.resolveOrchestrationMode`, `resolveSingleModel`, `resolveSpecialistPair`, `resolveModelsForConsensus` use `featureType` and `promptIntent` (and optional `modelRoutingHints`) so the right model(s) run per feature.

---

## 3. Shared Context Contract Design

**AIContextEnvelope** (`lib/unified-ai/types.ts`) is the single contract. Every AI-enabled feature should pass it into the orchestration layer.

| Field | Purpose |
|-------|--------|
| featureType | Tool/feature id (trade_analyzer, waiver_ai, chimmy_chat, graph_insight, etc.). |
| sport | Normalized via sport-scope (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). |
| leagueId, userId | When in league/user context. |
| deterministicPayload | Engine output (fairness, rankings, simulation, waiver scores). Must not be overridden by AI. |
| statisticsPayload, behaviorPayload, simulationPayload, rankingsPayload | Optional structured data for interpretation. |
| promptIntent | explain, recommend, compare, summarize, chat, narrative. |
| uiSurface | drawer, modal, chat, inline. |
| confidenceMetadata, dataQualityMetadata | From deterministic layer. |
| hardConstraints | e.g. “do not override fairnessScore”. |
| modelRoutingHints | Optional AIModelRole[] to prefer models. |
| userMessage | Raw user message or prompt suffix. |

`AIContextEnvelopeBuilder.buildAIContextEnvelope()` and `buildEnvelopeForTool()` produce envelopes; tool adapters (TradeAIAdapter, WaiverAIAdapter, etc.) use it with feature-specific deterministic payloads.

---

## 4. Orchestration and Routing Updates

- **Modes:** single_model, specialist, consensus, unified_brain. Resolved in `ModelRoutingResolver.resolveOrchestrationMode` (e.g. chimmy_chat → unified_brain; explain + deterministicPayload → specialist; single modelRoutingHint → single_model).
- **APIs:** Route handlers (e.g. Chimmy, graph-insight, trade/analyze, waiver-ai, rankings, mock-draft/ai-pick) build envelopes (or use tool adapters), call OpenAI/DeepSeek/Grok as needed, then call `runOrchestration({ envelope, modelOutputs, deterministicSource })`. They do not duplicate mode/resolution logic.
- **ToolAIEntryResolver** lists every feature and its API path so navigation and audit stay consistent.

---

## 5. Deterministic-First Enforcement Design

- **Contract:** Envelope carries `deterministicPayload`; when present, `DeterministicToAIContextBridge` produces a context summary and `buildHardConstraintsForPrompt()` adds “use only provided deterministic results; do not invent…”
- **Orchestration:** `AIOrchestrator` and `UnifiedBrainComposer` pass deterministic summary into consensus fallback when no model output is available; `usedDeterministic` is set on the result.
- **Fact guard:** `AIFactGuard` checks that responses do not override hard constraints and, when deterministic payload exists, that the answer references data (or adds a low-confidence disclaimer).
- **Product layer:** `AIConsistencyGuard.shouldEnforceDeterministicFirst(featureType)` marks which features must be deterministic-first (trade_analyzer, waiver_ai, rankings, draft_helper, etc.).

---

## 6. Full UI Click Audit Findings

Audit covers: Ask AI buttons, Explain Trade, AI Waiver, AI Draft Helper, Rankings explanation, Psychological explanation, story creator, AI chat open, suggestion chips, regenerate/copy/expand, AI tabs, back/mobile, loading/error/retry.

| # | Element | Component / Route | Handler | Backend / API | State / Reload | Status |
|---|--------|-------------------|--------|---------------|----------------|--------|
| 1 | Ask AI (trade) | TradeFinderV2 | setChatTradeContext → AIBottomSheet; “Open Chat with this prompt” → getTradeAnalyzerAIChatUrl | /af-legacy?tab=chat&prompt=… | Navigates; chat input prefilled from URL | OK |
| 2 | Copy only (trade) | TradeFinderV2 | navigator.clipboard.writeText; setChatTradeContext(null) | — | Local | OK |
| 3 | Chimmy chat send | ChimmyChat | fetch /api/chat/chimmy | POST /api/chat/chimmy | Messages state; confidence from API | OK |
| 4 | Chimmy voice / stop | ChimmyChat | speakChimmy, stopChimmyVoice | — | Local playback | OK |
| 5 | Chimmy suggested chips | ChimmyChat | getDefaultChimmyChips(); onClick sends as message | — | Same as send | OK |
| 6 | Global Chimmy link | GlobalTopNav, SharedRightRail, TopBarUtilityResolver | getPrimaryChimmyEntry().href | /chimmy or /af-legacy?tab=chat | Navigate | OK |
| 7 | Waiver AI analyze | waiver-ai page, WaiverAI component | fetch /api/waiver-ai or /api/waiver-ai/grok | POST /api/waiver-ai, /api/waiver-ai/grok | setResults, setWaiverExplanation | OK |
| 8 | League waivers AI advice | app/leagues/…/waivers/ai-advice | Proxy to /api/waiver-ai | POST /api/waiver-ai | Per league UI | OK |
| 9 | Draft “Ask AI” | DraftRoom | onAiDmSuggestion → POST /api/mock-draft/ai-pick | POST /api/mock-draft/ai-pick | setChatMessages (suggestions + aiInsight) | OK |
| 10 | Draft AI auto mode | DraftRoom | onAiAutoPickModeChange (off/bpa/needs) | — | mockAiAutoPickMode | OK |
| 11 | Run Draft AI (tab) | DraftTab | runDraftAi → recommend-ai / draft-war-room | LegacyAIPanel / recommend-ai | setAnalysis | OK |
| 12 | Rankings explain / fetch | LeagueRankingsV2Panel | fetch /api/rankings/league-v2, dynasty-roadmap | GET/POST /api/rankings/league-v2 | Panel state | OK |
| 13 | Manager psychology explain | ManagerPsychology | fetch …/psychological-profiles/explain | POST …/psychological-profiles/explain | Local narrative state | OK |
| 14 | Legacy score explain | LegacyTab, legacy breakdown page | fetch …/legacy-score/explain | POST …/legacy-score/explain | Explain state | OK |
| 15 | Reputation explain | ReputationPanel | fetch …/reputation/explain | POST …/reputation/explain | explainManager state | OK |
| 16 | Graph insight | GraphInsightDrawer | fetch …/graph-insight | POST …/graph-insight | Drawer narrative | OK |
| 17 | Hall of Fame / story | HallOfFameSection, entries/moments pages | fetch …/hall-of-fame/tell-story | POST …/hall-of-fame/tell-story | Story state | OK |
| 18 | Trade analyze (legacy) | af-legacy trade tab, trade-analyzer page | fetch /api/legacy/trade/analyze | POST /api/legacy/trade/analyze | Trade result state | OK |
| 19 | Trade evaluator | trade-evaluator page | fetch /api/trade-evaluator | POST /api/trade-evaluator | Eval result state | OK |
| 20 | AI Features panel cards | AIFeaturesPanel | onClick → fetchInsight (POST /api/ai-features), onNavigate(tabId) | POST /api/ai-features | setInsight; setActiveTab | OK |
| 21 | “Open [Tool]” from AI panel | AIFeaturesPanel | onNavigate(feature.tabId) | — | setActiveTab (trade, mock-draft, waiver, rankings, finder, transfer) | OK |
| 22 | Ask AI Coach (rankings) | af-legacy rankings | askAiCoach | AI coach API | aiCoach, aiCoachError, aiCoachLoading | OK |
| 23 | Ask Chimmy about playoff odds | LeagueForecastDashboard | Link /af-legacy?tab=chat&prompt=… | — | Chat tab + prefilled prompt | OK |
| 24 | Bracket AI Coach link | BracketHomeTabs, BracketEntryActionsCard | href /af-legacy?tab=chat | — | Navigate | OK |
| 25 | Career/XP explain | CareerTab | explainCareer, explainXP | Explain APIs | explain state | OK |
| 26 | Awards explain | AwardsTab | onExplain | — | Modal/panel | OK |
| 27 | Record book explain | RecordBooksTab | onExplain | — | Modal/panel | OK |
| 28 | Rivalry explain | LeagueIntelligenceGraphPanel | rivalryExplainId, rivalryExplainNarrative | Narrative fetch | Local state | OK |
| 29 | Deep link tab (URL) | af-legacy page | useEffect searchParams.get('tab') → handleActiveTabChange(tab) | — | setActiveTab; chat prompt from ?prompt= | Fixed (see §8) |
| 30 | Chat prompt prefill | af-legacy page | searchParams.get('prompt') → setChatInput | — | setChatInput | OK |

**Summary:** All audited AI entry points have a defined handler, correct API or navigation target, and state/refresh behavior. One fix applied: deep-link tab sync extended to all tabs (player-finder, transfer, strategy, shop, ideas, pulse).

---

## 7. QA Findings

- **Single-model mode:** Used when one model is sufficient; resolver picks model from feature/intent/hints; fact guard and confidence applied. OK.
- **Specialist mode:** Used for explain + deterministic payload; DeepSeek + OpenAI pair; orchestration returns explanation model’s answer. OK.
- **Consensus / unified_brain:** Multiple models; ConsensusEvaluator prefers OpenAI; deterministic fallback when no model output. OK.
- **Deterministic-first:** Envelope.deterministicPayload flows to bridge, constraints, and fact guard; no override of engine results in design. OK.
- **Fallback when provider fails:** Consensus/UnifiedBrain use deterministic summary as fallback; Chimmy and other routes return safe messages on error. OK.
- **Confidence metadata:** AIConfidenceResolver and API responses expose confidencePct/label; UI can show “confidence is limited”. OK.
- **Sport scope:** SportAIResolver and sport-scope cover NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER. OK.

---

## 8. Issues Fixed

| Issue | Fix |
|-------|-----|
| Deep links to /af-legacy?tab=transfer (and other tabs) did not set activeTab | Extended the tab list in the URL sync `useEffect` to include: player-finder, transfer, strategy, shop, ideas, pulse. |
| Unified contract not explicitly documented in code | Added comment in `lib/unified-ai/types.ts` that AIContextEnvelope is the unified AI contract (Prompt 123) and must not override deterministic results. |

No dead AI buttons or stub flows were found; Trade Finder “Open Chat with this prompt” was previously fixed (Prompt 128).

---

## 9. Final QA Checklist

- [x] All supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) used via sport-scope and SportAIResolver.
- [x] Deterministic-first: envelope carries deterministicPayload; bridge and fact guard enforce no override.
- [x] Model roles: OpenAI (explanation/voice), DeepSeek (analysis), Grok (narrative) applied via ModelRoutingResolver.
- [x] Four orchestration modes implemented and used by AIOrchestrator.
- [x] Shared context: AIContextEnvelope and AIContextEnvelopeBuilder used across tool adapters and routes.
- [x] ToolAIEntryResolver maps all tools to API paths and featureTypes.
- [x] UI click audit: Ask AI, Explain, Chimmy, Waiver, Draft, Rankings, Psychology, Legacy, Reputation, Graph, Story, AI panel, deep links verified.
- [x] Deep-link tab sync includes all Tab values so every AI entry route opens the correct tab.
- [x] No AI response invented without data; fact guard and confidence in place.

---

## 10. Explanation of the Unified AI Interface System

AllFantasy’s AI is **one architecture**: every AI feature builds an **AIContextEnvelope** (feature, sport, league, user, deterministic payload, intent, constraints) and passes it into the **orchestration layer**. The **AIOrchestrator** does not call providers itself; route handlers do that and pass in **model outputs**. The orchestrator chooses **mode** (single/specialist/consensus/unified_brain) from the envelope, then either picks one model’s answer or runs **ConsensusEvaluator** / **UnifiedBrainComposer** to produce one **primaryAnswer**. **AIFactGuard** and **AIConfidenceResolver** ensure answers are fact-grounded and confidence is visible. **DeterministicToAIContextBridge** turns engine results into prompt context and hard constraints so the AI explains rather than overrides. **SportAIResolver** and **ToolAIEntryResolver** keep sport and tool routing consistent. The **mandatory UI audit** confirmed every AI button and route is wired to a handler and the correct API or navigation target, with one fix for deep-link tab sync so all tabs (including transfer, strategy, shop, ideas, pulse, player-finder) open correctly from URLs.

---

*End of Prompt 123 deliverable.*
