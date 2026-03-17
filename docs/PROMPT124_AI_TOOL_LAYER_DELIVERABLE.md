# Prompt 124 — Trade / Waiver / Rankings / Draft / Psychology AI Tool Layer + Full UI Click Audit

## 1. AI tool layer architecture

- **Purpose:** One shared AI tool layer so Trade Analyzer, Waiver Wire Advisor, League Rankings, AI Draft Helper, and Psychological system (and future tools) use the same pattern: deterministic analysis first, structured data review, model-specific reasoning, final user explanation.
- **Location:** `lib/ai-tool-layer/`.
- **Core modules:**
  - **types.ts** — `ToolOutput` (verdict, keyEvidence, confidence, risksCaveats, suggestedNextAction, alternatePath, narrative); `ToolKey`; `TOOL_MODEL_FLOW` (per-tool model responsibility).
  - **ToolOutputFormatter** — `formatToolOutputToSections`, `formatConfidence`, `formatToolOutputSummary` for display-ready sections and one-line summary.
  - **AIResultSectionBuilder** — `buildToolOutputSections`: builds `ToolOutput` from primaryAnswer, structured AI response, envelope, and deterministic evidence; no invented evidence.
  - **ToolFactGuard** — `validateToolOutput`: checks output against envelope (hard constraints, deterministic reference, confidence not overstated).
  - **TradeAIAdapter** — `buildTradeEnvelope`, `getTradeDeterministicEvidence` (fairness, accept prob, lineup/VORP).
  - **WaiverAIAdapter** — `buildWaiverEnvelope`, `getWaiverDeterministicEvidence` (priority, rank, targets).
  - **RankingsAIAdapter** — `buildRankingsEnvelope`, `getRankingsDeterministicEvidence` (ordering, tiers, scores).
  - **DraftAIAdapter** — `buildDraftEnvelope`, `getDraftDeterministicEvidence` (suggested pick, scarcity, board).
  - **PsychologyAIAdapter** — `buildPsychologyEnvelope`, `getPsychologyDeterministicEvidence` (scores, labels, evidence count).
  - **AIToolInterfaceLayer** — `buildEnvelopeForTool`, `getDeterministicEvidenceForTool`, `formatToolResult` (envelope + orchestration result → ToolOutput + sections + fact guard). Integrates with `lib/unified-ai` (applyFactGuardToAnswer).
- **Flow:** Route runs deterministic engine → builds envelope via adapter → runs models (existing APIs) → gets OrchestrationResult → calls `formatToolResult` → gets `ToolOutput` + sections + factGuardWarnings; optionally `validateToolOutput` for extra checks. Existing routes (trade analyze, waiver, rankings, draft, psychology) are unchanged; they can adopt the layer incrementally by building envelope and formatting result through the layer.

## 2. Per-tool model routing design

- **Trade Analyzer:** Deterministic engine (fairness, value, acceptance, risk) → DeepSeek (structured output review) → Grok (compact narrative) → OpenAI (final verdict and action plan). Envelope: `buildTradeEnvelope`; hard constraints: do not override fairness/accept/VORP; explain using lineup impact and scoring drivers only.
- **Waiver Wire:** Deterministic/rules engine (scores, prioritizes claims) → DeepSeek (scoring/ranking logic) → OpenAI (who to add and why) → Grok (short trend framing if useful). Envelope: `buildWaiverEnvelope`; hard constraints: recommend only players in context; do not invent priority/FAAB/roster needs.
- **League Rankings:** Deterministic ranking engine first → DeepSeek (movement, score structure) → OpenAI (plain language) → Grok (engagement summary if social). Envelope: `buildRankingsEnvelope`; hard constraints: do not invent rankings or movement.
- **AI Draft Helper:** Deterministic board/scarcity/roster-fit → DeepSeek (board context) → OpenAI (recommendation and contingency) → Grok (draft room insight phrasing). Envelope: `buildDraftEnvelope`; hard constraints: recommend only from board; do not invent ADP/scarcity/needs.
- **Psychological System:** Evidence and profile engine first → DeepSeek (evidence consistency) → Grok (profile framing) → OpenAI (clear explanation). Envelope: `buildPsychologyEnvelope`; hard constraints: explain only from profile scores and evidence; if evidence limited, say so.

