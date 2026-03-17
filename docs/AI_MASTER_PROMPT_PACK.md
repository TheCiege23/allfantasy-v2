# AllFantasy AI Master Prompt Pack

## Purpose

This document consolidates the AI build prompts for AllFantasy into one clean pack, ordered for implementation. It is designed to help Cursor act consistently across the platform's AI layer.

## Global rules for every AI prompt

### Supported sports

Always support these sports unless explicitly told otherwise:

* NFL
* NHL
* NBA
* MLB
* NCAA Basketball
* NCAA Football
* Soccer

### Deterministic-first rule

Where a deterministic or structured engine exists, it must go first. AI explains, interprets, or synthesizes, but does not invent or override hard rules.

### Three-model responsibility model

* **OpenAI**: final user-facing explanation, action plans, calm conversational UX, Chimmy personality and voice-ready output.
* **DeepSeek**: structured analytical reasoning, numerical interpretation, deterministic review, projection/matrix support.
* **Grok**: trend framing, narrative voice, social/media-ready phrasing, storyline and engagement-oriented summaries.

### Allowed orchestration modes

1. Single-Model Mode
2. Specialist Mode
3. Consensus Mode
4. Unified Brain Mode

### Mandatory workflow audit requirement

For every clickable or interactive UI element:

* identify the component and route
* verify the handler exists
* verify local state updates correctly
* verify backend/API/model wiring is correct
* verify persisted or cached data reloads correctly
* fix dead buttons, stale UI, broken transitions, partial saves, incorrect redirects, and mismatched preview vs saved state

---

# Build Order

## Phase 1 — Core AI architecture and guardrails

### Prompt 123 — Unified AI Interface Architecture + 3-AI Orchestration + Full UI Click Audit

Build the unified AI interface architecture for all AI-powered features in AllFantasy.

**Primary goals**

* one AI architecture across the platform
* deterministic-first analysis
* model-specific responsibilities
* specialist / consensus / one-brain modes
* calm, grounded, trustworthy AI behavior

**Core modules**

* AIOrchestrator
* AIContextEnvelopeBuilder
* DeterministicToAIContextBridge
* ModelRoutingResolver
* ConsensusEvaluator
* UnifiedBrainComposer
* AIFactGuard
* AIConfidenceResolver
* SportAIResolver
* ToolAIEntryResolver

**Deliverables**

1. unified AI architecture
2. model responsibility design
3. shared context contract design
4. orchestration and routing updates
5. deterministic-first enforcement design
6. full UI click audit findings
7. QA findings
8. issues fixed
9. final QA checklist
10. explanation of the unified AI interface system

### Prompt 127 — AI Confidence / Fact Guard / Provider Failure Handling + Full UI Click Audit

Build the AI reliability layer.

**Primary goals**

* confidence handling
* fact guards
* provider failure handling
* deterministic fallback behavior
* disagreement handling
* stale/missing-data handling

**Core modules**

* AIFactGuard
* AIConfidenceResolver
* ProviderFailureResolver
* ConsensusDisagreementResolver
* DeterministicFallbackService
* AIResultStabilityService
* AIFailureStateRenderer

**Deliverables**

1. AI reliability architecture
2. confidence and fact-guard design
3. provider failure handling design
4. backend guardrail updates
5. frontend confidence/error/fallback updates
6. full UI click audit findings
7. QA findings
8. issues fixed
9. final QA checklist
10. explanation of the AI reliability layer

---

## Phase 2 — Tool AI layer

### Prompt 124 — Trade / Waiver / Rankings / Draft / Psychology AI Tool Layer + Full UI Click Audit

Build the shared AI tool layer for all major AllFantasy tools.

**Features in scope**

* Trade Analyzer
* Waiver Wire Advisor
* League Rankings explanations
* AI Draft Helper
* Psychological system explanations
* Matchup explanations
* Legacy / Dynasty / Rivalry explanations
* future AI tools

**Core modules**

* AIToolInterfaceLayer
* TradeAIAdapter
* WaiverAIAdapter
* RankingsAIAdapter
* DraftAIAdapter
* PsychologyAIAdapter
* ToolOutputFormatter
* AIFactGuard
* AIResultSectionBuilder

**Deliverables**

1. AI tool layer architecture
2. per-tool model routing design
3. fact-guard and confidence logic
4. backend tool-AI adapter updates
5. frontend AI result surface updates
6. full UI click audit findings
7. QA findings
8. issues fixed
9. final QA checklist
10. explanation of the AI tool layer

---

## Phase 3 — Narrative / story systems

### Prompt 125 — League Story Creator / Narrative AI / One-Brain Merge + Full UI Click Audit

Build the League Story Creator and the one-brain merged narrative system.

**Primary goals**

* fact-grounded story generation
* weekly recaps
* rivalry stories
* playoff stories
* trade fallout stories
* dynasty stories
* bracket challenge stories
* one-brain merge using deterministic data + DeepSeek + Grok + OpenAI

