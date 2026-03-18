# PROMPT 280 — Error Handling System Deliverable

## Objective

Handle all errors cleanly: user-friendly messages, retry logic, fallback UI, and logging.

---

## 1. User-friendly messages

**`lib/error-handling/user-messages.ts`**

- **`USER_FRIENDLY_MESSAGES`** — Map of HTTP status codes (400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503) to short, non-technical copy.
- **`getErrorMessage(error, options?)`** — Returns a safe, user-facing string:
  - Uses server-provided message when it looks safe (no raw "GET /api/... failed (500)").
  - Falls back to status-code message, then to a generic "Something went wrong. Please try again."
- **`getNetworkErrorMessage()`** — "We couldn't reach the server. Check your connection and try again." for fetch/network failures.

Use `getErrorMessage` in UI and toasts; use `getNetworkErrorMessage` when you know the failure was network-related.

---

## 2. Retry logic

**`lib/error-handling/retry.ts`**

- **`retryWithBackoff(fn, options?)`** — Runs an async function with exponential backoff.
  - Options: `maxAttempts` (default 3), `baseMs` (800), `maxMs` (8000), `retryable` (predicate).
  - Default `retryable`: 408, 429, 5xx, and network/fetch-like errors.

**`lib/error-handling/fetch-with-retry.ts`**

- **`fetchWithRetry(input, init?, options?)`** — Same as `fetch`, but retries on transient failures (408, 429, 500, 502, 503). Throws an `Error` with a **user-friendly** message (from `getErrorMessage`).
- **`fetchJsonWithRetry<T>(input, init?, options?)`** — Calls `fetchWithRetry`, then `res.json()`. Returns typed `T` or throws with a user message.

Use these instead of raw `fetch` when you want automatic retries and consistent error copy. **Wired in:** `useLeagueList`, `useTokenBalance` use `fetchWithRetry` and surface user-friendly errors + logging.

---

## 3. Fallback UI

**`components/error-handling/`**

- **`ErrorFallback`** — Card-style UI showing:
  - Title (default: "Something went wrong")
  - Message from `getErrorMessage(error)`
  - "Try again" button when `resetErrorBoundary` is provided (`min-h-[44px]`, `touch-manipulation` for mobile).
- **`ErrorBoundary`** — React class component that catches render errors in the tree, logs them, and renders `ErrorFallback` (or a custom `fallback` prop) with a "Try again" that resets the boundary.
- **`ErrorBoundaryClient`** — Client wrapper that renders `ErrorBoundary` around its children.

**Wiring:** Root layout wraps the main `{children}` in `<ErrorBoundaryClient>` so any uncaught render error in the app shows the fallback and a retry action instead of a blank or crashed screen.

**Section-level:** Dashboard content (`FinalDashboardClient`) is wrapped in `<ErrorBoundary>`. For other sections, wrap in `<ErrorBoundary>` or use the hook and render `<ErrorFallback error={...} resetErrorBoundary={...} />` when `error` is set.

---

## 4. Logging

**`lib/error-handling/logger.ts`**

- **`logError(error, ctx?)`** — Central logging for client and server.
  - In development: logs to `console.error` with context.
  - Context type: `ErrorLogContext` (`context`, `userId`, `leagueId`, `path`, `status`, etc.).
  - Can be extended later to send to an error service (e.g. Sentry).

Use `logError` whenever you handle an error and want it recorded (e.g. in catch blocks, in `ErrorBoundary.componentDidCatch`).

---

## 5. Hook: useAsyncWithRetry

**`hooks/useAsyncWithRetry.ts`**

- **`useAsyncWithRetry<T>(options?)`** — Returns `{ data, error, loading, run, reset }`.
- **`run(asyncFn)`** — Runs the given async function with retry, sets `data` or `error` (user-friendly string), and toggles `loading`.
- **`reset()`** — Clears `data` and `error`.

Example:

```ts
const { data, error, loading, run } = useAsyncWithRetry({ context: 'draft-session' })
// later:
await run(async () => {
  const res = await fetch(`/api/leagues/${leagueId}/draft/session`)
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
})
// error is a user-friendly string; show it in UI or toast
```

---

## Files added / updated

| Path | Purpose |
|------|--------|
| `lib/error-handling/user-messages.ts` | Status → copy, getErrorMessage, getNetworkErrorMessage |
| `lib/error-handling/logger.ts` | logError(error, context) |
| `lib/error-handling/retry.ts` | retryWithBackoff |
| `lib/error-handling/fetch-with-retry.ts` | fetchWithRetry, fetchJsonWithRetry; **500** added to retryable statuses |
| `lib/error-handling/index.ts` | Re-exports |
| `components/error-handling/ErrorFallback.tsx` | Fallback UI; Try again button 44px + touch-manipulation |
| `components/error-handling/ErrorBoundary.tsx` | React error boundary |
| `components/error-handling/ErrorBoundaryClient.tsx` | Client wrapper for layout |
| `components/error-handling/index.ts` | Re-exports |
| `hooks/useAsyncWithRetry.ts` | Hook with retry + user error state |
| `hooks/useLeagueList.ts` | Uses fetchWithRetry, getErrorMessage, logError; returns error + refetch |
| `hooks/useTokenBalance.ts` | Uses fetchWithRetry, getErrorMessage, logError; returns error + refetch |
| `components/dashboard/FinalDashboardClient.tsx` | Section ErrorBoundary; leagues error fallback + Try again; tokens Retry |
| `app/layout.tsx` | Wraps children in ErrorBoundaryClient |

---

## Usage summary

- **API / fetch:** Prefer `fetchWithRetry` or `fetchJsonWithRetry` for automatic retries and user-facing errors. Catch and show `getErrorMessage(e)` in UI or toasts. **Example:** `useLeagueList` and `useTokenBalance` use `fetchWithRetry` and surface errors with retry (refetch).
- **Async in components:** Use `useAsyncWithRetry` and pass your async function to `run()`; show `error` in the UI and use `reset` to clear. For hooks that fetch once (e.g. league list), use `fetchWithRetry` in the hook and expose `error` + `refetch`; render fallback UI with "Try again" calling `refetch`.
- **Render crashes:** Root `ErrorBoundaryClient` in layout catches app-wide errors. Dashboard uses a section-level `<ErrorBoundary>` so dashboard render errors show fallback + "Try again" without crashing the shell.
- **Logging:** Call `logError(error, { context: '...', path, status })` in catch blocks and in error boundaries so all errors are recorded in one place. Used in `useLeagueList`, `useTokenBalance`, `ErrorBoundary.componentDidCatch`, and `fetchWithRetry` on final failure.
