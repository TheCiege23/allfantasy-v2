# AI Master Prompt Pack — Implementation Status

This file maps the **AllFantasy AI Master Prompt Pack** to the current codebase so Cursor and maintainers know what exists and what to preserve or extend.

**Reference:** [AI_MASTER_PROMPT_PACK.md](./AI_MASTER_PROMPT_PACK.md)

---

## Global rules (always apply)

| Rule | Location / notes |
|------|------------------|
| **Supported sports** | `lib/sport-scope.ts` — SUPPORTED_SPORTS (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER). Use in all AI/sport-aware code. |
| **Deterministic-first** | Enforced in trade-evaluator, dynasty-trade-analyzer, waiver-ai, rankings; envelope carries `deterministicPayload`; `lib/unified-ai`. |
| **Three-model roles** | `lib/unified-ai/ModelRoutingResolver.ts` — OpenAI (explanation/voice), DeepSeek (analysis), Grok (narrative/trends). |
| **Orchestration modes** | `lib/unified-ai/AIOrchestrator.ts` — single_model, specialist, consensus, unified_brain. |
| **UI audit** | Every AI-related prompt deliverable includes a click audit; fix dead buttons and broken wiring. |

---

## Phase 1 — Core AI architecture and guardrails

### Prompt 123 — Unified AI Interface Architecture

| Module | Status | Location |
|--------|--------|----------|
| AIOrchestrator | ✅ | `lib/unified-ai/AIOrchestrator.ts` |
| ModelRoutingResolver | ✅ | `lib/unified-ai/ModelRoutingResolver.ts` |
| ConsensusEvaluator | ✅ | `lib/unified-ai/ConsensusEvaluator.ts` |
| UnifiedBrainComposer | ✅ | `lib/unified-ai/UnifiedBrainComposer.ts` |
| AIFactGuard | ✅ | `lib/unified-ai/AIFactGuard.ts` |
| AIConfidenceResolver | ✅ | `lib/unified-ai/AIConfidenceResolver.ts` |
| ToolAIEntryResolver | ✅ | `lib/unified-ai/ToolAIEntryResolver.ts` |
| Shared context (AIContextEnvelope) | ✅ | `lib/unified-ai/types.ts` |
| Sport (in envelope / resolvers) | ✅ | `lib/sport-scope.ts` used across AI |

**Deliverable docs:** `docs/PROMPT123_UNIFIED_AI_INTERFACE_DELIVERABLE.md`

### Prompt 127 — AI Confidence / Fact Guard / Provider Failure

| Module | Status | Location |
|--------|--------|----------|
| AIFactGuard | ✅ | `lib/unified-ai/AIFactGuard.ts` |
| AIConfidenceResolver | ✅ | `lib/unified-ai/AIConfidenceResolver.ts` |
| Provider failure / fallback | ✅ | Handled in Chimmy route, waiver/trade routes; safe messages, no secrets. |
| AIResultStabilityService | ✅ | `lib/ai-reliability/AIResultStabilityService.ts` |
| Confidence in UI | ✅ | Trade/waiver/rankings surfaces; Chimmy API returns confidencePct. |

**Deliverable docs:** `docs/PROMPT127_AI_RELIABILITY_LAYER_DELIVERABLE.md`

---

## Phase 2 — Tool AI layer

### Prompt 124 — Trade / Waiver / Rankings / Draft / Psychology AI Tool Layer

| Module | Status | Location |
|--------|--------|----------|
| AIToolInterfaceLayer | ✅ | `lib/ai-tool-layer/AIToolInterfaceLayer.ts` |
| TradeAIAdapter | ✅ | `lib/ai-tool-layer/TradeAIAdapter.ts` |
| WaiverAIAdapter | ✅ | `lib/ai-tool-layer/WaiverAIAdapter.ts` |
| RankingsAIAdapter | ✅ | `lib/ai-tool-layer/RankingsAIAdapter.ts` |
| DraftAIAdapter | ✅ | `lib/ai-tool-layer/DraftAIAdapter.ts` |
| PsychologyAIAdapter | ✅ | `lib/ai-tool-layer/PsychologyAIAdapter.ts` |
| ToolFactGuard / AIResultSectionBuilder | ✅ | `lib/ai-tool-layer/` |
| ToolAIEntryResolver | ✅ | `lib/unified-ai/ToolAIEntryResolver.ts` |

**Deliverable docs:** See Prompt 124 deliverable if present.

---

## Phase 3 — Narrative / story systems

### Prompt 125 — League Story Creator / One-Brain Merge

