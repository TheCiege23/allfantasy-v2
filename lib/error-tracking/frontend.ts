/**
 * Frontend error tracking: global handlers for uncaught errors and unhandled rejections.
 * Call initFrontendErrorTracking() once from the client root (e.g. layout client wrapper).
 */

import { captureException } from './capture'

let initialized = false

export function initFrontendErrorTracking(): void {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  window.addEventListener('error', (event) => {
    const err = event.error ?? new Error(event.message ?? 'Unknown error')
    captureException(err, {
      context: 'window.error',
      path: window.location?.pathname,
      tags: { source: 'window' },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    captureException(err, {
      context: 'unhandledrejection',
      path: window.location?.pathname,
      tags: { source: 'promise' },
    })
    // Do not preventDefault so the console still shows the rejection
  })
}
