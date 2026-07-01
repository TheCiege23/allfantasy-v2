/**
 * Decision OS — Phase 7.8 React Adapter: default theme tokens.
 *
 * Resolves IPM semantic ColorTokens (Phase 7.0) to plain CSS color values —
 * deliberately NOT Tailwind utility classes. `sdk-runtime/react` is meant to
 * be embeddable on a partner site with no Tailwind installed at all
 * (PHASE_7_5_WIDGET_RUNTIME_BOUNDARY_ADR.md), so styling here is applied via
 * inline `style` rather than assuming any CSS framework is present.
 *
 * A white-label consumer overrides these via SDKTheme.tokens.colorTokenMap
 * (Phase 7.4) — wiring that override through the renderer is a future
 * ticket; this module is the default/fallback theme only.
 */

import type { ColorToken } from '../../../lib/decision-os/presentation/types'

export const DEFAULT_COLOR_HEX: Readonly<Record<ColorToken, string>> = {
  success: '#34d399',
  healthy: '#22d3ee',
  positive: '#2dd4bf',
  warning: '#fbbf24',
  danger: '#fb923c',
  critical: '#f87171',
  neutral: '#94a3b8',
  benchmark_above: '#34d399',
  benchmark_equal: '#22d3ee',
  benchmark_below: '#f87171',
  accent: '#67e8f9',
  surface: 'rgba(255,255,255,0.06)',
  surface_elevated: 'rgba(255,255,255,0.1)',
  muted: 'rgba(255,255,255,0.4)',
}

export function resolveColorTokenHex(token: ColorToken): string {
  return DEFAULT_COLOR_HEX[token]
}
