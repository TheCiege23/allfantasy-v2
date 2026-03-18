# PROMPT 327 — Failover System

## Objective

Handle outages via **retry logic**, **fallback states**, and **graceful degradation**.

---

## 1. Retry Logic

### Existing

- **`lib/error-handling/retry.ts`** — `retryWithBackoff(fn, options)`  
  - Exponential backoff: `baseMs` (default 800), `maxMs` (8000), `maxAttempts` (3).  
  - Retries on: 408, 429, 502, 503, network/fetch errors; configurable via `retryable(e)`.

- **`lib/error-handling/fetch-with-retry.ts`** — `fetchWithRetry`, `fetchJsonWithRetry`  
  - Wrap `fetch` with retry; map non-OK responses to thrown errors with `status`; user-friendly messages on throw.

- **`lib/prisma.ts`** — Read operations retry up to 3 times with jittered backoff on transient DB errors.

- **`hooks/useAsyncWithRetry.ts`** — Client hook: run an async fn with retry, expose `loading` / `error` / `run` / `reset`.

### Added / Wired

- **Notification email send** (`lib/notifications/NotificationDispatcher.ts`)  
  - Email delivery now uses `retryWithBackoff` (2 attempts, 500–2000 ms).  
  - On final failure the error is logged and the loop continues (in-app/SMS/push unchanged).  
  - Handles transient Resend/network outages without failing the whole dispatch.

- **In-app notifications load** (`hooks/useNotifications.ts`)  
  - Initial load and refresh use `fetchJsonWithRetry` (3 attempts, context `'notifications'`).  
  - Transient 5xx or network failures are retried; user sees a single error message only after all retries fail.

---

## 2. Fallback States

### Types (`lib/failover/types.ts`)

- **`FailoverResult<T>`**  
  - `{ ok: true, data: T, fromFallback: false }` — primary succeeded.  
  - `{ ok: true, data: T, fromFallback: true, reason?: string }` — primary failed, fallback used.  
  - `{ ok: false, error: string }` — primary and fallback both failed.

- **`FailoverState`** — `'idle' | 'loading' | 'success' | 'fallback' | 'error'` for UI.

- **`RunWithFailoverOptions<T>`** — `maxAttempts`, `baseMs`, `maxMs`, `retryable`, `fallback` (value or fn), `label`.

### Runners (`lib/failover/run-with-failover.ts`)

- **`runWithRetryAndFallback(primary, options)`**  
  - Runs `primary` with `retryWithBackoff`.  
  - On final failure runs `fallback` (value or sync/async fn) and returns `{ ok: true, data, fromFallback: true }`.  
  - If fallback throws, returns `{ ok: false, error }`.  
  - Use for external APIs or services where a fallback value or degraded result is acceptable.

- **`runWithRetryOnly(fn, options)`**  
  - Same retry, no fallback; returns `FailoverResult<T>` with `ok: false` on failure.  
  - Use when there is no sensible fallback and you want a consistent result shape.

### Messages (`lib/failover/messages.ts`)

- **`getDegradedMessage({ fallbackReason? })`** — User-facing text when showing fallback/limited data.  
- **`DEGRADED_MESSAGES`** — `showingFallback`, `serviceUnavailable`, `tryAgain`.

---

## 3. Graceful Degradation

### Server

- **Notification dispatcher** — Email send retries then degrades (log and continue); in-app and other channels still run.  
- **Deterministic AI fallback** (`lib/ai-reliability/DeterministicFallbackService.ts`) — When all AI providers fail, return deterministic-only trade analysis and a short explanation.  
- **AI fallback policy** (`lib/ai-orchestration-engine/fallback-policy.ts`) — Provider order and “deterministic-only” when no provider is available.  
- **Resend/Twilio/Push** — Already return false or catch so missing config does not crash callers (see PROMPT 326).  
- **Admin email routes** — Return 503 with a clear message when Resend is not configured instead of 500.

### Client

- **`hooks/useFailoverState.ts`**  
  - Tracks `state` (`idle` / `loading` / `success` / `fallback` / `error`) and `message`.  
  - `setFromResult(result)` drives state from a `FailoverResult` (e.g. after `runWithRetryAndFallback`).  
  - Use in components to show “Showing limited data” when `state === 'fallback'` and to show a retry or error when `state === 'error'`.

- **Error boundaries and fallbacks** — Existing `ErrorBoundary`, `ErrorFallback` with retry/reset (see error-handling deliverable).  
- **User-facing messages** — `getErrorMessage`, `getNetworkErrorMessage` (`lib/error-handling/user-messages.ts`) and `getDegradedMessage` for consistent copy.

---

## 4. Usage Examples

### Server: run with fallback

```ts
import { runWithRetryAndFallback } from '@/lib/failover'

const result = await runWithRetryAndFallback(
  () => fetchExternalFeed(),
  {
    maxAttempts: 3,
    fallback: () => [],
    label: 'external-feed',
  }
)
if (result.ok) {
  const items = result.data
  if (result.fromFallback) {
    // Log or set header: X-Data-Degraded: true
  }
}
```

### Client: UI state from failover result

```ts
import { useFailoverState } from '@/hooks/useFailoverState'

const { state, message, setLoading, setFromResult, setError } = useFailoverState()

const load = async () => {
  setLoading()
  const result = await runWithRetryAndFallback(primaryFn, { fallback: () => [] })
  setFromResult(result)
}

// In JSX: state === 'fallback' && <p>{message}</p>
//        state === 'error' && <p>{message}</p> + Retry button
```

### Client: fetch with retry (already used)

```ts
import { fetchJsonWithRetry } from '@/lib/error-handling'

const json = await fetchJsonWithRetry(url, init, { maxAttempts: 3, context: 'my-feature' })
```

---

## 5. File Summary

| Path | Purpose |
|------|--------|
| `lib/failover/types.ts` | `FailoverResult`, `FailoverState`, `RunWithFailoverOptions` |
| `lib/failover/run-with-failover.ts` | `runWithRetryAndFallback`, `runWithRetryOnly` |
| `lib/failover/messages.ts` | `getDegradedMessage`, `DEGRADED_MESSAGES` |
| `lib/failover/index.ts` | Re-exports |
| `hooks/useFailoverState.ts` | Client hook for failover/fallback UI state |
| `lib/error-handling/retry.ts` | `retryWithBackoff` (unchanged) |
| `lib/error-handling/fetch-with-retry.ts` | `fetchWithRetry`, `fetchJsonWithRetry` (unchanged) |
| `lib/notifications/NotificationDispatcher.ts` | Retry for email send |
| `hooks/useNotifications.ts` | `fetchJsonWithRetry` for load/refresh |

---

## 6. Deliverable Summary

- **Retry:** Centralized in `retryWithBackoff` and `fetchWithRetry`/`fetchJsonWithRetry`; applied to notification email send and to in-app notifications fetch.  
- **Fallback states:** `FailoverResult` and `runWithRetryAndFallback` / `runWithRetryOnly` for server flows; `useFailoverState` for client UI.  
- **Graceful degradation:** Notification dispatcher continues after email retry failure; existing AI deterministic fallback and provider order; 503 and user-friendly messages; optional degraded banner via `useFailoverState` and `getDegradedMessage`.

This provides a single failover system that can be extended to more routes and UI surfaces as needed.
