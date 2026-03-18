# PROMPT 314 — AI Load and Cost Protection

## Objective

Prevent AI overuse and cost spikes via a central protection layer: rate limiting per user, token enforcement hooks, response caching, and fallback-to-deterministic hints.

---

## Implemented

### 1. Rate limiting per user

- **Module:** `lib/ai-protection/`
- **Config:** `lib/ai-protection/config.ts` defines per-action limits:
  - `chat`: 20 req/min
  - `chimmy`: 30 req/min
  - `trade_eval`: 15 req/min
  - `waiver`: 15 req/min
  - `orchestrate`: 40 req/min
- **Behavior:** Uses existing `consumeRateLimit` (from `lib/rate-limit`) with scope `"ai"` and action per endpoint. Limits are applied per user when `userId` or `sleeperUsername` is available; otherwise per IP. Keys can include IP (`includeIpInKey: true`) to reduce abuse.
- **Applied to:** `/api/ai/chat`, `/api/chat/chimmy`, `/api/ai/waiver`, `/api/trade-evaluator` (all use central config or `runAiProtection`).

### 2. Token enforcement

- **Module:** `lib/ai-protection/tokens.ts`
- **API:** `checkTokenBalance(userId, estimatedCost)` and `deductTokens(userId, cost)`.
- **Current behavior:** Balance is not yet persisted; both functions allow all requests and no-op deduct. When `GET /api/tokens/balance` is backed by DB, implement:
  - In `checkTokenBalance`: fetch balance, return `{ allowed: balance >= estimatedCost, remaining }`.
  - In `deductTokens`: decrement balance for the user.
- **Usage:** `runAiProtection(..., { enforceTokens: true })` will call `checkTokenBalance`; enable when balance is implemented.

### 3. Request batching

- **Status:** Not implemented at the transport layer. AI routes remain request-per-call. Batching would require an aggregator (e.g. queue + batch runner) and is left for a future iteration.
- **Mitigation:** Rate limits and response caching reduce duplicate and burst traffic.

### 4. Caching responses

- **Module:** `lib/ai-protection/cache.ts`
- **API:** `getCachedResponse<T>(key)`, `setCachedResponse(key, value, ttlMs)`, `buildCacheKey(endpoint, payload)`.
- **Behavior:** In-memory TTL cache (max 500 entries, eviction by expiry and size). Key is built from endpoint + normalized payload (e.g. sorted JSON).
- **Applied to:** `/api/trade-evaluator`: cache key from leagueId + sender/receiver players and picks; TTL 2 min from config. Identical trade inputs within the window return the cached JSON without calling AI again.

### 5. Fallback to deterministic logic

- **429 payload:** When rate limit or token check fails, the protection layer returns `429` with a body that includes `useDeterministicFallback: true` and standard fields (`retryAfterSec`, `remaining`, `message`). Clients can show “Try again in Xs” or switch to non-AI behavior.
- **Trade evaluator:** Already uses deterministic fallbacks internally (e.g. when GPT is skipped or fails). The 429 response now includes `useDeterministicFallback: true` so clients can treat it consistently.

---

## Files added/updated

| Path | Change |
|------|--------|
| `lib/ai-protection/config.ts` | New. Per-action limits and optional cache TTL / token cost. |
| `lib/ai-protection/rate-limit.ts` | New. `checkAiRateLimit(req, action, options)` using central config. |
| `lib/ai-protection/cache.ts` | New. In-memory cache + `buildCacheKey`. |
| `lib/ai-protection/tokens.ts` | New. `checkTokenBalance` / `deductTokens` stubs for future enforcement. |
| `lib/ai-protection/withAiProtection.ts` | New. `runAiProtection`, `buildAiLimit429`. |
| `lib/ai-protection/index.ts` | New. Re-exports. |
| `app/api/chat/chimmy/route.ts` | Run `runAiProtection` before handling POST. |
| `app/api/ai/waiver/route.ts` | Replace IP-only rate limit with `runAiProtection` (per user when logged in). |
| `app/api/ai/chat/route.ts` | Use `checkAiRateLimit` from ai-protection; add `useDeterministicFallback` to 429. |
| `app/api/trade-evaluator/route.ts` | Use `checkAiRateLimit` + config; add cache lookup/set and `useDeterministicFallback` on 429. |
| `docs/PROMPT314_AI_LOAD_AND_COST_PROTECTION.md` | This deliverable. |

---

## Usage for new AI routes

1. **Rate limit only:** At the start of the handler, call `runAiProtection(req, { action: 'chimmy', getUserId: async () => (await getServerSession(...))?.user?.id ?? null })`. If it returns a response, return it (429).
2. **Rate limit + token check:** Same as above with `enforceTokens: true` (once token balance is implemented).
3. **Caching:** After parsing the request, build `key = buildCacheKey('/api/your-endpoint', normalizedBody)`, then `getCachedResponse(key)`. If hit, return `NextResponse.json(cached)`. Before returning a successful result, `setCachedResponse(key, payload, ttlMs)`.
4. **429 shape:** Use `buildAiLimit429({ message, retryAfterSec, remaining, resetTimeMs })` for a consistent 429 body with `useDeterministicFallback: true`.

---

## Summary

- **Rate limiting:** Centralized per-user (and IP) limits for chat, chimmy, waiver, trade_eval, orchestrate.
- **Token enforcement:** Stubs in place; enable when balance is persisted.
- **Caching:** Response cache used on trade-evaluator; other routes can adopt the same helpers.
- **Fallback:** 429 responses include `useDeterministicFallback` so clients can degrade to deterministic or “try again” UX.
