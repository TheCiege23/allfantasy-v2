/**
 * ChimmyConfidenceRenderer — UI guidance for rendering confidence in Chimmy responses.
 * Use in chat bubbles to show confidence only when applicable and in a calm, clear way.
 */

import type { ChimmyConfidenceDisplay } from './types'
import { parseConfidenceFromResponse, formatConfidenceInline } from './ChimmyResponseFormatter'

export type ConfidenceRenderMode = 'inline' | 'badge' | 'hidden'

/**
 * Decide whether to show confidence in the UI (only when we have a value and it adds value).
 */
export function shouldShowConfidence(display: ChimmyConfidenceDisplay | null): boolean {
  if (!display) return false
  if (display.confidencePct == null) return false
  return true
}

/**
 * Get display text for confidence (for inline or tooltip).
 */
export function getConfidenceDisplayText(display: ChimmyConfidenceDisplay): string {
  return formatConfidenceInline(display)
}

/**
 * Parse API response and return confidence display if present.
 */
export function getConfidenceFromApiResponse(response: {
  confidencePct?: number
  quantData?: { confidencePct?: number }
}): ChimmyConfidenceDisplay | null {
  return parseConfidenceFromResponse(response)
}
