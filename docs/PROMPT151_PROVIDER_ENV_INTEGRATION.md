# PROMPT 151 — API Key and Provider Environment Integration

## Exact environment variables to set

| Variable | Required | Purpose | Legacy / alias |
|----------|----------|---------|----------------|
| **OPENAI_API_KEY** | For OpenAI features | OpenAI API key | AI_INTEGRATIONS_OPENAI_API_KEY |
| **OPENAI_BASE_URL** | No (default: https://api.openai.com/v1) | Custom base URL | AI_INTEGRATIONS_OPENAI_BASE_URL |
| **OPENAI_MODEL** | No (default: gpt-4o) | Model name | — |
| **DEEPSEEK_API_KEY** | For DeepSeek features | DeepSeek API key | — |
| **XAI_API_KEY** | For xAI/Grok features | xAI API key | GROK_API_KEY |
| **XAI_BASE_URL** | No | xAI base URL | GROK_BASE_URL |
| **XAI_MODEL** | No | xAI model | GROK_MODEL |
| **CLEARSPORTS_API_KEY** | For ClearSports data | ClearSports API key | CLEAR_SPORTS_API_KEY |
| **CLEARSPORTS_API_BASE** | For ClearSports data | ClearSports API base URL | CLEAR_SPORTS_API_BASE |

All keys are **server-side only**. Never expose them to the frontend or in logs.

---

## Provider configuration summary

- **Central loader:** `lib/provider-config.ts`  
  - Reads env with canonical names (and legacy aliases).  
  - Exposes: `getOpenAIConfigFromEnv()`, `getDeepSeekConfigFromEnv()`, `getXaiConfigFromEnv()`, `getClearSportsConfigFromEnv()`.  
  - Exposes: `isOpenAIAvailable()`, `isDeepSeekAvailable()`, `isXaiAvailable()`, `isClearSportsAvailable()`.  
  - `getProviderStatus()` returns `{ openai, deepseek, xai, clearsports, anyAi }` (booleans only).  
  - `logProviderStatus()` logs only "set" / "unset" per provider (no secret values).

- **Frontend-safe status:** `GET /api/providers/status`  
  - Returns JSON: `{ openai, deepseek, xai, clearsports, anyAi }`.  
  - Use for: provider selector, AI mode selector, provider comparison, media generation screen, Chimmy, social clip generation, blog generation.

- **AI clip status:** `GET /api/social-clips/ai/status`  
  - Now backed by `getProviderStatus()`; returns `{ xai, openai, deepseek, anyAvailable }`.

- **Graceful fallback:**  
  - If a key is missing, the corresponding `is*Available()` is false and `get*ConfigFromEnv()` returns null.  
  - Callers (orchestrator, blog, clear-sports, sports-router) check availability and skip or fallback (e.g. try another AI provider).

---

## Startup validation notes

- **Instrumentation:** `instrumentation.ts` at project root calls `logProviderStatus()` when the Node.js server boots (only if `experimental.instrumentationHook` is enabled in `next.config.js`).  
- **Safe logging:** Only "openai: set", "deepseek: unset", etc. are logged; secret values are never printed.  
- **No hard failure:** Missing keys do not crash the server; features that depend on a provider are disabled or fall back.

---

## Local / dev / prod configuration

- **Local:** Set the variables you need in `.env.local` (or `.env`). Use `.env.example` as a template; leave values empty or fill with dev keys.  
- **Dev:** Same as local; ensure `NEXTAUTH_URL` and app URLs point to your dev origin.  
- **Prod:** Set all required keys in the deployment environment (e.g. Vercel Project Settings → Environment Variables). Do not commit `.env` or `.env.production` with real keys.

---

## File list ([NEW] / [UPDATED])

| Label | Relative path |
|-------|----------------|
| [NEW] | `lib/provider-config.ts` |
| [NEW] | `app/api/providers/status/route.ts` |
| [NEW] | `instrumentation.ts` |
| [UPDATED] | `.env.example` |
| [UPDATED] | `next.config.js` (experimental.instrumentationHook) |
| [UPDATED] | `lib/clear-sports.ts` (use getClearSportsConfigFromEnv) |
| [UPDATED] | `lib/sports-router.ts` (use isClearSportsAvailable) |
| [UPDATED] | `app/api/social-clips/ai/status/route.ts` (use getProviderStatus) |
| [UPDATED] | `lib/ai-social-clip-engine/AISocialClipOrchestrator.ts` (use provider-config for availability) |
| [UPDATED] | `lib/automated-blog/BlogGenerationService.ts` (use provider-config for availability) |

All changes are merged in the repo. NEW files are complete; UPDATED files show only the modified parts below (rest unchanged).

### [NEW] lib/provider-config.ts (complete)

Central loader: env readers, availability flags, getProviderStatus(), logProviderStatus(). No secrets in logs.

### [NEW] app/api/providers/status/route.ts (complete)

GET handler returns getProviderStatus() as JSON for frontend-safe provider selector / AI mode / Chimmy / social clip / blog.

### [NEW] instrumentation.ts (complete)

Calls logProviderStatus() on Node.js server boot when experimental.instrumentationHook is enabled.

### [UPDATED] .env.example

Canonical names added: OPENAI_API_KEY, DEEPSEEK_API_KEY, XAI_API_KEY, CLEARSPORTS_API_KEY, CLEARSPORTS_API_BASE. Legacy CLEAR_SPORTS_* and GROK_* retained. OpenAI/DeepSeek/xAI/ClearSports sections reordered and commented.

### [UPDATED] next.config.js

`experimental.instrumentationHook: true` added so instrumentation.ts runs at startup.

### [UPDATED] lib/clear-sports.ts

Import `getClearSportsConfigFromEnv` from `./provider-config`. `getConfig()` now returns `getClearSportsConfigFromEnv()` (supports CLEARSPORTS_* and CLEAR_SPORTS_*).

### [UPDATED] lib/sports-router.ts

Import `isClearSportsAvailable` from `./provider-config`. In `fetchFromClearSports`, guard changed to `if (!isClearSportsAvailable()) return null`.

### [UPDATED] app/api/social-clips/ai/status/route.ts

Import `getProviderStatus` from `@/lib/provider-config`. GET returns `{ xai, openai, deepseek, anyAvailable }` from getProviderStatus().

### [UPDATED] lib/ai-social-clip-engine/AISocialClipOrchestrator.ts

Import `isOpenAIAvailable`, `isXaiAvailable`, `isDeepSeekAvailable` from `@/lib/provider-config`. `isOpenAIConfigured` / `isXaiConfigured` / `isDeepSeekConfigured` delegate to these.

### [UPDATED] lib/automated-blog/BlogGenerationService.ts

Import `isXaiAvailable`, `isDeepSeekAvailable` from `@/lib/provider-config`. `isXaiConfigured` / `isDeepSeekConfigured` delegate to these.

---

## QA checklist

- [ ] **No hardcoded secrets** — No API keys in source; all from env.  
- [ ] **Server-side only** — No provider keys in `NEXT_PUBLIC_*` or client bundles.  
- [ ] **Missing keys** — App starts and runs; features that need a provider show unavailable or fallback (no dead UI; no uncaught throw from missing key in status path).  
- [ ] **Invalid keys** — 401/403 from provider; app handles error and does not log the key.  
- [ ] **Safe logging** — `logProviderStatus()` and any other provider log only "set"/"unset" or redacted info.  
- [ ] **Frontend status** — `GET /api/providers/status` returns only booleans; no keys or tokens in response.  
- [ ] **Provider selector / AI mode / Chimmy / social clip / blog** — Can call `GET /api/providers/status` or `GET /api/social-clips/ai/status` to show which providers are available; no dead options when a key is missing.  
- [ ] **ClearSports** — With `CLEARSPORTS_API_KEY` and `CLEARSPORTS_API_BASE` set, sports-router ClearSports path works; with legacy `CLEAR_SPORTS_*` set, still works.  
- [ ] **Startup** — With `instrumentationHook: true`, server logs provider status once on boot (e.g. `[ProviderConfig] openai: set, deepseek: unset, ...`).