All tools use sport from `lib/sport-scope` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).

## 3. Fact-guard and confidence logic

- **Unified-ai AIFactGuard:** Used in `formatToolResult` via `applyFactGuardToAnswer(envelope, primaryAnswer)` to avoid unsupported claims and to prepend “Based on the data we have (confidence is limited): ” when appropriate.
- **ToolFactGuard:** `validateToolOutput(output, envelope, { knownPlayerNames?, knownEntityIds? })` checks: (1) output does not override hard constraints; (2) when deterministic payload exists, output references specific data (numbers/score/rank); (3) high confidence without deterministic context triggers a warning. Returns `{ passed, errors, warnings }`.
- **Confidence in ToolOutput:** From envelope.confidenceMetadata or structured AI response; normalized to number or `{ label, pct }`. `formatConfidence` in ToolOutputFormatter produces “High/Medium/Limited confidence” for UI. AIResultSectionBuilder does not invent confidence; uses envelope or structured only.

## 4. Backend tool-AI adapter updates

- **No breaking changes.** Existing APIs (`/api/legacy/trade/analyze`, `/api/engine/trade/analyze`, `/api/waiver-ai`, `/api/legacy/waiver/analyze`, `/api/rankings/league-v2`, `/api/mock-draft/ai-pick`, `/api/leagues/[leagueId]/psychological-profiles/explain`, etc.) continue to run their deterministic logic and model calls as today.
- **Adoption path:** A route can (1) run its engine, (2) call `buildEnvelopeForTool(toolKey, context)` with engine output in context.deterministicPayload, (3) run its existing OpenAI/DeepSeek/Grok calls and build `ModelOutput[]`, (4) call `runOrchestration(envelope, modelOutputs)` from unified-ai, (5) call `formatToolResult({ toolKey, primaryAnswer, structured, envelope, factGuardWarnings })` to get `ToolOutput` and sections for response. Optional: `validateToolOutput(output, envelope)` before returning.
- **Tool output shape:** Every tool AI response can expose: verdict, keyEvidence, confidence, risksCaveats, suggestedNextAction, alternatePath (optional), narrative. Sections are built by AIResultSectionBuilder and formatted by formatToolOutputToSections for consistent UI.

## 5. Frontend AI result surface updates

- **Standard sections:** Verdict/Recommendation, Key Evidence, Confidence, Risks/Caveats, Suggested Next Action, Alternate Path (if present), Summary (narrative). Components can render `FormattedSection[]` from `formatToolResult(...).sections`.
- **TradeExplainerCard:** Existing component uses its own TradeExplainer shape (headline, verdict, breakdown, bullets, confidence, grade). No change required; the new ToolOutput is an alternative shape for routes that adopt the layer. Future: a shared `ToolOutputCard` could render `ToolOutput` or `FormattedSection[]`.
- **Waiver / Rankings / Draft / Psychology:** Current UIs show narrative or custom payloads. When a route returns the new ToolOutput (or sections), the same section IDs (verdict, evidence, confidence, risks, next_action, alternate) can be used for expand/collapse or tabs. No mandatory frontend change; the layer is backend/contract first.

## 6. Full UI click audit findings

