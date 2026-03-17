# PROMPT 152 — OpenAI / DeepSeek / xAI Provider Adapter Implementation

Backend provider adapters for **OpenAI**, **DeepSeek**, and **xAI (Grok)** plug into the unified AI orchestration layer. Supported sports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Provider roles

| Provider | Role | Use |
|----------|------|-----|
| **OpenAI** | `openai` | Final user-facing synthesis, Chimmy responses, action plans, polished output |
| **DeepSeek** | `deepseek` | Structured analytical reasoning, deterministic interpretation, matrix/scoring review |
| **xAI (Grok)** | `grok` | Trend framing, narrative/social framing, engagement-style summaries |

---

## 2. Implemented components

- **OpenAIAdapter** — `createOpenAIProvider()` / `createOpenAIAdapter()` in `lib/ai-orchestration/providers/openai-provider.ts`
- **DeepSeekAdapter** — `createDeepSeekProvider()` / `createDeepSeekAdapter()` in `lib/ai-orchestration/providers/deepseek-provider.ts`
- **XAIAdapter** — `createGrokProvider()` / `createXAIAdapter()` in `lib/ai-orchestration/providers/grok-provider.ts`
- **Shared interface** — `IProviderClient` in `lib/ai-orchestration/provider-interface.ts` (`role`, `chat()`, `isAvailable()`, optional `healthCheck()`)
- **Provider registry** — `lib/ai-orchestration/provider-registry.ts`: `getProvider(role)`, `getAvailableFromRequested(roles)`, `checkProviderAvailability()`
- **Timeout/retry** — Per-request `timeoutMs`; `AI_ORCHESTRATION_TIMEOUT_MS`, `AI_ORCHESTRATION_RETRY_COUNT` in orchestration-service; retry loop in `callProviderWithRetry()`
- **Provider health** — `getProviderAvailability()` (sync), `runProviderHealthCheck()` (async, optional `healthCheck()` per provider) in `lib/ai-orchestration-engine/provider-health-check.ts`
- **Response normalization** — `normalizeToUnifiedResponse()` in `lib/ai-orchestration/response-normalizer.ts`; provider results mapped to `UnifiedAIResponse` with `providerStatus`
- **Error normalization** — `toUnifiedAIError`, `toHttpStatus`, `fromThrown` in `lib/ai-orchestration/error-handler.ts`; **sanitization** via `sanitizeProviderError()` in `lib/ai-orchestration/provider-utils.ts` (no keys/tokens in logs or responses)
- **Availability** — Single source of truth: `lib/provider-config.ts` (`isOpenAIAvailable()`, `isDeepSeekAvailable()`, `isXaiAvailable()`); each adapter uses these in `isAvailable()` and `healthCheck()`
- **Malformed responses** — Empty or whitespace-only provider text → `status: 'invalid_response'` and safe `error`; `isMeaningfulText()` in `provider-utils.ts`

---

## 3. Route / service wiring

| Route / service | Purpose |
|-----------------|--------|
| **POST /api/ai/orchestrate** | Main unified AI entry; body = `UnifiedAIRequest`; calls `runUnifiedOrchestration()`; returns `{ ok, response }` or `{ ok: false, error }`. |
| **POST /api/ai/run** | Alternative entry; builds envelope and calls `runUnifiedOrchestration()`. |
| **POST /api/ai/chimmy** | Chimmy chat; builds envelope, calls `runUnifiedOrchestration()`. |
| **POST /api/ai/compare** | Compare mode; builds envelope, calls `runUnifiedOrchestration()`. |
| **GET /api/ai/providers/status** | Returns provider availability (no secrets); uses `checkProviderAvailability()`; auth required. |

Orchestration flow: **request validator** → **tool registry** (effective mode) → **provider registry** (available providers from requested roles) → **callProviderWithRetry()** per provider → **runOrchestration()** (unified-ai) → **normalizeToUnifiedResponse()**.

---

## 4. Example request / response payloads

**Request (POST /api/ai/orchestrate):**

```json
{
  "envelope": {
    "featureType": "trade_analyzer",
    "sport": "NFL",
    "leagueId": "league-123",
    "userId": "user-456",
    "deterministicPayload": { "fairnessScore": 72, "summary": "Fair trade" },
    "userMessage": "Should I accept this trade?",
    "promptIntent": "explain",
    "modelRoutingHints": ["openai"]
  },
  "mode": "single_model",
  "options": { "timeoutMs": 20000, "traceId": "tr-abc" }
}
```

**Success response (200):**

```json
{
  "ok": true,
  "response": {
    "primaryAnswer": "Based on the data, this trade is fair...",
    "confidencePct": 75,
    "confidenceLabel": "medium",
    "valueVerdict": "Fair for both sides.",
    "viabilityVerdict": "Worth considering.",
    "actionPlan": "Review roster needs and accept or counter.",
    "modelOutputs": [
      { "model": "openai", "raw": "...", "error": null, "skipped": false }
    ],
    "reliability": {
      "usedDeterministicFallback": false,
      "providerStatus": [
        { "provider": "openai", "status": "ok" }
      ]
    },
    "mode": "single_model",
    "traceId": "tr-abc"
  },
  "traceId": "tr-abc"
}
```

