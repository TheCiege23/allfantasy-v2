/**
 * ChimmyResponseFormatter — format API response for display: confidence, tool links, clarity.
 */

import type { ChimmyConfidenceDisplay } from './types'

/**
 * Parse confidence from API response (e.g. quantData.confidencePct or top-level confidencePct).
 */
export function parseConfidenceFromResponse(response: {
  confidencePct?: number
  quantData?: { confidencePct?: number }
}): ChimmyConfidenceDisplay | null {
  const pct = response.confidencePct ?? response.quantData?.confidencePct
  if (pct == null || typeof pct !== 'number') return null
  const label =
    pct >= 75 ? 'High' : pct >= 50 ? 'Medium' : pct >= 25 ? 'Low' : 'Very low'
  return { confidencePct: Math.min(100, Math.max(0, pct)), label }
}

/**
 * Format confidence for inline display (e.g. "Confidence: 72% (Medium)").
 */
export function formatConfidenceInline(display: ChimmyConfidenceDisplay): string {
  if (display.confidencePct == null) return ''
  const label = display.label ? ` (${display.label})` : ''
  return `Confidence: ${display.confidencePct}%${label}`
}
