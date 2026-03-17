# PROMPT 156 — End-to-End Provider Integration QA

Audit and fixes for the AllFantasy provider integration layer (OpenAI, DeepSeek, xAI, ClearSports) across AI tools, diagnostics, and UI.

---

## 1. Issue list by severity

### High

| ID | Issue | Location | Fix |
|----|--------|----------|-----|
| H1 | Legacy run path could call orchestration with `envelope: undefined`, causing validation failure and unclear client error. | `app/api/ai/run/route.ts` | Validate envelope presence before calling `runUnifiedOrchestration`; return 400 with clear message when missing. |

### Medium

| ID | Issue | Location | Fix |
|----|--------|----------|-----|
| M1 | Provider status UI returned `null` on loading/error so user saw nothing (dead area). | `components/ai-interface/AIProviderSelector.tsx` | Show "Loading…" when loading; show "Unable to load" + Retry button when error. |
| M2 | Provider status could be stale after tab/window focus. | `hooks/useProviderStatus.ts` | Refetch on `window` `focus` so badges update when user returns. |
| M3 | Chimmy provider status showed nothing on error with no retry. | `components/chimmy/ChimmyProviderStatus.tsx` | Show "Status unavailable" + retry button when error and no lastMeta. |

### Low

| ID | Issue | Location | Fix |
|----|--------|----------|-----|
| L1 | Compare route mutated shared request object. | `app/api/ai/compare/route.ts` | Build explicit `compareRequest` with `mode: 'consensus'` and new envelope so no mutation of adapter output. |
| L2 | Provider status fetch did not send credentials. | `hooks/useProviderStatus.ts` | Use `credentials: 'include'` for `/api/ai/providers/status`. |

---

## 2. File-by-file fix plan (applied)

| File | Changes |
|------|--------|
| `app/api/ai/run/route.ts` | Legacy path: require `body.envelope`; return 400 with clear message if missing. Build explicit `envelope` and pass `{ envelope, mode, options }` to `runUnifiedOrchestration`. |
| `app/api/ai/compare/route.ts` | Build `compareRequest` with `mode: 'consensus'` and `envelope: { ...unified.envelope, modelRoutingHints: undefined }`; pass to `runUnifiedOrchestration` instead of mutating `unified`. |
| `hooks/useProviderStatus.ts` | Add `credentials: 'include'` to fetch. Add `useEffect` to refetch on `window` `focus`. |
| `components/ai-interface/AIProviderSelector.tsx` | When loading: render "Loading…". When error: render "Unable to load" + Retry button calling `refetch()`. Only hide when `!showStatus`. |
| `components/chimmy/ChimmyProviderStatus.tsx` | When `error && !lastMeta`: render "Status unavailable" + retry button. |

---

## 3. Verification summary (no code changes)

- **Env loading:** Provider adapters use `provider-config` (`getOpenAIConfigFromEnv`, etc.) and `isOpenAIAvailable()`; env is read server-side only.
- **Secrets server-side:** No API keys in client payloads; error handler uses `userMessage` for display; `sanitizeProviderError` used in providers and diagnostics.
- **Provider status checks:** `checkProviderAvailability()` and `runProviderHealthCheck()` use registry and optional `healthCheck()`; admin diagnostics use same.
- **Individual provider calls:** Orchestration uses `getProvider(role).chat()` with timeout/retry; each adapter uses its client (openai-client, deepseek-client, xai-client).
- **Fallback routing:** `getAvailableFromRequested(modelsToCall)` filters to configured providers; multiple providers called in parallel; failed/skipped recorded for diagnostics.
- **Malformed responses:** Providers set `status: 'invalid_response'` and sanitized error when text empty/invalid; orchestration treats non-ok as failure.
- **ClearSports normalization:** `lib/clear-sports/normalize.ts` and sports-router use normalizers; enricher injects into envelope.
- **Deterministic evidence:** Envelope `deterministicPayload` and tool evidence builders feed UI; `mergeDataQualityWarnings` adds missing-data warnings.

---

## 4. Final QA checklist

