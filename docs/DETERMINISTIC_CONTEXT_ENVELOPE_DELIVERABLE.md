# Deterministic Context Envelope and Evidence Presentation — Deliverable

Every serious AI output is grounded in structured facts before model synthesis. The deterministic layer computes facts; AI cannot invent missing metrics and must receive explicit uncertainty when data is incomplete.

---

## 1. Implemented components

### 1.1 Shared schema (`lib/ai-context-envelope/schema.ts`)

- **EvidenceItem** / **EvidenceBlock**: source, label, value, unit, optional confidenceContribution.
- **Confidence**: scorePct (0–100), label (low/medium/high), reason, cappedByData, capReason.
- **UncertaintyItem** / **UncertaintyBlock**: what, impact (high/medium/low), reason.
- **MissingDataItem** / **MissingDataBlock**: what, impact, suggestedAction.
- **DeterministicContextEnvelope**: toolId, sport, leagueId, userId, evidence, confidence, uncertainty, missingData, deterministicPayload, hardConstraints, envelopeId, dataQualitySummary.
- **NormalizedToolOutput**: primaryAnswer, verdict, evidence, keyEvidence, confidence, uncertainty, missingData, caveats, suggestedNextAction, alternatePath, trace (optional).

Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER (via `lib/sport-scope`).

### 1.2 Provider contracts (`lib/ai-context-envelope/contracts.ts`)

- **ProviderInputContract**: envelope + userMessage + intent + systemPromptSuffix.
- **getMandatorySystemPromptSuffix(envelope)**: Builds mandatory rules so no provider can bypass deterministic context (use only provided facts; do not invent; acknowledge uncertainty/missing data).
- **normalizeToContract(raw, envelope, options)**: Normalizes any provider output to NormalizedToolOutput; evidence from envelope when available; caveats when confidence capped or missing data present; optional trace.
- **buildEnvelopeFromTool(...)**: Build a DeterministicContextEnvelope from tool-specific opts.

### 1.3 Adapters

- **trade-context-to-envelope**: Builds envelope from `TradeDecisionContextV1`: evidence (value delta, totals, coverage, ADP, deterministic confidence), confidence (capped when coverage &lt; 70 or missing valuations/ADP), uncertainty (missing valuations, ADP, injury, trade history), missingData (valuations, ADP, analytics). Used by dynasty-trade-analyzer.
- **waiver-to-envelope**: Builds envelope from waiver context: candidateCount, hasQuantResult, hasTrendResult, missingQuantCandidates, strategyMode. Used by waiver-ai.

### 1.4 Frontend evidence components (`components/ai-evidence/`)

- **EvidenceBlock**: Renders list of EvidenceItem; collapsible; always renders when items available; min tap target 44px; no unwired clickables.
- **UncertaintyBlock**: Renders when confidence is limited; items with what/reason/impact; collapsible.
- **MissingDataBlock**: Renders missing data; never silently ignored; collapsible.
- **CaveatsBlock**: Renders caveats when confidence capped or risks apply; collapsible.
- **AIEvidencePresentation**: Takes NormalizedToolOutput; renders confidence + EvidenceBlock + UncertaintyBlock + MissingDataBlock + CaveatsBlock in order; all interactive elements wired (expand/collapse).

All components are readable on mobile and desktop.

### 1.5 UnifiedBrainResultView

- Accepts optional **normalizedOutput** (NormalizedToolOutput). When present and has evidence/uncertainty/missingData/caveats, uses **AIEvidencePresentation** for the evidence layer and shows verdict/action from normalized output. Otherwise keeps legacy DeterministicEvidenceCard + Sources + Caveats. All buttons (expand/collapse, info) are wired.

### 1.6 API wiring

- **dynasty-trade-analyzer**:
  - Builds envelope via **tradeContextToEnvelope** before AI call.
  - Prepends **getMandatorySystemPromptSuffix(envelope)** to fact-layer prompt so AI cannot bypass deterministic context.
  - Returns **normalizedOutput** on both success and deterministic-fallback paths.
  - **Trace** included when `?debug=1`, `?trace=1`, or headers `x-af-debug: 1` / `x-af-trace: 1`.

