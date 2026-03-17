# AllFantasy AI Systems Audit — Repository Map & Analysis

**Purpose:** Full audit of every AI-related system, route, component, service, provider, prompt, DB table, queue, and UI surface. No code changes; inspection only.

**Binding context:** AllFantasy Master Project Context (seven sports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer; deterministic-first; Chimmy as product face; AI Master Prompt Pack).

---

## Executive summary

- **Unified AI core** is in place: `lib/unified-ai` (orchestrator, envelope, model routing, consensus, fact guard, confidence, sport/tool resolvers) and `lib/ai-reliability` (provider failure, deterministic fallback, confidence capping, AIFailureStateRenderer). Tool adapters (`lib/ai-tool-layer`), league story creator (`lib/league-story-creator`), Chimmy interface (`lib/chimmy-interface`), and product layer (`lib/ai-product-layer`) are implemented and wired.
- **Provider wiring:** OpenAI is used in 30+ routes and libs (mixed: shared `openai-client` helpers vs per-route `new OpenAI()`). DeepSeek and Grok/XAI have dedicated clients (`lib/deepseek-client`, `lib/xai-client`, `lib/ai-external/grok`); Chimmy and waiver/story/trade use multi-provider flows. Env vars are consistent (AI_INTEGRATIONS_*, OPENAI_*, DEEPSEEK_*, XAI_*, GROK_*).
- **Deterministic vs AI boundaries** are clear: trade (deterministic pipeline + quality gate then AI), waiver (scores then Grok/OpenAI), rankings (engine then explain), story (assembled context then one-brain), Chimmy (domain guard + multi-model). Fallback when all providers fail exists for trade (deterministic-only response) and Chimmy (safe message + meta).
- **Gaps:** (1) No single shared OpenAI client used everywhere—many routes instantiate `new OpenAI()` locally. (2) AI output logging (`logAiOutput`) is used only in trade-evaluator, ai/chat, and waiver-ai—not in Chimmy, dynasty-trade-analyzer, or story/create. (3) No dedicated “Generate Story” UI for `story/create`. (4) Prompt 124 has no deliverable doc in the status file. (5) Some legacy routes use `OPENAI_API_KEY` directly instead of `AI_INTEGRATIONS_OPENAI_API_KEY`.
- **Dead/stale:** Per Prompt 128 audit, no dead AI buttons were found after the Trade Finder “Open Chat with this prompt” fix. All 14 af-legacy tabs (including transfer, strategy, shop, ideas) are synced from URL and render content.
- **Risks:** Duplicate OpenAI instantiation and inconsistent logging; dependency on three providers (availability/cost); large af-legacy client state; Redis/BullMQ required for simulation queues.

---

## 1. Repository map of all AI-related files and folders

### 1.1 Core AI (unified + reliability + tool layer)

