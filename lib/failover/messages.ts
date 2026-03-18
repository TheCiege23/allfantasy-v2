/**
 * User-facing messages for graceful degradation (failover, fallback, outage).
 */

export const DEGRADED_MESSAGES = {
  /** Shown when data is from cache/fallback after primary failed. */
  showingFallback: "Showing limited data. Some features may be unavailable. You can try again.",
  /** Shown when a service is temporarily unavailable. */
  serviceUnavailable: "Service temporarily unavailable. Please try again in a moment.",
  /** Generic retry suggestion. */
  tryAgain: "Something went wrong. Please try again.",
} as const

/**
 * Return a user-friendly message when in degraded/fallback state.
 */
export function getDegradedMessage(options?: { fallbackReason?: string }): string {
  const reason = options?.fallbackReason?.trim()
  if (reason && reason.length <= 120) {
    return `${DEGRADED_MESSAGES.showingFallback} ${reason}`
  }
  return DEGRADED_MESSAGES.showingFallback
}
