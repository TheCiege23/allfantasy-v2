/**
 * Central capture for all errors. Calls logError and optionally Sentry.
 * Use from frontend and backend.
 */

import { logError, type ErrorLogContext } from '@/lib/error-handling'

export type CaptureContext = ErrorLogContext & {
  /** Frontend: tag for grouping (e.g. 'api_failure', 'ai_failure') */
  tags?: Record<string, string>
}

let sentryCapture: ((error: unknown, ctx?: CaptureContext) => void) | null = null

/**
 * Register a custom reporter (e.g. Sentry). Called once at app init.
 */
export function setErrorReporter(fn: (error: unknown, ctx?: CaptureContext) => void): void {
  sentryCapture = fn
}

/**
 * Capture an error: log locally and send to reporter if configured.
 */
export function captureException(error: unknown, ctx?: CaptureContext): void {
  const context: ErrorLogContext = ctx
    ? { ...ctx, tags: undefined }
    : { context: 'app' }
  logError(error, context)
  try {
    sentryCapture?.(error, ctx)
  } catch {
    // Reporter must not throw
  }
}
