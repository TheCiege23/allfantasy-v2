'use client'

/**
 * Phase 3B.2 — Developer/admin debug surface for the Chimmy intelligence
 * dashboard rail. Gated by `NEXT_PUBLIC_CHIMMY_INTELLIGENCE_DEBUG=1`.
 *
 * Renders a collapsed `<details>` containing:
 *   - meta.durationMs
 *   - canary {reason, eligible, rolloutBucket}
 *   - per-provider {name, ok, cached, durationMs}
 *   - cards summary (id × severity)
 *
 * Read-only. No PII. Never fetches on its own — consumes the same response
 * the rail already loaded.
 */

import type { DashboardIntelligenceCard } from '@/lib/chimmy-context/dashboard/contracts'

export type DebugProviderMeta = {
  name: string
  ok: boolean
  cached: boolean
  durationMs: number
}

export type DebugCanaryMeta = {
  eligible: boolean
  reason: string
  rolloutBucket: number | null
  /** Phase 5 — compact cohort label, e.g. "internal_allowlist" or "canary_5pct". */
  cohortLabel?: string | null
}

export type DebugForceRefreshMeta = {
  requested: boolean
  applied: boolean
  throttled: boolean
}

export type DashboardIntelligenceDebugPanelProps = {
  durationMs: number | null
  canary: DebugCanaryMeta | null
  providers: ReadonlyArray<DebugProviderMeta>
  cards: ReadonlyArray<DashboardIntelligenceCard>
  generatedAt: string | null
  /** Phase 5 — additive operational diagnostics. All optional. */
  forceRefresh?: DebugForceRefreshMeta | null
  cacheStatus?: 'hit' | 'miss' | 'stale' | null
  lastRefreshReason?: string | null
  invalidationSource?: string | null
  /** Phase 6A — rolling 60s invalidation count (this tab only). */
  recentInvalidationCount?: number | null
}

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_CHIMMY_INTELLIGENCE_DEBUG === '1'

export function DashboardIntelligenceDebugPanel(
  props: DashboardIntelligenceDebugPanelProps
) {
  if (!DEBUG_ENABLED) return null
  const {
    durationMs,
    canary,
    providers,
    cards,
    generatedAt,
    forceRefresh,
    cacheStatus,
    lastRefreshReason,
    invalidationSource,
    recentInvalidationCount,
  } = props
  // Phase 6A — "intelligence active" indicator: are we actually injecting,
  // or is the user seeing the legacy/no-engine baseline?
  const intelligenceActive = Boolean(canary?.eligible)
  const cohortDisplay = canary?.cohortLabel ?? (canary?.eligible ? 'on' : 'off')
  return (
    <details
      className="mt-3 rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-[11px] text-white/70"
      data-testid="dashboard-intelligence-debug"
    >
      <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-[0.08em] text-white/50">
        intelligence debug
      </summary>
      <div className="mt-2 space-y-2 font-mono">
        <div
          className={
            intelligenceActive
              ? 'inline-flex items-center gap-1.5 rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-200'
              : 'inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/55'
          }
          data-testid="intelligence-rollout-status"
          data-active={intelligenceActive ? '1' : '0'}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              intelligenceActive ? 'bg-emerald-300' : 'bg-white/40'
            }`}
            aria-hidden
          />
          {intelligenceActive ? 'chimmy intelligence' : 'legacy / off'}
          <span className="ml-1 text-white/45">cohort={cohortDisplay}</span>
        </div>
        <div>
          <span className="text-white/40">duration:</span>{' '}
          {typeof durationMs === 'number' ? `${durationMs}ms` : '—'}
          {generatedAt ? <span className="ml-3 text-white/40">gen:</span> : null}
          {generatedAt ? ` ${generatedAt}` : null}
        </div>
        <div>
          <span className="text-white/40">canary:</span>{' '}
          {canary
            ? `${canary.reason} (eligible=${String(canary.eligible)}, bucket=${
                canary.rolloutBucket ?? '—'
              })`
            : '—'}
          {canary?.cohortLabel ? (
            <span className="ml-2 text-white/40">
              cohort=<span className="text-white/70">{canary.cohortLabel}</span>
            </span>
          ) : null}
        </div>
        <div>
          <span className="text-white/40">refresh:</span>{' '}
          {lastRefreshReason ?? '—'}
          {invalidationSource ? (
            <span className="ml-3 text-white/40">
              via=<span className="text-white/70">{invalidationSource}</span>
            </span>
          ) : null}
          {cacheStatus ? (
            <span className="ml-3 text-white/40">
              cache=<span className="text-white/70">{cacheStatus}</span>
            </span>
          ) : null}
          {forceRefresh ? (
            <span className="ml-3 text-white/40">
              force=
              <span className="text-white/70">
                {forceRefresh.requested ? '1' : '0'}/
                {forceRefresh.applied ? 'apply' : 'skip'}
                {forceRefresh.throttled ? '/throttled' : ''}
              </span>
            </span>
          ) : null}
          {typeof recentInvalidationCount === 'number' &&
          recentInvalidationCount > 0 ? (
            <span className="ml-3 text-white/40">
              invalidations60s=
              <span
                className={
                  recentInvalidationCount >= 10
                    ? 'text-rose-300'
                    : 'text-white/70'
                }
              >
                {recentInvalidationCount}
              </span>
            </span>
          ) : null}
        </div>
        <div>
          <p className="text-white/40">providers ({providers.length}):</p>
          {providers.length === 0 ? (
            <p className="pl-2 text-white/30">none</p>
          ) : (
            <ul className="space-y-0.5 pl-2">
              {providers.map((p) => (
                <li key={p.name}>
                  {p.name} — ok={String(p.ok)} cached={String(p.cached)}{' '}
                  {p.durationMs}ms
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-white/40">cards ({cards.length}):</p>
          {cards.length === 0 ? (
            <p className="pl-2 text-white/30">none</p>
          ) : (
            <ul className="space-y-0.5 pl-2">
              {cards.map((c) => (
                <li key={c.id}>
                  {c.id} [{c.severity}]
                  {c.bullets.length > 0 ? ` +${c.bullets.length}b` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </details>
  )
}

export default DashboardIntelligenceDebugPanel
