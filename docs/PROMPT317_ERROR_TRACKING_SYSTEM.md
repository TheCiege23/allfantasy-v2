# PROMPT 317 — Error Tracking System

## Objective

Track all errors across frontend, backend, API, and AI with a single pipeline and optional Sentry integration.

---

## Implemented

### 1. Frontend error tracking

- **Global handlers:** `initFrontendErrorTracking()` (in `lib/error-tracking/frontend.ts`) registers:
  - `window.addEventListener('error', ...)` — uncaught synchronous errors
  - `window.addEventListener('unhandledrejection', ...)` — unhandled promise rejections
- **Flow:** Each event is passed to `captureException(error, context)`, which calls `logError` (existing) and, when configured, the optional reporter (e.g. Sentry).
- **Where:** A client component `ErrorTrackingInit` runs `initFrontendErrorTracking()` and `initSentryClient()` in `useEffect`. It is mounted once in the root layout (`app/layout.tsx`) inside `LanguageProviderClient`.
- **ErrorBoundary:** `ErrorBoundary` now calls `captureException` instead of `logError` in `componentDidCatch`, so boundary errors go through the same pipeline and can be sent to Sentry.

### 2. Backend logging

- **Central capture:** `lib/error-tracking/capture.ts` exports `captureException(error, ctx)` and `setErrorReporter(fn)`. All server-side errors that go through this path are logged via `logError` (from `lib/error-handling/logger.ts`). In development, that logs to console with context; the reporter can be set to send to an external service.
- **Existing logger:** `lib/error-handling/logger.ts` remains the core: it logs message, context, and optional stack. No change to its contract.

### 3. API failure logs

- **Automatic logging:** In `lib/telemetry/usage.ts`, `withApiUsage` now calls `logApiFailure` in `finally` whenever the handler returns a non-OK response (`status >= 400`) or throws. Payload includes:
  - `endpoint`, `method`, `status`, `durationMs`, `leagueId`, and `error` (when thrown).
- **Flow:** `logApiFailure` (in `lib/error-tracking/api.ts`) builds an `ApiFailureContext` and calls `captureException`, so API failures are logged and optionally sent to Sentry. Every route wrapped with `withApiUsage` is covered.

### 4. AI failure logs

- **Dedicated helper:** `logAiFailure(error, ctx)` in `lib/error-tracking/ai.ts` accepts:
  - `tool`, `provider`, `endpoint`, `reason`, `durationMs`, `userId`, `leagueId`, `meta`
- **Flow:** It calls `captureException` with tags (e.g. `type: 'ai'`, `tool`, `provider`, `reason`) so AI failures can be filtered in Sentry or logs.
- **Used in:**
  - `app/api/ai/chat/route.ts` — in the catch block of the POST handler
  - `app/api/trade-evaluator/route.ts` — in the top-level catch of the POST handler
- **Other AI routes** (e.g. `/api/chat/chimmy`, `/api/ai/waiver`, `/api/ai/trade-eval`) can add `logAiFailure` in their catch blocks the same way.

### 5. Optional Sentry integration

- **Module:** `lib/error-tracking/sentry.ts` exports:
  - `initSentryClient()` — for the browser. No-op if `NEXT_PUBLIC_SENTRY_DSN` is not set or `@sentry/nextjs` is not installed. When run, it initializes Sentry and calls `setErrorReporter` so `captureException` sends to Sentry.
  - `initSentryServer()` — for Node. No-op if `SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN`) is not set or Sentry is not installed. When run, it sets the server-side reporter.
- **Where called:**
  - Client: `ErrorTrackingInit` calls `initSentryClient()` after `initFrontendErrorTracking()`.
  - Server: `instrumentation.ts` calls `initSentryServer()` in `register()` so the server reporter is set at startup.
- **Enabling Sentry:**
  1. `npm install @sentry/nextjs`
  2. Set `NEXT_PUBLIC_SENTRY_DSN` (client) and/or `SENTRY_DSN` (server)
  3. No code change needed; init runs automatically and uses the reporter when available.

---

## Files added/updated

| Path | Change |
|------|--------|
| `lib/error-tracking/capture.ts` | New. `captureException`, `setErrorReporter`. |
| `lib/error-tracking/frontend.ts` | New. `initFrontendErrorTracking`. |
| `lib/error-tracking/api.ts` | New. `logApiFailure`, `ApiFailureContext`. |
| `lib/error-tracking/ai.ts` | New. `logAiFailure`, `AiFailureContext`. |
| `lib/error-tracking/sentry.ts` | New. `initSentryClient`, `initSentryServer` (optional). |
| `lib/error-tracking/index.ts` | New. Re-exports. |
| `lib/telemetry/usage.ts` | Call `logApiFailure` when response not ok or thrown. |
| `components/error-handling/ErrorTrackingInit.tsx` | New. Client init for tracking + Sentry. |
| `components/error-handling/ErrorBoundary.tsx` | Use `captureException` instead of `logError`. |
| `app/layout.tsx` | Mount `ErrorTrackingInit`. |
| `instrumentation.ts` | Call `initSentryServer()`. |
| `app/api/ai/chat/route.ts` | Call `logAiFailure` in catch. |
| `app/api/trade-evaluator/route.ts` | Call `logAiFailure` in catch. |
| `docs/PROMPT317_ERROR_TRACKING_SYSTEM.md` | This deliverable. |

---

## Usage

- **Frontend:** Nothing else to do; global handlers and ErrorBoundary use the pipeline.
- **API:** Routes wrapped with `withApiUsage` get API failure logging automatically.
- **AI routes:** In the catch block of an AI route, call:
  ```ts
  logAiFailure(error, { tool: 'ToolName', endpoint: '/api/...', provider: 'openai' })
  ```
- **Custom capture:** Anywhere (client or server), call `captureException(error, { context: '...', ... })` to log and optionally send to Sentry.

---

## Summary

- **Frontend:** Global error and unhandledrejection handlers plus ErrorBoundary report via `captureException`.
- **Backend:** All captured errors go through `logError`; optional reporter (Sentry) can be set.
- **API failures:** Logged automatically for every `withApiUsage` route when status >= 400 or on throw.
- **AI failures:** Logged via `logAiFailure` in ai/chat and trade-evaluator; other AI routes can add the same call.
- **Sentry:** Optional; enable with DSN env vars and `@sentry/nextjs`; client and server init are wired.