- [ ] **Env variable loading:** With valid `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `CLEARSPORTS_API_KEY`/`CLEARSPORTS_API_BASE`, providers report available and requests succeed.
- [ ] **Server-side secrets:** No keys in JSON responses, logs, or frontend; error messages are generic or sanitized.
- [ ] **Provider status checks:** GET `/api/ai/providers/status` returns `{ openai, deepseek, grok }`; GET `/api/admin/providers/diagnostics` (admin) returns full diagnostics without secrets.
- [ ] **Individual provider calls:** Single-model and specialist flows return answers from the expected provider(s).
- [ ] **Fallback routing:** With one provider down, others still used; diagnostics show fallback events.
- [ ] **Malformed provider responses:** Empty or invalid provider output yields `invalid_response` and safe message, not crash.
- [ ] **ClearSports data normalization:** Teams/players/games from ClearSports (or fallback) appear normalized in envelope and responses.
- [ ] **Deterministic evidence:** Evidence blocks and confidence reflect envelope and data-quality; missing data shows in caveats.
- [ ] **Mobile behavior:** Provider selector and Chimmy status render and retry works; Compare and refresh work.
- [ ] **Desktop behavior:** Same as mobile; admin diagnostics panel loads and refresh works.
- [ ] **No dead provider buttons:** Loading shows "Loading…"; error shows Retry; Compare only when `canCompare` and `onCompareClick` set.
- [ ] **Compare-provider actions:** POST `/api/ai/compare` with valid contract returns response with `modelOutputs`/provider results; no broken compare flow.
- [ ] **No stale provider badges:** useProviderStatus refetches on window focus; admin diagnostics refresh updates data.
- [ ] **Retry flows:** Retry in AIProviderSelector and ChimmyProviderStatus calls `refetch()`; orchestration retry is client re-POST.

---

## 5. Manual testing checklist

### AI provider selection

- [ ] Open a screen that shows AI provider status (e.g. Chimmy or trade tool).
- [ ] Confirm "Loading…" then provider names or "None configured".
- [ ] With no env keys, confirm "None configured" or "Unable to load" + Retry.
- [ ] Click Retry and confirm status updates or error persists with no crash.

### Unified brain / consensus / specialist

- [ ] Trigger a request that uses specialist or consensus (e.g. trade explain).
- [ ] Confirm response includes answer and `modelOutputs`/reliability.
- [ ] Confirm no provider keys or stack traces in response or console.

### Chimmy

- [ ] Send a Chimmy message; confirm reply and provider indicator.
- [ ] If provider status fails, confirm "Status unavailable" and retry button works.

### Trade Analyzer / Waiver AI / Draft Helper

- [ ] Run each tool with valid context; confirm AI answer and evidence.
- [ ] Confirm deterministic evidence (scores, rankings) is visible and not overridden.

### Player Comparison / Power Rankings / Trend Detection

- [ ] Use features that call AI; confirm responses and no secret leakage.

### AI social clips / Automated blogs

- [ ] Trigger generation (if enabled); confirm they use configured providers and no secrets in response.

### Provider diagnostics

- [ ] As admin, open `/admin?tab=providers`.
- [ ] Confirm provider list, status badges, expand/collapse, failure and fallback sections.
- [ ] Click Refresh status; confirm data updates.
- [ ] As non-admin, confirm GET `/api/admin/providers/diagnostics` returns 401.

### Provider status UI

- [ ] Confirm provider selector shows Loading → status or error + Retry.
- [ ] Switch tab and return; confirm status refetches (no stale badges).
- [ ] When multiple providers available and compare supported, confirm Compare button works.

### Fallback

- [ ] With one provider disabled (e.g. unset key), run a multi-provider flow; confirm fallback and no crash.
- [ ] In admin diagnostics, confirm fallback events when applicable.

### Mobile vs desktop

- [ ] Repeat critical flows on mobile viewport and desktop; confirm no dead buttons and retry/compare work.

---

## 6. Automated test recommendations

The project uses **Vitest** for unit tests (e.g. `lib/ai-orchestration/__tests__/request-validator.test.ts`, `error-handler.test.ts`). Recommendations:

### Unit tests (Vitest)

- **Request validator:** Already covers missing envelope, invalid mode, sport normalization. Add one case: body with `envelope` as non-object (e.g. string) returns invalid.
- **Run route legacy path:** Add a test (or integration test) that POST with body `{}` (no envelope) returns 400 and message containing "envelope".
- **Error handler:** Ensure `toUnifiedAIError` and `fromThrown` never assign raw `message` to a field that is sent to client as-is; client should only see `userMessage` or sanitized content.
- **Provider diagnostics:** Test `getProviderDiagnostics` with mock health entries and ClearSports flags; assert payload shape and that no secret-like strings appear in `recentFailures` or `error` fields.
- **Provider status service:** Test `recordProviderFailure` with a string containing `sk-`; assert stored `error` is sanitized (e.g. contains `[REDACTED]` or is generic).

### Integration / API tests

- **GET /api/ai/providers/status:** With auth, expect 200 and `{ openai, deepseek, grok }` booleans.
- **POST /api/ai/run:** With invalid body (e.g. `{}`), expect 400 and envelope-related message.
- **POST /api/ai/compare:** With valid contract, expect 200 and response with `modelOutputs` or equivalent; assert no secrets in body.

### E2E (if Playwright/Cypress exists)

- **Provider selector:** Load page that uses AIProviderSelector; assert "Loading…" then status or error; if error, click Retry and assert refetch.
- **Chimmy:** Send message; assert reply and (if implemented) provider indicator; on status error, assert retry button present.
- **Admin diagnostics:** As admin, open providers tab; assert table and Refresh; as non-admin, assert redirect or 401 on diagnostics API.

---

## 7. Files touched (full merged fixes)

All fixes are in the following files; no patch snippets—only full-file context for the modified sections:

1. **app/api/ai/run/route.ts** — Legacy path envelope validation and explicit request object.
2. **app/api/ai/compare/route.ts** — Explicit compare request with `mode: 'consensus'`.
3. **hooks/useProviderStatus.ts** — `credentials: 'include'`, refetch on window focus.
4. **components/ai-interface/AIProviderSelector.tsx** — Loading and error UI, Retry button.
5. **components/chimmy/ChimmyProviderStatus.tsx** — Error state with retry button.

No other files were changed. Env loading, provider-config, orchestration, ClearSports, and admin diagnostics were audited and considered correct; only the above issues were fixed.