| Module | Status | Location |
|--------|--------|----------|
| LeagueStoryCreatorService | ✅ | `lib/league-story-creator/LeagueStoryCreatorService.ts` |
| NarrativeContextAssembler, StoryFactGuard, NarrativeOutputFormatter | ✅ | `lib/league-story-creator/` |
| OneBrainNarrativeComposer | ✅ | `lib/league-story-creator/OneBrainNarrativeComposer.ts` |
| StoryToMediaBridge, SportNarrativeResolver | ✅ | `lib/league-story-creator/` |
| Story create API, tell-story (HoF, drama) | ✅ | `app/api/leagues/[leagueId]/story/create`, hall-of-fame/tell-story, drama/tell-story |

**Deliverable docs:** `docs/PROMPT125_LEAGUE_STORY_CREATOR_DELIVERABLE.md`

---

## Phase 4 — Chimmy interface and voice

### Prompt 126 — Chimmy AI Chat + Calm Voice

| Module | Status | Location |
|--------|--------|----------|
| ChimmyInterfaceService | ✅ | `lib/chimmy-interface/ChimmyInterfaceService.ts` |
| ChimmyPromptStyleResolver | ✅ | `lib/chimmy-interface/ChimmyPromptStyleResolver.ts` |
| ChimmyVoiceStyleProfile | ✅ | `lib/chimmy-interface/ChimmyVoiceStyleProfile.ts` |
| ToolContextToChimmyRouter | ✅ | `lib/chimmy-interface/ToolContextToChimmyRouter.ts` |
| ChimmyResponseFormatter, ChimmyConfidenceRenderer | ✅ | `lib/chimmy-interface/` |
| VoicePlaybackController | ✅ | `lib/chimmy-interface/VoicePlaybackController.ts` |
| ChimmyChat (calm subtitle, chips, voice, stop) | ✅ | `app/components/ChimmyChat.tsx` |
| Chimmy API (calm analyst tone) | ✅ | `app/api/chat/chimmy/route.ts` uses getChimmyPromptStyleBlock() |

**Deliverable docs:** `docs/PROMPT126_CHIMMY_INTERFACE_VOICE_DELIVERABLE.md`

---

## Phase 5 — Product-wide integration

### Prompt 129 — Master AI Product Integration Layer

| Module | Status | Location |
|--------|--------|----------|
| AIProductLayerOrchestrator | ✅ | `lib/ai-product-layer/AIProductLayerOrchestrator.ts` (export AIProductLayer) |
| UnifiedChimmyEntryResolver | ✅ | `lib/ai-product-layer/UnifiedChimmyEntryResolver.ts` |
| AIDashboardWidgetResolver | ✅ | `lib/ai-product-layer/AIDashboardWidgetResolver.ts` |
| AIToolDiscoveryBridge | ✅ | `lib/ai-product-layer/AIToolDiscoveryBridge.ts` |
| AIProductRouteResolver | ✅ | `lib/ai-product-layer/AIProductRouteResolver.ts` |
| AIConsistencyGuard | ✅ | `lib/ai-product-layer/AIConsistencyGuard.ts` |
| SportAIProductResolver | ✅ | `lib/ai-product-layer/SportAIProductResolver.ts` |
| Wiring (SharedRightRail, GlobalTopNav, TopBarUtilityResolver, AIFeaturesPanel) | ✅ | Uses getPrimaryChimmyEntry(); tabIds fixed for Draft/Waiver. |

**Deliverable docs:** `docs/PROMPT129_MASTER_AI_PRODUCT_INTEGRATION_DELIVERABLE.md`

---

## Phase 6 — End-to-end QA

### Prompt 128 — End-to-End QA Pass

| Scope | Status | Notes |
|-------|--------|------|
| Trade / Waiver / Rankings / Draft / Psychology AI | ✅ | Audited; handlers and APIs wired. |
| League Story Creator, Chimmy, media/social AI | ✅ | Audited. |
| Tool-to-Chimmy routing, confidence, fallback | ✅ | Audited; Trade Finder “Open Chat with this prompt” fixed. |
| Full UI click audit | ✅ | 40+ elements in deliverable. |

**Deliverable docs:** `docs/PROMPT128_END_TO_END_QA_AI_SURFACES_DELIVERABLE.md`

---

## Other AI-related deliverables in repo

* **Prompt 116** — Grok Social Clip Generator + auto-post: `lib/social-clips-grok/`, `app/social-clips/`, `docs/PROMPT116_*.md`
* **Prompt 121** — Viral/social sharing: referenced in docs
* **Prompt 90** — QA chat/messaging: referenced in docs

---

## When implementing a prompt from the pack

1. **Inspect first** — Read the relevant `lib/*` and `app/*` areas; don’t duplicate existing modules.
2. **Preserve** — Keep deterministic-first behavior, sport scope, and Chimmy as the product face.
3. **Audit** — For any new or touched UI, run the mandatory workflow audit (handler, state, API, persistence).
4. **Deliverable** — Add or update the prompt’s deliverable doc (e.g. `docs/PROMPT123_*.md`) with architecture, audit, QA checklist, and explanation.

---

*Last updated to reflect current codebase and existing deliverable docs.*