**Core modules**

* LeagueStoryCreatorService
* NarrativeContextAssembler
* OneBrainNarrativeComposer
* StoryFactGuard
* NarrativeOutputFormatter
* StoryToMediaBridge
* SportNarrativeResolver

**Deliverables**

1. story creator architecture
2. one-brain merge design
3. narrative context assembly updates
4. fact-guard design
5. frontend story surface updates
6. full UI click audit findings
7. QA findings
8. issues fixed
9. final QA checklist
10. explanation of the league story creator system

---

## Phase 4 — Chimmy interface and voice

### Prompt 126 — Chimmy AI Chat Interface + Calm Natural Voice + Full UI Click Audit

Build and polish the Chimmy AI interface, including voice behavior.

**Primary goals**

* make Chimmy feel like one trustworthy assistant
* calm, natural, steady voice style
* context-aware tool routing into AI chat
* evidence-first answers
* support text and voice-ready interface

**Voice style requirements**

* natural
* calm
* steady
* clear
* friendly
* not gimmicky
* not overexcited
* analyst-like by default

**Core modules**

* ChimmyInterfaceService
* ChimmyPromptStyleResolver
* ChimmyVoiceStyleProfile
* ToolContextToChimmyRouter
* ChimmyResponseFormatter
* ChimmyConfidenceRenderer
* VoicePlaybackController if supported

**Deliverables**

1. Chimmy interface architecture
2. conversational style design
3. calm voice style design
4. backend/orchestration updates
5. frontend chat/voice updates
6. full UI click audit findings
7. QA findings
8. issues fixed
9. final QA checklist
10. explanation of the Chimmy interface and voice system

---

## Phase 5 — Product-wide integration

### Prompt 129 — Master AI Product Integration Layer + Full UI Click Audit

Build the final AI product integration layer that connects all AI surfaces into one coherent AllFantasy intelligence system.

**Primary goals**

* unify tool-specific AI, private AI chat, dashboard widgets, story/media/blog generation, commissioner AI, legacy/rivalry narratives
* make Chimmy the face of the AI layer
* make all AI surfaces feel coordinated and consistent

**Core modules**

* AIProductLayerOrchestrator
* UnifiedChimmyEntryResolver
* AIDashboardWidgetResolver
* AIToolDiscoveryBridge
* AIProductRouteResolver
* AIConsistencyGuard
* SportAIProductResolver

**Deliverables**

1. master AI product architecture
2. orchestration and routing updates
3. dashboard/tool/chat integration updates
4. consistency/guardrail updates
5. full UI click audit findings
6. QA findings
7. issues fixed
8. final QA checklist
9. explanation of the master AI product integration layer

---

## Phase 6 — End-to-end QA

### Prompt 128 — End-to-End QA Pass for All AI Surfaces + Full UI Click Audit

Run a full end-to-end QA pass on all AI surfaces.

**Test scope**

* Trade Analyzer AI
* Waiver AI
* Rankings AI
* Draft AI
* Psychological AI
* League Story Creator
* Chimmy AI chat
* media/content AI tools
* reliability, fallback, confidence, and provider failure handling

**Deliverables**

1. QA findings
2. full UI click audit findings
3. bugs found
4. issues fixed
5. regression risks
6. final QA checklist
7. explanation of the end-to-end AI validation pass

---

# Recommended implementation order

1. Prompt 123
2. Prompt 127
3. Prompt 124
4. Prompt 125
5. Prompt 126
6. Prompt 129
7. Prompt 128

---

# Key architectural principles to preserve

## 1. AI never replaces deterministic engines

Where rankings, fairness scores, simulation outputs, acceptance probabilities, or structured evidence already exist, AI must consume and explain them rather than inventing a replacement.

## 2. OpenAI / DeepSeek / Grok must have specific jobs

Do not blend all three models blindly. Route them intentionally based on task type.

## 3. One-brain mode is a merge, not a vote without structure

The "one brain" response should be composed from:

* deterministic facts
* DeepSeek structured interpretation
* Grok narrative/trend framing
* OpenAI final user-facing response

## 4. Confidence must be visible and grounded

If data quality is weak, the AI should be less confident and say why.

## 5. Chimmy is the product face of AI

Even when multiple models power the backend, the user experience should feel like one cohesive assistant.

---

# Suggested future expansion after this pack

After these prompts are complete, the next high-value AI expansions would be:

* AI media orchestration unification
* AI admin / commissioner escalation workflows
* AI-powered onboarding and tool discovery
* multilingual AI response layer for English / Spanish
* voice input and conversational follow-up memory within Chimmy

---

# Short operational note for Cursor

When using this pack in Cursor, instruct it to:

* inspect the current implementation first
* preserve the deterministic trade analyzer pattern you already built
* keep all AI outputs fact-grounded
* audit every button and route tied to AI
* never leave dead buttons or stub AI flows in production UI
