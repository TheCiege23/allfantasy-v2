# PROMPT 123 — Unified AI Orchestration Engine Deliverable

## Architecture

- **AIProviderInterface** — `IProviderClient` in `lib/ai-orchestration/provider-interface.ts`. Implemented by OpenAI, DeepSeek, Grok adapters.
- **Provider adapters** — `createOpenAIProvider`, `createDeepSeekProvider`, `createGrokProvider` (also exported as `createOpenAIAdapter`, etc.) in `lib/ai-orchestration/providers/*`.
- **AIProviderRegistry** — `getProvider`, `getAvailableProviders`, `getAvailableFromRequested`, `checkProviderAvailability` in `lib/ai-orchestration/provider-registry.ts`.
- **AIToolRegistry** — `getToolEntry`, `getDefaultModeForTool`, `isModeAllowed`, `resolveEffectiveMode`, `getAllToolTypes` in `lib/ai-orchestration/tool-registry.ts`.
- **AIOrchestratorService** — `runUnifiedOrchestration` in `lib/ai-orchestration/orchestration-service.ts`.
- **AIConsensusEngine** — `evaluateConsensus`, `mergeStructuredConsensus` in `lib/unified-ai/ConsensusEvaluator.ts`.
- **AIUnifiedBrainEngine** — `composeUnifiedBrain` in `lib/unified-ai/UnifiedBrainComposer.ts`.
- **AIQualityGate** — `runQualityGate`, `applyQualityGateToAnswer` in `lib/ai-orchestration/quality-gate.ts`.
- **AIConfidenceCalculator** — `resolveConfidence`, `formatConfidenceLine` in `lib/unified-ai/AIConfidenceResolver.ts`.
- **DeterministicContextEnvelope** — `DeterministicContextEnvelope` in `lib/ai-context-envelope/schema.ts`; `AIContextEnvelope` in `lib/unified-ai/types.ts`.
- **ResponseNormalizer** — `normalizeToUnifiedResponse` in `lib/ai-orchestration/response-normalizer.ts`.
- **ErrorHandler** — `toUnifiedAIError`, `toHttpStatus`, `fromThrown`, `toAIErrorCode` in `lib/ai-orchestration/error-handler.ts`.
- **ProviderHealthCheck** — `getProviderAvailability`, `runProviderHealthCheck` in `lib/ai-orchestration-engine/provider-health-check.ts`.
- **FallbackPolicy** — `resolvePrimaryProvider`, `getFallbackOrderForRole`, `shouldUseDeterministicOnly` in `lib/ai-orchestration-engine/fallback-policy.ts`.
- **Deterministic rules** — `DETERMINISTIC_RULES`, `getDeterministicRulesPromptBlock` in `lib/ai-orchestration-engine/deterministic-rules.ts`.

## Required output structure

Every normalized response includes (when available):

- **evidence** — string[] (from keyEvidence or structured.evidence)
- **valueVerdict** — string (e.g. fairness, edge)
- **viabilityVerdict** — string (e.g. acceptance likelihood, fit)
- **actionPlan** — string (from suggestedNextAction or structured.actionPlan)
- **confidenceScore** — number 0–100
- **uncertaintyExplanation** — string (from factGuardWarnings or risksCaveats)

## Environment variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI API key (server-side only) | `sk-...` |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Alternative OpenAI key | `sk-...` |
| `DEEPSEEK_API_KEY` | DeepSeek API key (server-side only) | `...` |
| `XAI_API_KEY` | XAI/Grok API key (server-side only) | `...` |
| `GROK_API_KEY` | Alternative Grok key | `...` |
| `AI_ORCHESTRATION_TIMEOUT_MS` | Per-provider timeout (ms) | `25000` |
| `AI_ORCHESTRATION_RETRY_COUNT` | Retries per provider call | `1` |

