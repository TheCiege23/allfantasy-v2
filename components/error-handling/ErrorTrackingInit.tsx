'use client'

import { useEffect } from 'react'
import { initFrontendErrorTracking, initSentryClient } from '@/lib/error-tracking'

/**
 * Initializes global error tracking (window.error, unhandledrejection) and optional Sentry.
 * Mount once in the root layout inside a client boundary.
 */
export function ErrorTrackingInit() {
  useEffect(() => {
    initFrontendErrorTracking()
    initSentryClient()
  }, [])
  return null
}
