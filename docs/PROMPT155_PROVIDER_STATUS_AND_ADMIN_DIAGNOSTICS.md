# PROMPT 155 — Provider Status and Admin Diagnostics

Provider status and diagnostics for **OpenAI**, **DeepSeek**, **xAI**, and **ClearSports**. Admins can see availability, recent failures, fallback activity, latency, configuration status, and degraded behavior. No raw secrets or stack traces are exposed; frontend receives only safe status metadata.

---

## 1. Implemented components

| Component | Purpose |
|-----------|--------|
| **ProviderStatus service** | `lib/admin/provider-status-service.ts` — in-memory tracking of failures, fallback events, latency; `getProviderDiagnostics()` builds safe payload. |
| **Provider diagnostics (re-export)** | `lib/provider-diagnostics.ts` — re-exports recording and types for use by orchestration and admin route. |
| **ProviderHealthCheck route** | `GET /api/admin/providers/health` returns admin-safe configured/available/healthy/state for OpenAI, DeepSeek, xAI, and ClearSports. |
| **Admin diagnostics route** | `GET /api/admin/providers/diagnostics` — admin-only; returns safe diagnostics payload. |
| **Admin diagnostics panel** | `app/admin/components/AdminProviderDiagnostics.tsx` — provider cards, status badges, expand/collapse, failure summary, fallback summary, refresh button. |
| **Provider status badges** | Configured, Available, Degraded, Unavailable, Fallback active (with distinct styling). |
| **Safe diagnostics logging** | `logDiagnosticsEvent()` and `sanitizeProviderError()` used; no keys or stack traces in stored or returned data. |
| **Recent failure summaries** | Last 30 failures with provider, timestamp, sanitized error. |
| **Fallback event summaries** | Last 30 fallback events (primary → used) with timestamp. |

---

## 2. Backend diagnostics routes and services

### Route: GET /api/admin/providers/diagnostics

- **Auth:** `requireAdmin()` — admin session cookie or bearer/admin-secret. Non-admin receives `401 Unauthorized`.
- **Behavior:** Calls `runProviderHealthCheck()` + `runClearSportsHealthCheck()`, reads `getProviderStatus()`, and builds diagnostics via `getProviderDiagnostics({ healthEntries, providerStatus, clearSportsHealth })`.
- **Response:** JSON with `providers`, `recentFailures`, `fallbackEvents`, `latencyTrend`, `degradedMode`, and `generatedAt`. No API keys, no stack traces, no internal paths.

### Route: GET /api/admin/providers/health

- **Auth:** `requireAdmin()`.
- **Behavior:** Returns lightweight provider health rows with `configured`, `available`, optional `healthy`, safe `error`, and normalized `state` (`configured | available | degraded | unavailable`).
- **Response:** Admin-safe health metadata only; no secret values.

### Service: lib/admin/provider-status-service.ts

- **Recording:** `recordProviderFailure(provider, error?)`, `recordProviderFallback(primary, used)`, `recordProviderLatency(provider, ms)`. Error is sanitized before storage.
- **Payload:** `getProviderDiagnostics({ healthEntries, providerStatus, clearSportsHealth })` returns `ProviderDiagnosticsPayload` with per-provider state (configured / available / degraded / unavailable / fallback_active), recent failure count (1h window), fallback count, last/avg latency, latency trend, degraded reasons, and degraded-mode events.

### Orchestration wiring

- In `lib/ai-orchestration/orchestration-service.ts`, after `Promise.all(available.map(callProviderWithRetry))`:
  - For each provider: `recordProviderLatency(role, meta.latencyMs)`; if `result.status !== 'ok'`, `recordProviderFailure(role, result.error)`.
  - If multiple providers and at least one succeeded: for each failed/skipped provider, `recordProviderFallback(failedRole, usedRole)`.
  - On deterministic degraded fallback (`all providers unavailable` / `all provider calls failed`): `recordDegradedModeActivation(...)`.
  - Safe diagnostics logging calls `logDiagnosticsEvent(...)` for failure/fallback/latency events.

---

## 3. Frontend admin diagnostics UI