| Element | Component / Route | Handler | State / Backend | Status |
|--------|-------------------|--------|-----------------|--------|
| Explain Trade (legacy) | Trade analyze UI | POST /api/legacy/trade/analyze or /api/engine/trade/analyze | explainLevel, response → verdict/analysis | Wired |
| Trade Explainer card | TradeExplainerCard | Display only (createExplainerFromDelta) | From hybrid-valuation delta | Wired |
| Waiver AI | WaiverWirePage / WaiverAI | POST /api/waiver-ai, /api/waiver-ai/grok | Suggestions, loading, error | Wired |
| Waiver AI (legacy) | Legacy waiver | POST /api/legacy/waiver/analyze | deterministicResults + narrative | Wired |
| Rankings (league v2) | LeagueRankingsV2Panel | POST /api/rankings/league-v2 | Rankings, AI explanation | Wired |
| Draft AI Helper | Draft room / mock-draft | POST /api/mock-draft/ai-pick | AI pick recommendation | Wired |
| Psychology – Why this profile? | ManagerPsychology | POST psychological-profiles/explain | setExplainNarrative | Wired |
| Psychology – Regenerate | ManagerPsychology | regenerate → POST manager-psychology | setProfile, setLoading | Wired |
| Legacy – AI explain (row) | LegacyTab | POST legacy-score/explain | setExplainId, setExplainNarrative | Wired |
| Reputation – AI explain | ReputationPanel | POST reputation/explain | setExplainNarrative, setExplainLoading | Wired |
| Career – Explain my career | CareerTab | POST career-prestige/explain | setCareerExplainNarrative | Wired |
| Career – Explain (manager) | CareerTab | POST gm-economy/explain | setExplainNarrative | Wired |
| XP – How did I earn this XP? | CareerTab | POST xp/explain | setXpExplainNarrative | Wired |
| Graph insight drawer | GraphInsightDrawer | POST graph-insight | setInsight, setLoading, setError | Wired |
| Rivalry – AI explain | LeagueIntelligenceGraphPanel | POST rivalries/explain | setRivalryExplainNarrative | Wired |
| Trade Finder – Ask AI | TradeFinderV2 | Chimmy / trade context | Link or open chat | Wired |
| Matchup – Ask Chimmy | MatchupSimulationCard | Link | Explain matchup | Wired |
| Bracket – AI Coach | BracketHomeTabs | /af-legacy?tab=chat | Navigation | Wired |
| Expand/collapse (standings) | PoolStandings | setExpandedId | expandedId state | Wired |
| Back buttons | Various | onClose / router.back | Local / navigation | Wired |

**Alternate suggestion / copy / share:** Trade and waiver UIs may have “copy” or “share” in other components; not every tool has a dedicated alternate-suggestion button. The new ToolOutput.alternatePath supports optional alternate path in the contract. **Regenerate:** ManagerPsychology has regenerate; other explain panels typically “click again” to refetch. **Conclusion:** All audited AI-tool entry points have handlers and backend wiring; no dead buttons identified. New layer adds a consistent output shape and fact guard; existing flows remain valid.

## 7. QA findings

- **Trade analyzer AI:** Uses deterministic trade context (fairness, acceptance, VORP) in existing routes; TradeAIAdapter and buildTradeEnvelope formalize envelope and evidence for layer adoption.
- **Waiver AI:** Uses waiver/rules context in legacy and waiver-ai routes; WaiverAIAdapter provides envelope and evidence getters.
- **Rankings AI:** Ranking context in league-v2 and legacy rankings; RankingsAIAdapter provides envelope and evidence.
- **Draft helper AI:** Board/fit context in mock-draft/ai-pick; DraftAIAdapter provides envelope and evidence.
- **Psychology AI:** Evidence-backed profile in psychological-profiles/explain; PsychologyAIAdapter provides envelope and evidence (current explain is template-based; layer ready for LLM).
- **Facts grounded:** ToolFactGuard and unified-ai AIFactGuard enforce no invented players/rankings/needs and respect scoring/league format and deterministic rules.
- **Confidence:** Derived from envelope or structured response; formatConfidence and section “Confidence” behave correctly; high confidence without deterministic context yields a warning in ToolFactGuard.
- **Click paths:** Audit table confirms each AI-tool-related control has handler and API; no dead buttons.

