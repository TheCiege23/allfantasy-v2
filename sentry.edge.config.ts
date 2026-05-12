/**
 * Sentry edge-runtime SDK initialization (Next.js middleware / edge API routes).
 * Loaded automatically by @sentry/nextjs when withSentryConfig wraps next.config.js.
 *
 * Tracing is disabled on edge (0 %) — middleware runs on every request and the
 * overhead outweighs the signal. Errors are still captured.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    debug: false,
  })
}
