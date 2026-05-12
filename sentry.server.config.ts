/**
 * Sentry server-side SDK initialization (Next.js App Router).
 * Loaded automatically by @sentry/nextjs when withSentryConfig wraps next.config.js.
 *
 * The existing instrumentation.ts hook also calls initSentryServer() from
 * lib/error-tracking/sentry.ts — Sentry.init() is idempotent for the same DSN.
 *
 * prismaIntegration() adds DB query spans to traces so we can see which
 * Prisma calls are slow under draft-room load.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Capture 5 % of server transactions (API routes, RSC, server actions).
    tracesSampleRate: 0.05,

    // Instrument Prisma queries so slow DB calls appear in traces.
    integrations: [Sentry.prismaIntegration()],

    debug: false,
  })
}
