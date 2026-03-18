'use client'

import { ErrorBoundary } from './ErrorBoundary'

/**
 * Client wrapper that wraps children in an ErrorBoundary.
 * Use in root or segment layouts to catch render errors and show a fallback.
 */
export function ErrorBoundaryClient({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
