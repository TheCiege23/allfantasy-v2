---
description: "Use when writing, reviewing, or fixing auth tests — unit tests, integration tests, or E2E tests for sign-up, sign-in, email verification, phone OTP, password reset, OAuth callbacks, magic links, and account linking."
name: "Auth Test Patterns"
applyTo: "__tests__/auth*, tests/auth*, e2e/auth*, __tests__/*auth*, tests/*auth*, __tests__/*sign*, tests/*sign*, __tests__/*login*, tests/*login*, __tests__/*register*, tests/*register*, __tests__/*verify*, tests/*verify*"
---

# Auth Test Patterns

## Coverage requirements per flow

Every auth flow must have at minimum:
- **Happy path**: valid inputs, correct state transitions, expected redirect or response
- **Token/code expired**: expired verification token or OTP returns `410` or descriptive error, not a crash
- **Already used**: replay of a one-time token/code is rejected with `409` or equivalent
- **Missing input**: absent required fields return `400` with a field-level error shape

## Unit tests (`__tests__/`)

- Test service classes (`EmailVerificationService`, `PhoneVerificationService`, `SignupFlowController`, etc.) in isolation with mocked Prisma client and mocked Supabase client.
- Do not mock `lib/auth.ts` NextAuth config in unit tests — test the service layer directly.
- Mock Twilio and Resend at the module boundary, not inside service methods.
- Assert on the returned value shape AND any Prisma write calls (use `toHaveBeenCalledWith`).

## Integration tests (`tests/`)

- Do not mock the Supabase client in integration tests — use the test Supabase instance.
- Do not mock Prisma in integration tests — use the test database.
- Seed required user records before each test; clean up after.
- Test full request/response cycle via `fetch` or supertest against the Next.js API route handler directly.

## E2E tests (`e2e/`)

- Use Playwright. Do not use `page.waitForTimeout` — wait for selectors or network responses.
- Test redirect destinations after auth (e.g., post-login lands on `/dashboard`, post-verify lands on `/dashboard` or profile completion).
- Test the error page (`/auth/error`) renders with a meaningful message for OAuth failures.
- For OTP/email flows, intercept outbound email/SMS at the service mock layer — do not rely on real delivery in CI.

## What not to do

- Do NOT assert on raw JWT contents — test session shape exposed by `getServerSession` or `useSession`.
- Do NOT test NextAuth internals — test behavior visible to the app (session fields, redirects, DB state).
- Do NOT import `.env` values directly in tests — use `process.env` with a `.env.test` override file.
- Do NOT skip the token-expired and already-used cases — these are the most common production bugs in auth flows.

## Error response shape

Auth API routes must return consistent error shapes. Assert against:
```ts
{ error: string, code?: string, field?: string }
```
Not against raw status codes alone.

## Rate limiting

Tests that hit rate-limited endpoints must either:
- Reset rate limit state in `beforeEach` via the test helper, or
- Space requests to avoid triggering the 10 req/60s limit, or
- Assert that the `429` response is returned correctly when the limit is intentionally exceeded.