- **waiver-ai**:
  - Builds envelope via **buildWaiverEnvelope** (candidateCount, quant/trend, missingQuantCandidates, strategyMode).
  - Appends **getMandatorySystemPromptSuffix(envelope)** to system prompt.
  - Returns **normalizedOutput** with evidence/confidence/uncertainty/caveats when applicable.

---

## 2. File list

| Path | Status |
|------|--------|
| `lib/ai-context-envelope/schema.ts` | [NEW] |
| `lib/ai-context-envelope/contracts.ts` | [NEW] |
| `lib/ai-context-envelope/index.ts` | [NEW] |
| `lib/ai-context-envelope/adapters/trade-context-to-envelope.ts` | [NEW] |
| `lib/ai-context-envelope/adapters/waiver-to-envelope.ts` | [NEW] |
| `components/ai-evidence/EvidenceBlock.tsx` | [NEW] |
| `components/ai-evidence/UncertaintyBlock.tsx` | [NEW] |
| `components/ai-evidence/MissingDataBlock.tsx` | [NEW] |
| `components/ai-evidence/CaveatsBlock.tsx` | [NEW] |
| `components/ai-evidence/AIEvidencePresentation.tsx` | [NEW] |
| `components/ai-evidence/index.ts` | [NEW] |
| `components/ai-interface/UnifiedBrainResultView.tsx` | [UPDATED] |
| `app/api/dynasty-trade-analyzer/route.ts` | [UPDATED] |
| `app/api/waiver-ai/route.ts` | [UPDATED] |

No schema/migration DB changes (envelope is in-memory/API payload).

---

## 3. QA checklist

- [ ] **Evidence block always renders if available**: When a tool returns `normalizedOutput.evidence` with length &gt; 0, EvidenceBlock is shown (via AIEvidencePresentation or UnifiedBrainResultView with normalizedOutput).
- [ ] **Uncertainty block renders when confidence is limited**: When envelope has uncertainty items or confidence.cappedByData, UncertaintyBlock is shown; high-impact uncertainties expand by default where implemented.
- [ ] **Missing data is not silently ignored**: MissingDataBlock is rendered when normalizedOutput.missingData has items; caveats include a line when missing data exists.
- [ ] **No UI element is left clickable without wiring**: All buttons (expand/collapse, info) have onClick/aria; no orphan buttons.
- [ ] **No provider can bypass deterministic context for tools that require it**: Trade and waiver routes prepend/append getMandatorySystemPromptSuffix(envelope) to the prompt; envelope is built before the AI call.
- [ ] **Trade analyzer**: Call dynasty-trade-analyzer; response includes normalizedOutput with evidence, confidence, uncertainty, missingData when applicable; with ?trace=1 or x-af-trace: 1, response includes trace (envelopeId, toolId, dataQualitySummary, providerUsed).
- [ ] **Waiver AI**: Call waiver-ai; response includes normalizedOutput; system prompt includes mandatory suffix; when candidates lack quant data, uncertainty/missingData and capped confidence appear.
- [ ] **Mobile and desktop**: Evidence, uncertainty, missing data, and caveats sections are readable and tappable/clickable on both.

---

## 4. Extending to other tools

- **Draft helper**: Implement `draftContextToEnvelope` (board, scarcity, roster-fit); build envelope before AI; add getMandatorySystemPromptSuffix; normalize response to NormalizedToolOutput; return normalizedOutput.
- **Matchup AI**: Build envelope from simulation/projection output; add uncertainty for incomplete matchup data; same pattern.
- **Rankings AI**: Build envelope from rankings engine output (ordering, tiers); add missingData for teams/players without data.
- **Story / narrative AI**: Where factual grounding exists (e.g. legacy score, reputation evidence), build envelope with evidence/confidence; pass mandatory suffix; normalize output.

Use **buildEnvelopeFromTool** or tool-specific adapters (like trade/waiver) and **normalizeToContract** for a consistent response shape and UI.