All provider keys are server-side only. No provider keys exposed to frontend.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/orchestrate` | Run unified orchestration (envelope + optional mode). Returns UnifiedAIResponse with modelOutputs for compare. Requires auth. |
| GET | `/api/ai/providers/status` | Provider availability (openai, deepseek, grok). No secrets. Requires auth. |

## Example request (POST /api/ai/orchestrate)

```json
{
  "envelope": {
    "featureType": "trade_analyzer",
    "sport": "NFL",
    "leagueId": "league-123",
    "userId": "user-456",
    "deterministicPayload": {
      "fairnessScore": 72,
      "valueDelta": 5,
      "sideATotalValue": 1000,
      "sideBTotalValue": 950
    },
    "hardConstraints": [
      "Do not override fairnessScore or value totals."
    ],
    "userMessage": "Should I accept this trade?"
  },
  "mode": "unified_brain",
  "options": {
    "timeoutMs": 25000,
    "maxRetries": 1,
    "traceId": "trace-optional"
  }
}
```

## Example response (200)

```json
{
  "ok": true,
  "traceId": "trace-abc",
  "response": {
    "primaryAnswer": "Based on the data, the trade is slightly in your favor (72 fairness, 5% value edge). Acceptance likelihood is moderate given roster fit.",
    "confidencePct": 65,
    "confidenceLabel": "medium",
    "verdict": "Slight edge to your side",
    "keyEvidence": ["Fairness 72", "Value delta 5%", "Side A total 1000"],
    "evidence": ["Fairness 72", "Value delta 5%", "Side A total 1000"],
    "valueVerdict": "Slight edge to your side; 5% value gap.",
    "viabilityVerdict": "Moderate acceptance likelihood.",
    "actionPlan": "Send as-is if you need the depth; otherwise ask for a small add.",
    "confidenceScore": 65,
    "uncertaintyExplanation": "Based on provided data only; injury and market moves can change the picture.",
    "risksCaveats": ["Based on provided data only; injury and market moves can change the picture."],
    "suggestedNextAction": "Send as-is if you need the depth.",
    "modelOutputs": [
      { "model": "openai", "raw": "...", "error": null, "skipped": false },
      { "model": "deepseek", "raw": "...", "error": null, "skipped": false },
      { "model": "grok", "raw": "...", "error": null, "skipped": false }
    ],
    "reliability": {
      "usedDeterministicFallback": false,
      "providerStatus": [
        { "provider": "openai", "status": "ok", "latencyMs": 1200 },
        { "provider": "deepseek", "status": "ok", "latencyMs": 800 },
        { "provider": "grok", "status": "ok", "latencyMs": 900 }
      ]
    },
    "factGuardWarnings": [],
    "cached": false,
    "mode": "unified_brain"
  }
}
```

## Example error (4xx/5xx)

```json
{
  "ok": false,
  "error": {
    "code": "provider_unavailable",
    "message": "No AI providers are configured or available.",
    "userMessage": "AI is temporarily unavailable. Please try again in a moment.",
    "traceId": "trace-xyz"
  },
  "traceId": "trace-xyz"
}
```

## Mandatory click audit support

| Capability | How the system supports it |
|------------|-----------------------------|
| **Provider selector** | GET `/api/ai/providers/status` returns which providers are available; response.reliability.providerStatus per run. |
| **Mode selector** | Request body accepts `mode`: `single_model`, `specialist`, `consensus`, `unified_brain`. Tool registry defines allowed modes per featureType. |
| **Retry analysis** | Client re-posts same request to POST `/api/ai/orchestrate`. No server-side retry state. |
| **Compare providers** | Response includes `modelOutputs[]` with each provider’s `raw` (and optional `structured`) for compare UI. |
| **Open in Chimmy** | Client builds link via `getChimmyChatHrefWithPrompt(primaryAnswer)` or similar; no backend change. |
| **Save analysis** | Client can POST to a save endpoint with `response` payload, or store client-side; orchestration returns full response for persistence. |

## Supported sports

NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER). Envelope.sport is normalized via `lib/sport-scope`.

## File list

| Path | Status |
|------|--------|
| `lib/ai-orchestration-engine/fallback-policy.ts` | [NEW] |
| `lib/ai-orchestration-engine/provider-health-check.ts` | [NEW] |
| `lib/ai-orchestration-engine/deterministic-rules.ts` | [NEW] |
| `lib/ai-orchestration-engine/index.ts` | [NEW] |
| `lib/ai-orchestration/types.ts` | [UPDATED] — RequiredOutputStructure, evidence, valueVerdict, viabilityVerdict, actionPlan, confidenceScore, uncertaintyExplanation on UnifiedAIResponse |
| `lib/ai-orchestration/response-normalizer.ts` | [UPDATED] — Populates required output fields |
| `app/api/ai/orchestrate/route.ts` | [NEW] |

Existing modules (unchanged or already present): provider-interface, provider-registry, providers/openai-provider, providers/deepseek-provider, providers/grok-provider, tool-registry, request-validator, orchestration-service, quality-gate, error-handler, unified-ai (AIOrchestrator, ConsensusEvaluator, UnifiedBrainComposer, AIConfidenceResolver, AIFactGuard), ai-context-envelope (schema).
