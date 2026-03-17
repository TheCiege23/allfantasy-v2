# AI Orchestration Backend — Wiring & Examples

## Overview

The unified AI orchestration layer lives in `lib/ai-orchestration/`. It provides:

- **Provider abstraction** — OpenAI, DeepSeek, Grok behind a single interface; keys server-side only.
- **Tool registry** — trade_analyzer, waiver_ai, draft_helper, matchup, rankings, story_creator, content, chimmy_chat.
- **Request validation** — envelope (featureType, sport), sport normalized to SUPPORTED_SPORTS.
- **Orchestration service** — validate → resolve mode → call available providers (timeout/retry) → runOrchestration → normalize.
- **Quality gate** — fact guard / hallucination guard; no invented facts, no override of deterministic rules.
- **Shared error handling** — AIErrorCode, userMessage, HTTP status.
- **Logging / tracing** — traceId, logAiOutput for audit.

## Environment Variables

Existing (no new required):

- `AI_INTEGRATIONS_OPENAI_API_KEY` or `OPENAI_API_KEY` — OpenAI
- `OPENAI_BASE_URL`, `OPENAI_MODEL` — optional
- `DEEPSEEK_API_KEY` — DeepSeek
- `XAI_API_KEY` or `GROK_API_KEY` — Grok
- `GROK_BASE_URL`, `GROK_MODEL`, `GROK_TIMEOUT_MS` — optional for Grok

Optional for orchestration:

- `AI_ORCHESTRATION_TIMEOUT_MS` — per-provider timeout (default 25000)
- `AI_ORCHESTRATION_RETRY_COUNT` — retries per provider (default 1)

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/run` | Run unified orchestration. Body: `UnifiedAIRequest`. Returns `UnifiedAIResponse` or `UnifiedAIError`. Auth required. |
| GET | `/api/ai/providers/status` | Provider availability `{ openai, deepseek, grok }` (booleans). No secrets. Auth required. |

## Request Example (POST /api/ai/run)

```json
{
  "envelope": {
    "featureType": "trade_analyzer",
    "sport": "NFL",
    "leagueId": "league-123",
    "userId": "user-456",
    "deterministicPayload": {
      "fairnessScore": 72,
      "acceptProbability": 0.65,
      "valueDelta": 5.2
    },
    "userMessage": "Should I accept this trade?",
    "promptIntent": "explain"
  },
  "mode": "unified_brain",
  "options": {
    "timeoutMs": 20000,
    "traceId": "ai_abc123"
  }
}
```

## Response Example (200)

```json
{
  "primaryAnswer": "Based on the data, the trade is slightly in your favor...",
  "confidencePct": 68,
  "confidenceLabel": "medium",
  "verdict": "Accept with caution",
  "keyEvidence": ["Fairness score 72", "Accept probability 65%"],
  "risksCaveats": ["Injury data may be stale"],
  "suggestedNextAction": "Propose the trade and monitor response.",
  "modelOutputs": [
    { "model": "deepseek", "raw": "...", "structured": null },
    { "model": "grok", "raw": "...", "structured": null },
    { "model": "openai", "raw": "...", "structured": null }
  ],
  "reliability": {
    "usedDeterministicFallback": false,
    "providerStatus": [
      { "provider": "deepseek", "status": "ok", "latencyMs": 1200 },
      { "provider": "grok", "status": "ok", "latencyMs": 1100 },
      { "provider": "openai", "status": "ok", "latencyMs": 1400 }
    ]
  },
  "factGuardWarnings": [],
  "traceId": "ai_abc123",
  "cached": false,
  "mode": "unified_brain"
}
```

## Error Example (503)

```json
{
  "code": "provider_unavailable",
  "message": "No AI providers are configured or available.",
  "userMessage": "AI is temporarily unavailable. Please try again in a moment.",
  "traceId": "ai_xyz789"
}
```

## Wiring Notes

- **Existing routes** (e.g. `/api/dynasty-trade-analyzer`, `/api/waiver-ai`, `/api/chat/chimmy`) are unchanged. They can later call `runUnifiedOrchestration` or keep their current flow.
- **Sport** — envelope.sport is normalized via `normalizeToSupportedSport` (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
- **No dead provider states** — `getAvailableFromRequested` only returns providers that are configured; if none, route returns 503 with clear message.
- **Deterministic fallback** — when all providers fail, `runOrchestration` (unified-ai) returns deterministic-only answer via ConsensusEvaluator; no unreachable branch.
- **Logging** — every successful run logs to AiOutput via `logOrchestrationResult` (taskType = featureType, meta includes traceId and provider results).

## Test Scaffolding

- `lib/ai-orchestration/__tests__/request-validator.test.ts` — validateAIRequest, validateEnvelope.
- `lib/ai-orchestration/__tests__/error-handler.test.ts` — toAIErrorCode, toUnifiedAIError, toHttpStatus.
- `lib/ai-orchestration/__tests__/orchestration-service.test.ts` — runUnifiedOrchestration with mocked providers (optional).

## QA / Audit Checklist

- **No dead routes** — POST /api/ai/run and GET /api/ai/providers/status are implemented and return JSON; both require auth.
- **No dead provider states** — getAvailableFromRequested() returns only configured providers; when none available, runUnifiedOrchestration returns 503 provider_unavailable with clear userMessage.
- **No unreachable fallback branches** — When all providers fail, runOrchestration (unified-ai) still runs with empty/failed modelOutputs; ConsensusEvaluator returns deterministic-only or safe message. No branch skips normalization.
- **No duplicate provider logic** — Each provider (OpenAI, DeepSeek, Grok) is implemented once in lib/ai-orchestration/providers/*; registry returns singleton instances.
- **No frontend assumptions without backend support** — Mode and tool types are validated; isModeAllowed() and getToolEntry() ensure only allowed modes are used. Provider status endpoint returns availability so UI can hide provider selector when only one is configured.
- **Clean errors for unavailable providers** — toUnifiedAIError('provider_unavailable') returns userMessage; 503 with JSON body; no stack or keys in response.
