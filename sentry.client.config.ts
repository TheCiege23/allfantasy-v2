/**
 * Sentry client-side SDK initialization (Next.js App Router).
 * Loaded automatically by @sentry/nextjs when withSentryConfig wraps next.config.js.
 *
 * The existing ErrorTrackingInit component calls initSentryClient() from
 * lib/error-tracking/sentry.ts as well — Sentry.init() is idempotent for the
 * same DSN so double-init is harmless.
 *
 * Keep sample rates conservative: client tracing at 5 % is sufficient to catch
 * performance regressions without overwhelming the Sentry quota.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Capture 5 % of pageload/navigation transactions for performance monitoring.
    tracesSampleRate: 0.05,

    // 100 % of sessions that already have an error get a replay recorded.
    replaysOnErrorSampleRate: 1.0,
    // 1 % of all sessions get a replay (baseline).
    replaysSessionSampleRate: 0.01,

    // Don't flood the console in development.
    debug: false,
  })
}
