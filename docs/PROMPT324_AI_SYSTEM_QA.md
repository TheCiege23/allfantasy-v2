# PROMPT 324 — AI System QA

## Objective

Ensure AI is accurate and stable: no hallucinations, correct data usage, fallback works, and response speed is bounded.

---

## Areas verified

### 1. No hallucinations (grounding)

- **Context envelope:** Tools that need factual grounding use `DeterministicContextEnvelope` and `getMandatorySystemPromptSuffix()` from `lib/ai-context-envelope/contracts.ts`. The suffix instructs: use only facts/numbers in the context; do not invent metrics; surface uncertainty when confidence is capped; respect hard constraints and missing-data blocks.
- **Where used:** Dynasty trade analyzer and waiver-ai build an envelope and inject the mandatory suffix into the system prompt. Trade evaluator uses a GPT input contract with "Use only the provided drivers" and validates narrative output; invalid output is replaced with `AI_OUTPUT_INVALID_FALLBACK`.
- **Chimmy:** **Fix applied:** Added a **GROUNDING** line to the main domain guard and to the DeepSeek (quant) system prompt: when user context or real-time data is provided, base numbers and recommendations only on that data; do not invent stats or values.
- **Output normalization:** `normalizeToContract()` in the context envelope layer ensures evidence, uncertainty, missing data, and caveats are carried through so the UI never presents raw provider output without structure.

### 2. Correct data usage

- **Envelope and sport:** Envelope includes `sport`, `leagueId`, `userId`, `evidence`, `confidence`, `uncertainty`, `missingData`. Trade/waiver adapters build envelopes from league and request context. `AISportContextResolver` and sport-scope are used for validation and fallback (no single-sport hardcoding).
- **Chimmy:** User fantasy context, real-time enrichment (valuations, injuries, trends), and screenshot context are passed in the compiled prompt; system prompts now explicitly tell the model to use only that data.
- **Trade:** Unified trade context, lineup delta, and driver data feed the GPT narrative contract; validation ensures bullets reference only provided driver IDs.

### 3. Fallback works

- **Orphan/AI drafter:** `AIDrafterService.computeAIDrafterPick()` always has a CPU result first; if `tryAIPickProvider()` fails or returns null, it returns the CPU pick. So draft never blocks on AI.
- **Multi-provider (Chimmy):** Three providers (OpenAI, Grok, DeepSeek) run in parallel via `Promise.allSettled`. If one fails, the others can still supply the answer; consensus and fallback messaging use whichever provider(s) succeeded.
- **Provider failure resolver:** `resolveProviderFailure()` in `lib/ai-reliability/ProviderFailureResolver.ts` produces a user-facing message when all fail ("deterministic results only") or when a fallback was used ("results based on X and Y").
- **Trade narrative:** Invalid or missing GPT narrative is replaced with `AI_OUTPUT_INVALID_FALLBACK` so the UI always has a consistent shape.
- **Chimmy timeout:** **Fix applied:** If all provider calls exceed 28s, the route returns a clear timeout message instead of hanging.

### 4. Response speed

- **Timeouts:** Grok client uses `fetchWithTimeout` (configurable, default 12s). AI orchestration OpenAI provider uses `timeoutMs` (default 25s) and AbortController. **Fix applied:** Chimmy route races provider `Promise.allSettled` against a 28s timeout and returns a timeout response so the route never blocks indefinitely.
- **Parallelism:** Chimmy runs OpenAI, Grok, and DeepSeek in parallel; trade/waiver flows use parallel fetches where applicable. No unnecessary sequential waits for multiple providers.
- **Caching:** AI protection layer supports response caching and rate limiting to avoid redundant or runaway calls.

---

## Fixes applied (summary)

| Area | File(s) | Change |
|------|--------|--------|
| **Chimmy grounding** | `app/api/chat/chimmy/route.ts` | In `buildDomainGuard()`: added "GROUNDING: When the prompt includes USER FANTASY CONTEXT or REAL-TIME DATA, base your numbers, rankings, and recommendations only on that data. Do not invent stats, values, or player metrics not provided." In `buildDeepSeekSystemPrompt()`: added "GROUNDING: Use only the numbers and context provided in the prompt. Do not invent stats, values, or projections not given." |
| **Chimmy timeout** | `app/api/chat/chimmy/route.ts` | Wrapped the three-provider `Promise.allSettled([...])` in `Promise.race()` with a 28s timeout. On timeout, return JSON with a clear message ("I couldn't complete that analysis in time...") and `meta.timeout: true` so the route never hangs. |

---

## Reference

- **Context envelope & grounding:** `lib/ai-context-envelope/contracts.ts`, `getMandatorySystemPromptSuffix`, `normalizeToContract`
- **Trade:** `lib/trade-engine/gpt-input-contract.ts`, `validateGptNarrativeOutput`, `AI_OUTPUT_INVALID_FALLBACK`; dynasty-trade-analyzer uses envelope + suffix
- **Waiver:** `app/api/waiver-ai/route.ts` uses `buildWaiverEnvelope`, `getMandatorySystemPromptSuffix`, `normalizeToContract`
- **Draft fallback:** `lib/automated-drafter/AIDrafterService.ts`, `lib/automated-drafter/CPUDrafterService.ts`
- **Failure resolution:** `lib/ai-reliability/ProviderFailureResolver.ts`
- **Error handling:** `lib/ai-orchestration/error-handler.ts` (user messages, HTTP status)
- **Chimmy:** `app/api/chat/chimmy/route.ts` (grounding, timeout, multi-provider, consensus)
- **Validation API:** `GET /api/ai/validation` (areas and provider availability)