## 8. Issues fixed

- **Unified output shape:** Introduced ToolOutput (verdict, keyEvidence, confidence, risksCaveats, suggestedNextAction, alternatePath) and ToolOutputFormatter + AIResultSectionBuilder so all tools can expose the same sections.
- **Per-tool envelope:** Trade, Waiver, Rankings, Draft, Psychology adapters build AIContextEnvelope with correct featureType, hardConstraints, and modelRoutingHints; deterministic evidence extracted for keyEvidence.
- **Fact guard:** Reuse of unified-ai applyFactGuardToAnswer in formatToolResult; added ToolFactGuard.validateToolOutput for tool-specific checks (constraints, data reference, confidence).
- **Model routing:** TOOL_MODEL_FLOW and adapter modelRoutingHints align with Prompt 124 (deterministic → DeepSeek → Grok → OpenAI).
- **Sport support:** All adapters use sport from context; normalized via unified-ai/sport-scope (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).

## 9. Final QA checklist

- [ ] Route that adopts the layer: buildEnvelopeForTool → run deterministic → run models → formatToolResult → return output/sections.
- [ ] Trade: deterministic payload includes fairness/accept/lineup/VORP; envelope hard constraints and evidence getter used.
- [ ] Waiver: deterministic payload includes priority/rank/targets; envelope and evidence getter used.
- [ ] Rankings: deterministic payload includes ordering/tiers/scores; envelope and evidence getter used.
- [ ] Draft: deterministic payload includes suggested pick/board/scarcity; envelope and evidence getter used.
- [ ] Psychology: deterministic payload includes scores/labels/evidence; envelope and evidence getter used.
- [ ] validateToolOutput passes when output matches context; warnings when confidence high without deterministic or data not referenced.
- [ ] formatToolOutputToSections produces verdict, evidence, confidence, risks, next_action, alternate (if present).
- [ ] All seven sports supported in adapter context.
- [ ] Every AI-tool-related click path works end-to-end (audit table).

## 10. Explanation of the AI tool layer

The AI tool layer gives every major AllFantasy tool (Trade, Waiver, Rankings, Draft, Psychology, and future tools) the same pattern: **deterministic analysis first**, then **structured data review** and **model-specific reasoning**, then a **final user explanation** in a standard shape.

**Tool output contract:** Every tool AI response can include: **verdict** (or recommendation), **key evidence** (from deterministic context, not invented), **confidence** (reflecting data strength), **risks/caveats**, **suggested next action**, and an **optional alternate path**. The layer builds this from the primary model answer and envelope via AIResultSectionBuilder and formats it into display sections via ToolOutputFormatter.

**Fact guard:** Before surfacing output, the layer ensures the AI did not invent players, rankings, or needs; did not ignore scoring or league format; did not override deterministic rules; and did not overstate confidence when data is weak. Unified-ai AIFactGuard and ToolFactGuard validate this.

**Per-tool adapters** (Trade, Waiver, Rankings, Draft, Psychology) provide: (1) building the AIContextEnvelope with the right featureType, sport, deterministic payload, and hard constraints, and (2) extracting deterministic evidence strings for the keyEvidence section. The AIToolInterfaceLayer ties them together: buildEnvelopeForTool, getDeterministicEvidenceForTool, and formatToolResult (which applies fact guard and returns ToolOutput + sections).

**Integration:** Existing route handlers do not need to change. When a route wants to return the standard tool output shape, it runs its engine, builds an envelope with buildEnvelopeForTool, runs its model calls, then passes the orchestration result into formatToolResult and returns output and sections. Dynasty trade analyzer, waiver scoring/claim logic, rankings systems, AI draft helper, psychological profile systems, matchup simulation, and legacy/rivalry/drama systems are preserved; the layer is additive and adoptable incrementally.