| Path | Role |
|------|------|
| **lib/unified-ai/** | Single orchestration layer: types (AIContextEnvelope, OrchestrationMode, etc.), AIOrchestrator, AIContextEnvelopeBuilder, DeterministicToAIContextBridge, ModelRoutingResolver, ConsensusEvaluator, UnifiedBrainComposer, AIFactGuard, AIConfidenceResolver, SportAIResolver, ToolAIEntryResolver, index. |
| **lib/ai-reliability/** | Confidence capping, provider failure, deterministic fallback (trade): types, AIFactGuard, AIConfidenceResolver, ProviderFailureResolver, ConsensusDisagreementResolver, DeterministicFallbackService, AIResultStabilityService, index. |
| **lib/ai-tool-layer/** | Tool adapters and interface: types, AIToolInterfaceLayer, TradeAIAdapter, WaiverAIAdapter, RankingsAIAdapter, DraftAIAdapter, PsychologyAIAdapter, ToolFactGuard, AIResultSectionBuilder. |
| **components/ai-reliability/** | AIFailureStateRenderer (fallback banner, retry, confidence, expandable provider/details). |
| **components/ai-confidence/** | ConfidenceBadge, TrustExplanationSheet, TrustTimeline, ConfidenceMeter, RiskChip, GuardianStateOverlay (used on af-legacy trade/rankings). |

### 1.2 Provider clients and external AI

| Path | Role |
|------|------|
| **lib/openai-client.ts** | Shared OpenAI: getOpenAIClient(), openaiChatText(), openaiChatJson(), parseJsonContentFromChatCompletion. Used by many libs; many API routes still use `new OpenAI()` locally. |
| **lib/deepseek-client.ts** | DeepSeek chat; DEEPSEEK_API_KEY. Used by Chimmy, league-story-creator, trade/waiver/rankings flows. |
| **lib/xai-client.ts** | XAI/Grok HTTP client (chat). Used by Chimmy and other Grok call sites. |
| **lib/ai-external/grok.ts** | grokEnrich(), getGrokConfigFromEnv(); GROK_BASE_URL, GROK_API_KEY/XAI_API_KEY. |
| **lib/ai-external/grok-types.ts** | Request/response types for Grok. |
| **lib/ai-external/grok-safety.ts** | validateAndSanitizeGrokJson, safety rules for Grok output. |

### 1.3 Chimmy

| Path | Role |
|------|------|
| **app/api/chat/chimmy/route.ts** | Main Chimmy API: domain guard, vision, user context, OpenAI + Grok + DeepSeek in parallel, buildConsensus, memory record, confidencePct and providerStatus in meta; full-provider failure returns safe message + meta (confidencePct: 0). |
| **app/components/ChimmyChat.tsx** | Chat UI: send, chips, voice toggle, stop voice, subtitle; POST /api/chat/chimmy; does not yet display meta.confidencePct or provider status. |
| **app/chimmy/page.tsx** | Chimmy landing page. |
| **app/chimmy/ChimmyLandingClient.tsx** | Landing content; links to /af-legacy?tab=chat. |
| **lib/chimmy-interface/** | ChimmyInterfaceService, ChimmyPromptStyleResolver, ChimmyVoiceStyleProfile, ToolContextToChimmyRouter, ChimmyResponseFormatter, ChimmyConfidenceRenderer, VoicePlaybackController (TTS), types, index. |

### 1.4 Trade AI

| Path | Role |
|------|------|
| **app/api/dynasty-trade-analyzer/route.ts** | Assemble context, runPeerReviewAnalysis (dual-brain), quality gate; on consensus null uses buildStableFallbackResponse (deterministic-only); returns reliability (usedDeterministicFallback, etc.). |
| **app/api/trade-evaluator/route.ts** | Full trade evaluator; openaiChatJson; logAiOutput. |
| **app/api/legacy/trade/analyze/route.ts** | Legacy trade analyze; openaiChatJson. |
| **app/api/instant/trade/route.ts** | Instant trade. |
| **app/api/instant/improve-trade/route.ts** | Improve trade (OpenAI + Grok tools). |
| **app/api/redraft-trade/route.ts** | Redraft trade (new OpenAI()). |
| **app/api/trade-partner/route.ts** | Trade partner (new OpenAI()). |
| **app/api/trade-partner-match/route.ts** | Partner match. |
| **lib/trade-engine/** | dual-brain-trade-analyzer, ai-layer, ai-assist-orchestrator, grok-ai-layer, grok-enrichment, deterministic-intelligence, trade-response-formatter, quality-gate, trade-analyzer-intel, trade-analysis-schema, value-context-service, trade-context-assembler, trade-decision-context, packageBuilder, gpt-input-contract, etc. |
| **lib/trade-analyzer/TradeToAIContextBridge.ts** | getTradeAnalyzerAIChatUrl, buildTradeSummaryForAI. |
| **components/DynastyTradeForm.tsx** | Uses AIFailureStateRenderer, handleAnalyze → POST dynasty-trade-analyzer, reliability state. |
| **components/TradeFinderV2.tsx** | Ask AI modal: Open Chat with prompt (getTradeAnalyzerAIChatUrl), Copy only; Re-check, Retry, confidence detail expand. |
| **components/InstantTradeAnalyzer.tsx** | Run analysis, copy. |

### 1.5 Waiver AI

| Path | Role |
|------|------|
| **app/api/waiver-ai/route.ts** | Multi-model waiver (DeepSeek, Grok, OpenAI); logAiOutput. |
| **app/api/waiver-ai/grok/route.ts** | Waiver Grok-only path (new OpenAI() for XAI base). |
| **app/api/waiver-ai-suggest/route.ts** | Waiver suggest. |
| **app/api/legacy/waiver/analyze/route.ts** | Legacy waiver analyze (new OpenAI()). |
| **app/api/ai/waiver/route.ts** | AI waiver (new OpenAI()). |
| **lib/waiver-engine/** | grok-waiver-ai-layer, waiver-grok-adapter, grok-waiver-enrichment, waiver-scoring, team-needs. |
| **lib/waiver-ai-prompt.ts** | Waiver prompt content. |
| **lib/waiver-wire/WaiverToAIContextBridge.ts** | Waiver → AI chat URL. |
| **app/waiver-ai/page.tsx** | Standalone waiver AI page; POST /api/waiver-ai. |
| **app/components/WaiverAI.tsx** | POST /api/waiver-ai/grok. |
| **app/components/WaiverSuggestionCard.tsx** | Displays suggestion. |

### 1.6 Draft AI

| Path | Role |
|------|------|
| **app/api/mock-draft/ai-pick/route.ts** | AI pick (new OpenAI()). |
| **app/api/mock-draft/simulate/route.ts** | Simulate (OpenAI). |
| **app/api/mock-draft/needs/route.ts** | Needs (new OpenAI()). |
| **app/api/mock-draft/trade-action/route.ts** | Trade action (new OpenAI()). |
| **app/api/mock-draft/trade-propose/route.ts** | Trade propose (new OpenAI()). |
| **app/api/mock-draft/trade-sim/route.ts** | Trade sim (new OpenAI()). |
| **app/api/mock-draft/trade-simulate/route.ts** | Trade simulate. |
| **app/api/mock-draft/update-weekly/route.ts** | Update weekly (new OpenAI()). |
| **lib/draft-room/DraftToAIContextBridge.ts** | getDraftAIChatUrl, buildDraftSummaryForAI. |
| **app/af-legacy/components/mock-draft/DraftRoom.tsx** | Ask AI button → onAiDmSuggestion (POST ai-pick); AI mode toggles. |
| **hooks/useAIDraftAssistant.ts** | POST /api/mock-draft/ai-pick. |

### 1.7 Rankings / psychology AI

| Path | Role |
|------|------|
| **app/api/rankings/league-v2/route.ts** | Rankings league v2. |
| **app/api/rankings/manager-psychology/route.ts** | Manager psychology (OpenAI). |
| **app/api/rankings/dynasty-roadmap/route.ts** | Dynasty roadmap. |
| **app/api/rankings/route.ts** | Rankings (new OpenAI()). |
| **app/api/rankings/adaptive/route.ts** | Adaptive rankings. |
| **app/api/legacy/rankings/analyze/route.ts** | Legacy rankings analyze (new OpenAI()). |
| **app/api/legacy/rankings/enhanced/route.ts** | Enhanced (new OpenAI()). |
| **app/api/legacy/rankings/playoff-forecast/route.ts** | Playoff forecast (new OpenAI()). |
| **app/api/leagues/[leagueId]/psychological-profiles/explain/route.ts** | Psychology explain. |
| **components/ManagerPsychology.tsx** | Run/explain psychology. |
| **components/LeagueRankingsV2Panel.tsx** | Rankings panel; fetch league-v2, dynasty-roadmap. |

### 1.8 Story / narrative AI

| Path | Role |
|------|------|
| **lib/league-story-creator/** | LeagueStoryCreatorService, NarrativeContextAssembler, OneBrainNarrativeComposer (DeepSeek + Grok + OpenAI), StoryFactGuard, NarrativeOutputFormatter, StoryToMediaBridge, SportNarrativeResolver, types, index. |
| **app/api/leagues/[leagueId]/story/create/route.ts** | POST story/create (createLeagueStory). |
| **app/api/leagues/[leagueId]/hall-of-fame/tell-story/route.ts** | HoF tell-story (entry/moment narrative). |
| **app/api/leagues/[leagueId]/drama/tell-story/route.ts** | Drama tell-story (buildDramaNarrative). |
| **lib/drama-engine/AIDramaNarrativeAdapter.ts** | buildDramaNarrative. |
| **lib/hall-of-fame-engine/AIHallOfFameNarrativeAdapter.ts** | entryToNarrativeContext, momentToNarrativeContext, buildWhyInductedPromptContext. |
| **components/rankings/HallOfFameSection.tsx** | onTellStory(entry|moment, id); POST hall-of-fame/tell-story. |
| **components/app/league/LeagueDramaWidget.tsx** | tellStory(eventId); POST drama/tell-story. |
| **app/app/league/[leagueId]/hall-of-fame/entries/[entryId]/page.tsx** | tellStory; POST hall-of-fame/tell-story. |
| **app/app/league/[leagueId]/hall-of-fame/moments/[momentId]/page.tsx** | tellStory. |
| **app/app/league/[leagueId]/drama/[eventId]/page.tsx** | tellStory; POST drama/tell-story. |

### 1.9 Content / media / social AI

| Path | Role |
|------|------|
| **lib/social-clips-grok/** | GrokSocialContentService, SocialClipGenerator, SocialPromptBuilder, types, index. |
| **app/api/social-clips/generate/route.ts** | Generate social clip (Grok). |
| **app/api/social-clips/[assetId]/approve/route.ts** | Approve. |
| **app/api/social-clips/[assetId]/publish/route.ts** | Publish. |
| **app/api/social-clips/[assetId]/logs/route.ts** | Logs. |
| **app/api/social-clips/retry/[logId]/route.ts** | Retry failed publish. |
| **app/api/share/targets/route.ts** | Share targets (auto-post toggle). |
| **app/api/share/preview/route.ts** | Share preview. |
| **app/api/share/generate-copy/route.ts** | Generate copy. |
| **app/api/legacy/share/route.ts** | Legacy share (Grok captions). |
| **lib/social-sharing/** | GrokShareCopyService, SharePreviewResolver, SocialSharePromptBuilder, SharePublishService. |
| **lib/automated-blog/BlogContentGenerator.ts** | openaiChatText. |
| **lib/fantasy-news-aggregator/NewsSummarizerAI.ts** | OpenAI. |
| **lib/sports-media-engine/NarrativeBuilder.ts** | openaiChatText. |
| **app/social-clips/page.tsx** | Generate, list. |
| **app/social-clips/[assetId]/page.tsx** | Preview, approve, publish, retry, regenerate, copy. |

### 1.10 Matchup / simulation AI

| Path | Role |
|------|------|
| **app/api/simulation/matchup/route.ts** | Matchup simulation. |
| **app/api/bracket/ai/matchup/route.ts** | Bracket AI matchup. |
| **lib/matchup-simulator/SimulatorToAIContextBridge.ts** | getMatchupAIChatUrl, buildMatchupSummaryForAI. |
| **components/simulation/LeagueForecastDashboard.tsx** | “Ask Chimmy about playoff odds” → /af-legacy?tab=chat&prompt=... |
| **components/simulation/MatchupSimulationCard.tsx** | Explain matchup link. |
| **lib/ai-simulation-integration/** | AISimulationQueryService, AIProjectionInterpreter, SportAIContextResolver. |

### 1.11 Bracket / other AI

| Path | Role |
|------|------|
| **lib/ai/bracket-orchestrator.ts** | DeepSeek + Grok + OpenAI for bracket. |
| **lib/brackets/intelligence/ai-narrator.ts** | OpenAI. |
| **app/api/bracket/intelligence/review/route.ts** | openaiChatJson. |
| **app/api/bracket/ai/pick-assist/route.ts** | Pick assist. |
| **app/api/leagues/[leagueId]/graph-insight/route.ts** | Graph insight (league intelligence). |
| **components/app/league-intelligence/GraphInsightDrawer.tsx** | fetch graph-insight. |
| **lib/commentary-engine/** | CommentaryEngine, NarrativeGenerator (openaiChatText). |
| **lib/fantasy-coach/FantasyCoachAI.ts** | openaiChatText. |
| **app/api/legacy/ai-coach/route.ts** | AI coach (OPENAI_API_KEY). |
| **app/api/legacy/ai/run/route.ts** | Legacy AI run. |
| **app/api/legacy/ai-report/route.ts** | AI report (new OpenAI()). |
| **app/api/legacy/transfer/route.ts** | Transfer storylines (OpenAI). |
| **app/api/legacy/community-insights/route.ts** | Community insights (new OpenAI()). |
| **app/api/legacy/player-finder/route.ts** | Player finder (new OpenAI()). |
| **app/api/legacy/compare/route.ts** | Compare (new OpenAI()). |
| **app/api/legacy/devy-board/route.ts** | Devy board (new OpenAI()). |
| **app/api/dynasty-outlook/route.ts** | Dynasty outlook (OpenAI). |
| **app/api/ai-features/route.ts** | AI features panel insights (new OpenAI()). |
| **app/api/leagues/[leagueId]/forecast-summary/route.ts** | openaiChatText. |
| **app/api/player-comparison/insight/route.ts** | Player comparison insight (new OpenAI()). |
| **app/api/market-alerts/route.ts** | Market alerts (new OpenAI()). |
| **lib/ai-gm-intelligence.ts** | GM intelligence (OpenAI). |
| **lib/smart-trade-recommendations.ts** | Smart recommendations (new OpenAI()). |
| **lib/season-strategy.ts** | Season strategy. |
| **lib/league-advisor/LeagueAdvisorService.ts** | League advisor. |
| **lib/meta-insights/AIMetaContextResolver.ts** | Meta context. |
| **lib/ai/AISportContextResolver.ts** | Sport context for AI. |
| **lib/ai/SportAwareRecommendationService.ts** | Recommendations. |
| **lib/prestige-governance/AIPrestigeContextResolver.ts** | Prestige context. |

### 1.12 AI memory, logs, moderation

| Path | Role |
|------|------|
| **lib/ai-memory.ts** | getOrCreateUserProfile, getLeagueContext, getTeamSnapshots, getRecentMemoryEvents, getAIMemorySummary, recordMemoryEvent (writes AIMemoryEvent). Used by Chimmy and others. |
| **lib/ai/output-logger.ts** | logAiOutput (writes AiOutput). Used by trade-evaluator, ai/chat, waiver-ai only. |
| **lib/moderation/** | UserModerationService, ModerationQueueService. Chat/report flows; not LLM content-safety in code. |
| **app/api/shared/chat/report/message/route.ts** | Report message. |
| **app/api/admin/moderation/** | Moderation admin actions. |

### 1.13 Product layer and navigation

| Path | Role |
|------|------|
| **lib/ai-product-layer/** | AIProductLayerOrchestrator, UnifiedChimmyEntryResolver, AIDashboardWidgetResolver, AIToolDiscoveryBridge, AIProductRouteResolver, AIConsistencyGuard, SportAIProductResolver, types, index. |
| **lib/tool-hub/ToolDiscoveryNavigationService.ts** | chimmy(), etc. |
| **lib/search/QuickActionsService.ts** | ask_chimmy → /af-legacy?tab=chat. |
| **lib/search/SearchResultResolver.ts** | legacy-chat, etc. |
| **lib/notification-center/TopBarUtilityResolver.ts** | Chimmy entry. |
| **components/navigation/SharedRightRail.tsx** | getPrimaryChimmyEntry(). |
| **components/shared/GlobalTopNav.tsx** | getPrimaryChimmyEntry(). |
| **components/AIFeaturesPanel.tsx** | Cards: trade, rivalry, draft, waiver, rankings, finder; fetchInsight POST /api/ai-features; onNavigate(tabId). |
| **app/af-legacy/page.tsx** | Tab state; chat tab with prompt prefill; all tabs (overview, trade, finder, waiver, rankings, mock-draft, chat, share, transfer, strategy, shop, ideas, pulse, compare, player-finder) synced from URL. |

### 1.14 Legacy / chat routes

| Path | Role |
|------|------|
| **app/api/legacy/chat/route.ts** | Legacy chat (new OpenAI()). |
| **app/api/ai/chat/route.ts** | AI chat (logAiOutput). |

### 1.15 Env and config

| Path | Role |
|------|------|
| **.env.example** | AI_INTEGRATIONS_OPENAI_API_KEY, OPENAI_*, XAI_*, GROK_*, DEEPSEEK_API_KEY, OPENAI_ASSIST_ENABLED, GROK_ENRICH_*, GROK_ENRICH_WAIVERS_*. |
| **lib/platform/service-map.ts** | ai-orchestrator endpoints listed. |

### 1.16 Database (Prisma) — AI-related models

| Model | Purpose |
|-------|---------|
| **AiOutput** | Log of AI output (provider, role, taskType, targetType/targetId, model, contentText/contentJson, confidence, meta, tokens). Used by logAiOutput (trade-evaluator, ai/chat, waiver-ai). |
| **AIMemoryEvent** | Chimmy/AI memory (userId, leagueId, teamId, eventType, subject, content, confidence, expiresAt). Used by ai-memory. |
| **AIUserProfile** | User AI preferences (toneMode, detailLevel, riskMode, strategyBias, etc.). Used by ai-memory. |
| **AILeagueContext** | League context for AI (sport, format, scoringSettings, marketBaselines, etc.). |
| **AITeamStateSnapshot** | Team state snapshot for AI. |
| **AIIssue** | AI issue backlog (admin). |
| **AIIssueFeedback** | Feedback on AIIssue. |
| **LegacyAIReport** | Legacy AI report. |
| **SocialContentAsset** | Social clip asset. |
| **SocialPublishTarget** | Publish target (platform, autoPostingEnabled). |
| **SocialPublishLog** | Publish log (retry, status). |

### 1.17 Queues

| Path | Role |
|------|------|
| **lib/queues/bullmq.ts** | BullMQ setup (Redis). |
| **lib/workers/simulation-worker.ts** | Simulation worker. |
| **app/api/lab/simulations/enqueue/route.ts** | Enqueue simulation. |

---

## 2. Existing AI architecture summary

- **Orchestration:** All feature flows that use the “unified” path build an AIContextEnvelope (or use a tool adapter), then either call provider APIs themselves and pass modelOutputs into AIOrchestrator.runOrchestration, or use a feature-specific pipeline (e.g. trade: dual-brain + quality gate; Chimmy: parallel OpenAI/Grok/DeepSeek then buildConsensus). Deterministic-first: trade, waiver, rankings, story all pull deterministic or assembled context first; AI explains or synthesizes.
- **Model roles:** OpenAI = final explanation/voice; DeepSeek = analytical/numeric; Grok = narrative/trend/social. Enforced in ModelRoutingResolver and in route-level prompts.
- **Reliability:** AIFactGuard (unified-ai + ai-reliability), AIConfidenceResolver, ProviderFailureResolver, DeterministicFallbackService (trade), buildStableFallbackResponse. Chimmy returns 200 with safe message when all providers fail; trade returns deterministic verdict + reliability metadata.
- **Tool-to-chat:** TradeToAIContextBridge, WaiverToAIContextBridge, DraftToAIContextBridge, SimulatorToAIContextBridge produce URLs with prompt= for /af-legacy?tab=chat. af-legacy page reads searchParams.prompt and prefills chat input.

---

## 3. Current provider wiring status

| Provider | Client / entry | Env vars | Used by |
|----------|----------------|----------|---------|
| **OpenAI** | lib/openai-client.ts (getOpenAIClient, openaiChatText, openaiChatJson) + many routes with `new OpenAI(...)` | AI_INTEGRATIONS_OPENAI_API_KEY, OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL, OPENAI_BASE_URL, OPENAI_MODEL | Chimmy, trade-evaluator, legacy/trade/analyze, waiver-ai, dynasty-trade-analyzer (via dual-brain), story OneBrainNarrativeComposer, bracket, commentary, news, blog, rankings, mock-draft, ai-features, etc. |
| **DeepSeek** | lib/deepseek-client.ts | DEEPSEEK_API_KEY | Chimmy, league-story-creator, waiver-ai, trade flows that use unified path |
| **Grok/XAI** | lib/xai-client.ts, lib/ai-external/grok.ts | XAI_API_KEY, GROK_API_KEY, GROK_BASE_URL, GROK_MODEL, GROK_TIMEOUT_MS, GROK_ENRICH_* | Chimmy, waiver-ai/grok, social-clips, legacy share, improve-trade, trade grok-enrichment, waiver grok layer, story composer |

**Status:** Production-ready for Chimmy, dynasty-trade-analyzer, waiver-ai, story create/tell-story, social-clips. Partial: some legacy routes use OPENAI_API_KEY only. Placeholder: none; all AI routes call a real provider or return deterministic/safe fallback.

---

## 4. Current deterministic vs AI boundaries

| Area | Deterministic first | AI role |
|------|---------------------|--------|
| **Trade** | assembleTradeDecisionContext → buildDeterministicIntelligence, computeDeterministicVerdict, runQualityGate | runPeerReviewAnalysis (dual-brain); on null consensus → deterministic-only response |
| **Waiver** | Waiver scores, priority, availability | DeepSeek/Grok/OpenAI for narrative and suggestions; envelope carries deterministicPayload where built |
| **Rankings** | League rankings v2, dynasty-roadmap, weights | Explain endpoints (manager-psychology, rankings analyze); envelope + adapters |
| **Draft** | ADP, board, needs calculation | ai-pick, trade-propose, simulate; DraftAIAdapter builds envelope |
| **Story** | assembleNarrativeContext (drama, graph, rivalries) | OneBrainNarrativeComposer (DeepSeek significance + Grok frame + OpenAI final) |
| **Chimmy** | User context, enrichment, simulation warehouse (data) | OpenAI + Grok + DeepSeek; domain guard; no “deterministic payload” in envelope, but data sources in prompt |
| **Graph insight** | Relationship summary (graph) | POST graph-insight (AI narrative from context) |

---

## 5. Existing database/storage dependencies for AI

- **Prisma:** AiOutput, AIMemoryEvent, AIUserProfile, AILeagueContext, AITeamStateSnapshot, AIIssue, AIIssueFeedback, LegacyAIReport, SocialContentAsset, SocialPublishTarget, SocialPublishLog. League, Roster, LeagueTeam, LegacyLeague, etc. for context.
- **AI memory:** recordMemoryEvent (insert AIMemoryEvent); getAIMemorySummary used by Chimmy. Optional expiresAt for pruning.
- **AI logging:** logAiOutput (insert AiOutput) used in trade-evaluator, ai/chat, waiver-ai only; not in Chimmy, dynasty-trade-analyzer, story/create.
- **No dedicated blob storage** for AI (e.g. uploaded images are handled in memory/FormData in Chimmy).

---

## 6. Missing pieces preventing a fully unified AI interface

1. **Single OpenAI client usage:** Many routes create `new OpenAI()` instead of using lib/openai-client; no single place to switch base URL or model for all OpenAI calls.
2. **Consistent AI output logging:** logAiOutput not called from Chimmy, dynasty-trade-analyzer, story/create, mock-draft/ai-pick, or most legacy AI routes; cost/audit trail incomplete.
3. **Unified envelope usage on every AI path:** Some legacy and bracket routes do not build AIContextEnvelope or call AIOrchestrator; they call OpenAI (or Grok) directly. So “unified interface” is not used by every AI feature.
4. **Generate Story UI:** POST story/create has no dedicated “Generate Story” or “Weekly recap” button/surface in the app (only programmatic or future use).
5. **Chimmy meta in UI:** API returns confidencePct and providerStatus; ChimmyChat does not show them (optional).
6. **Prompt 124 deliverable:** No PROMPT124_* deliverable doc linked in AI_MASTER_PROMPT_PACK_IMPLEMENTATION_STATUS.md.
7. **Env consistency:** A few legacy routes (e.g. legacy/ai-coach) use OPENAI_API_KEY only; rest use AI_INTEGRATIONS_OPENAI_API_KEY || OPENAI_API_KEY.

---

## 7. Dead code, duplicate logic, unsafe patterns

- **Duplicate OpenAI instantiation:** 20+ routes or libs create `new OpenAI({ apiKey: ..., baseURL: ... })` with the same env pattern. Not dead but duplicated; centralizing would reduce drift and simplify key rotation.
- **Duplicate prompt/env logic:** Waiver prompts and temps live in waiver-ai route and in waiver-engine; story prompts in league-story-creator. Acceptable but could be single source for waiver “system” text.
- **Unsafe patterns:** No raw secrets in frontend; errors logged server-side without exposing keys. Grok safety (grok-safety.ts) validates/sanitizes JSON. Fact guard and confidence capping reduce overclaiming.
- **Dead code:** None identified; Prompt 128 audit found no dead AI buttons. All af-legacy tabs have corresponding content (overview, trade, finder, waiver, rankings, mock-draft, chat, share, transfer, strategy, shop, ideas, pulse, compare, player-finder).
- **Stale:** AIFeaturesPanel calls POST /api/ai-features (exists); tabIds for Draft and Waiver match af-legacy (mock-draft, waiver). No stale tab or dead link identified.

---

## 8. Mandatory UI click audit (summary)

Per docs/PROMPT128_END_TO_END_QA_AI_SURFACES_DELIVERABLE.md, 40 elements were audited; all have handlers, state, and API wiring. Highlights:

- **Trade:** DynastyTradeForm Analyze → dynasty-trade-analyzer; InstantTradeAnalyzer → instant/trade; Trade evaluator page → trade-evaluator; TradeFinderV2 Ask AI → Open Chat with prompt + Copy; Retry, Re-check, confidence expand.
- **Waiver:** WaiverAI, WaiverWirePage, waiver-ai page → waiver-ai or waiver-ai/grok; Run AI / Generate.
- **Draft:** DraftRoom Ask AI → onAiDmSuggestion (ai-pick); Run Draft AI (tab) → recommend-ai / draft-war-room.
- **Chimmy:** Send, chips, voice toggle, stop voice; URL ?prompt= prefill; entry points from nav, tools hub, quick actions.
- **Story:** Hall of Fame and drama “Tell story” → hall-of-fame/tell-story, drama/tell-story; legacy/record-book/awards explain buttons → explain APIs.
- **Social clips:** Generate, approve, publish, retry, regenerate, copy caption, auto-post toggle.
- **Confidence/fallback:** AIFailureStateRenderer (retry, expand details); ConfidenceBadge, TrustExplanationSheet where used.

**Mobile/desktop:** Audited flows use responsive layout and same handlers; no mobile-only dead taps reported.

---

## 9. Risks

- **Provider dependency:** Three providers; if one is down, Chimmy and multi-model flows degrade (fallback exists for trade and Chimmy full failure).
- **Cost and abuse:** No global rate or cost cap across AI routes; heavy use could spike cost.
- **Inconsistent logging:** Most AI calls do not write to AiOutput; harder to audit cost and quality.
- **Duplicate client usage:** Many `new OpenAI()` call sites; key or base URL change requires many edits.
- **Large client state (af-legacy):** Big page and state surface; regression risk on tab or chat behavior.
- **Redis/BullMQ:** Simulation and workers depend on Redis; no fallback if Redis is unavailable.

---

## 10. Recommended implementation order

1. **Documentation and consistency (no code):** Add PROMPT124 deliverable doc and link in implementation status; document env var preference (AI_INTEGRATIONS_* vs OPENAI_*) for new code.
2. **Centralize OpenAI usage:** Prefer lib/openai-client for all new and refactored routes; gradually replace per-route `new OpenAI()` where touching code.
3. **Extend AI logging:** Call logAiOutput (or equivalent) from Chimmy, dynasty-trade-analyzer, story/create, and other high-value AI routes so AiOutput reflects usage.
4. **Generate Story UI:** Add a “Generate Story” or “Weekly recap” surface that calls POST story/create and displays sections/variants.
5. **Optional Chimmy meta:** Show confidencePct and/or provider status in ChimmyChat when meta is present.
6. **Rate/cost policy:** Define and document rate limits or cost caps for AI endpoints; implement where missing.
7. **E2E tests:** Add Playwright (or similar) for critical AI flows (trade analyze, Chimmy send, waiver generate) to protect against regressions.

---

*End of AI Systems Audit — Repository Map. No code was implemented.*
