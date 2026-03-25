/**
 * Optional Sentry integration. When SENTRY_DSN (server) or NEXT_PUBLIC_SENTRY_DSN (client)
 * is set and @sentry/nextjs is installed, errors are sent to Sentry.
 *
 * To enable:
 * 1. npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN and/or SENTRY_DSN
 * 3. In app layout (client), call initSentryClient() after initFrontendErrorTracking
 * 4. In instrumentation.ts (or server entry), call initSentryServer()
 *
 * This module provides no-op stubs when Sentry is not installed.
 */

import { setErrorReporter } from './capture'

type SentryCapture = (error: unknown, ctx?: Record<string, unknown>) => void
type SentryModuleLike = {
  init: (options: Record<string, unknown>) => void
  captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => void
}

let clientInitDone = false
let serverInitDone = false
let sentryLoadPromise: Promise<SentryModuleLike | null> | null = null

function loadOptionalSentryModule(): Promise<SentryModuleLike | null> {
  if (sentryLoadPromise) return sentryLoadPromise

  sentryLoadPromise = (async () => {
    try {
      // Avoid static module analysis so optional Sentry does not trigger bundler warnings when unused.
      const dynamicImport = new Function(
        'specifier',
        'return import(specifier)'
      ) as (specifier: string) => Promise<unknown>
      const mod = await dynamicImport('@sentry/nextjs')
      const candidate = (mod as { default?: unknown }).default ?? mod
      const sentry = candidate as Partial<SentryModuleLike>
      if (typeof sentry.init !== 'function' || typeof sentry.captureException !== 'function') {
        return null
      }
      return sentry as SentryModuleLike
    } catch {
      return null
    }
  })()

  return sentryLoadPromise
}

/**
 * Initialize Sentry on the client. Call once from a client root (e.g. layout wrapper).
 * No-op if NEXT_PUBLIC_SENTRY_DSN is not set or Sentry is not installed.
 */
export function initSentryClient(): void {
  if (clientInitDone || typeof window === 'undefined') return
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn?.trim()) return
  clientInitDone = true
  void (async () => {
    const Sentry = await loadOptionalSentryModule()
    if (!Sentry) return
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 0.1,
    })
    const capture: SentryCapture = (error, ctx) => {
      Sentry.captureException(error, { extra: ctx })
    }
    setErrorReporter(capture)
  })()
}

/**
 * Initialize Sentry on the server. Call from instrumentation.ts or server entry.
 * No-op if SENTRY_DSN is not set or Sentry is not installed.
 */
export function initSentryServer(): void {
  if (serverInitDone || typeof window !== 'undefined') return
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn?.trim()) return
  serverInitDone = true
  void (async () => {
    const Sentry = await loadOptionalSentryModule()
    if (!Sentry) return
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    })
    const capture: SentryCapture = (error, ctx) => {
      Sentry.captureException(error, { extra: ctx })
    }
    setErrorReporter(capture)
  })()
}