- **Location:** Admin → **Providers** tab (`/admin?tab=providers`).
- **Refresh:** “Refresh status” button calls `GET /api/admin/providers/diagnostics` (credentials included); loading state and error state are shown.
- **Provider cards:** One row per provider (OpenAI, DeepSeek, xAI, ClearSports) with status badge. Row is expandable; details show configured/available/healthy, last latency, recent failure count, last failure time, sanitized error if any.
- **Provider cards:** One row per provider (OpenAI, DeepSeek, xAI, ClearSports) with status badge. Row is expandable; details show configured/available/healthy, last + average latency, latency trend, recent failure count, last failure time, degraded reasons, sanitized error if any.
- **Failure summary:** Expandable section “Recent failure summary” with list of entries (provider, time, error snippet). Opens/closes correctly.
- **Fallback summary:** Expandable section “Fallback event summary” with primary → used and time. Fallback badge also shown on provider row when `fallbackUsedCount > 0`.
- **Degraded mode section:** Shows whether degraded mode was recently active and a list of recent degraded-mode activation reasons/timestamps.
- **States:** Configured (grey), Available (green), Degraded (amber), Unavailable (red), Fallback active (amber + icon). No dead controls; all buttons and expand toggles are wired.

---

## 4. Auth / role guard notes

- **Admin only:** `GET /api/admin/providers/diagnostics` uses `requireAdmin()`. Caller must have valid admin session cookie or `Authorization: Bearer <ADMIN_PASSWORD>` or `x-admin-secret` header matching server secret.
- **Non-admin:** Returns `401` with `{ error: "Unauthorized" }`. No diagnostics payload is returned.
- **Admin page:** `/admin` and `/admin?tab=providers` are protected by the existing admin page guard (redirect to login if no session, redirect to `/` if not admin). The Providers tab is only visible and reachable when the user is admin.

---

## 5. Safe diagnostics and logging

- **No secrets:** Stored and returned data use `sanitizeProviderError()` for any error message; no API keys, tokens, or full stack traces.
- **Logging:** `logDiagnosticsEvent()` can be used for server-side logs (e.g. failure events in development); it does not log secrets.
- **Frontend:** Only receives the JSON from the diagnostics route; no internal error details or stack traces are sent to the client.

---

## 6. QA checklist

- [ ] **Admin diagnostics route loads:** As admin, open `/admin?tab=providers`; the diagnostics panel loads and shows provider list and sections.
- [ ] **Refresh status button works:** Click “Refresh status”; request is sent, loading state appears, then data updates (e.g. generatedAt and provider states).
- [ ] **Provider details expand/collapse works:** Click a provider row; details expand; click again to collapse.
- [ ] **Failure summary opens correctly:** Click “Recent failure summary”; section expands and shows list (or “No recent failures”); click again to collapse.
- [ ] **Fallback badge displays correctly:** When there are fallback events for a provider, that provider row shows “Fallback used Nx” and/or the Fallback event summary shows entries.
- [ ] **Non-admin access is blocked correctly:** Without admin session, GET `/api/admin/providers/diagnostics` returns 401. Direct navigation to `/admin?tab=providers` as non-admin redirects per existing admin guard.
- [ ] **No dead admin controls:** Refresh, expand/collapse, and failure/fallback section toggles all work; no buttons without handlers.
- [ ] **No secrets in response:** Inspect API response and panel content; no raw API keys, tokens, or stack traces.
- [ ] **Status states are clear:** Configured vs available vs degraded vs unavailable vs fallback_active are distinguishable by badge and copy.

---

## 7. File summary

| Path | Purpose |
|------|---------|
| `lib/admin/provider-status-service.ts` | In-memory failures, fallbacks, latency, degraded-mode events; getProviderDiagnostics(); safe only. |
| `lib/provider-diagnostics.ts` | Re-exports for orchestration and admin; recordProviderFailure/Fallback/Latency. |
| `lib/ai-orchestration/orchestration-service.ts` | Records latency and failure per provider; records fallback when multiple providers and one succeeds. |
| `app/api/admin/providers/diagnostics/route.ts` | GET diagnostics; requireAdmin(); returns safe payload. |
| `app/api/admin/providers/health/route.ts` | GET health snapshot; requireAdmin(); safe configured/available/healthy/state payload. |
| `app/admin/components/AdminProviderDiagnostics.tsx` | Panel: providers, badges, expand, failure summary, fallback summary, refresh. |
| `app/admin/components/AdminLayout.tsx` | Added “providers” tab and nav entry. |
| `app/admin/page.tsx` | Added “providers” to allowed tabs; renders AdminProviderDiagnostics. |