**Error response (4xx/5xx):**

```json
{
  "ok": false,
  "error": {
    "code": "envelope_validation_failed",
    "message": "User-facing message",
    "traceId": "tr-abc"
  },
  "traceId": "tr-abc"
}
```

**GET /api/ai/providers/status (200):**

```json
{
  "openai": true,
  "deepseek": true,
  "grok": false
}
```

---

## 5. Env requirements

| Variable | Purpose |
|----------|---------|
| **OPENAI_API_KEY** or **AI_INTEGRATIONS_OPENAI_API_KEY** | OpenAI adapter; required for OpenAI. |
| **OPENAI_BASE_URL** (optional) | Default `https://api.openai.com/v1`. |
| **OPENAI_MODEL** (optional) | Default `gpt-4o`. |
| **DEEPSEEK_API_KEY** | DeepSeek adapter; required for DeepSeek. |
| **XAI_API_KEY** or **GROK_API_KEY** | xAI adapter; required for Grok. |
| **XAI_BASE_URL** / **GROK_BASE_URL** (optional) | Default `https://api.x.ai/v1`. |
| **XAI_MODEL** / **GROK_MODEL** (optional) | Default `grok-2-latest`. |
| **AI_ORCHESTRATION_TIMEOUT_MS** (optional) | Per-call timeout; default 25000. |
| **AI_ORCHESTRATION_RETRY_COUNT** (optional) | Retries per provider call; default 1. |

All keys are server-side only; never exposed to frontend or in logs/responses.

---

## 6. QA checklist

- [ ] **Each provider adapter works independently** — Call orchestration with `mode: "single_model"` and a single `modelRoutingHints` (e.g. `["openai"]`, `["deepseek"]`, `["grok"]`); confirm 200 and non-empty `primaryAnswer` when that provider is configured.
- [ ] **Provider unavailability is handled safely** — With a provider’s API key unset, that provider is `false` in GET /api/ai/providers/status; orchestration does not call it; fallback or deterministic-only path is used; no stack traces or keys in response.
- [ ] **Malformed responses** — If a provider returns success but empty/whitespace text, `status` is `invalid_response` and `error` is a safe message (no secrets); response normalizer and reliability metadata reflect it.
- [ ] **No secret values in logs or responses** — Trigger a provider error (e.g. invalid key); confirm error message is sanitized (e.g. `[REDACTED]` or generic "Provider error"); no `sk-...` or raw keys in JSON or logs.
- [ ] **No dead backend routes** — All listed routes (orchestrate, run, chimmy, compare, providers/status) are in use; remove or document any unused AI routes.
- [ ] **Consensus and unified_brain** — With multiple providers configured, run with `mode: "consensus"` or `mode: "unified_brain"`; confirm multiple `modelOutputs` and correct merging/fallback.
- [ ] **Deterministic context envelope** — Envelope with `deterministicPayload`, `hardConstraints`, `promptIntent` is passed through; no override of deterministic results by AI.
- [ ] **Structured metadata return** — Response includes `confidencePct`, `valueVerdict`, `viabilityVerdict`, `actionPlan`, `providerStatus`, `traceId` where applicable.

---

## 7. File summary

| Path | Purpose |
|------|---------|
| `lib/ai-orchestration/provider-interface.ts` | `IProviderClient`; timeout/retry constants. |
| `lib/ai-orchestration/types.ts` | `ProviderChatResult.status`: ok \| failed \| timeout \| invalid_response. |
| `lib/ai-orchestration/provider-utils.ts` | `sanitizeProviderError()`, `isMeaningfulText()`. |
| `lib/ai-orchestration/providers/openai-provider.ts` | OpenAI adapter; provider-config; healthCheck; sanitize; invalid_response. |
| `lib/ai-orchestration/providers/deepseek-provider.ts` | DeepSeek adapter; same. |
| `lib/ai-orchestration/providers/grok-provider.ts` | xAI adapter; same; `createXAIAdapter` alias. |
| `lib/ai-orchestration/provider-registry.ts` | Registry and availability. |
| `lib/ai-orchestration/orchestration-service.ts` | `runUnifiedOrchestration`; retry; mode resolution. |
| `lib/ai-orchestration/response-normalizer.ts` | `normalizeToUnifiedResponse`. |
| `lib/ai-orchestration/error-handler.ts` | `toUnifiedAIError`, etc. |
| `lib/ai-orchestration-engine/provider-health-check.ts` | `getProviderAvailability`, `runProviderHealthCheck`; sanitized error. |
| `lib/ai-orchestration-engine/index.ts` | Exports adapters (createOpenAIAdapter, createDeepSeekAdapter, createGrokAdapter, createXAIAdapter). |
| `lib/provider-config.ts` | `isOpenAIAvailable`, `isDeepSeekAvailable`, `isXaiAvailable`; env-based config. |
