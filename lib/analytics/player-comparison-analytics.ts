'use client'

type TrackArgs = {
  event: 'player_comparison_run' | 'player_comparison_open_tool' | 'player_comparison_lineup_launch'
  toolKey?: string
  path?: string
  meta?: Record<string, unknown>
}

/**
 * Fire-and-forget analytics for the AI Player Comparison / Start vs B tool.
 * Uses `toolKey: player_comparison` for platform dashboards.
 */
export function trackPlayerComparisonUsage(args: TrackArgs): void {
  if (typeof window === 'undefined') return
  const body = {
    event: args.event,
    toolKey: args.toolKey ?? 'player_comparison',
    path: args.path ?? window.location?.pathname ?? null,
    meta: {
      ...args.meta,
      ts: new Date().toISOString(),
    },
  }
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}
