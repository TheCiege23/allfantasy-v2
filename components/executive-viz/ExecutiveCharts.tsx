/**
 * Fantasy OS Suite — Phase V2.1: Executive Visualization Engine chart primitives.
 *
 * Reusable data-mark primitives shared by the Commissioner OS supporting visualizations. Added here
 * (rather than inline in one card) because each is used by more than one visualization:
 *   - `ExecutiveHorizontalBars` — Manager Attention, League Health Breakdown, Commissioner Workload.
 *   - `ExecutiveProgressRing` — League Readiness (three rings).
 *
 * Same discipline as V2.0: colors come from `executiveVizTokens.ts` (Visual OS `status-*` semantics, no
 * raw hue/hex); bar/ring fill is rendered DIRECTLY at its correct value (never gated behind an animation
 * or effect, which freeze in hidden/background tabs), so the data is always visible; motion is limited to
 * non-hiding CSS transitions that honor `motion-reduce:*`.
 */
import { cn } from '@/lib/utils'
import type { ExecutiveHealthStatus } from '@/lib/executive-viz/commissionerLeagueHealthViewModel'
import { EXECUTIVE_STATUS_BAR, EXECUTIVE_STATUS_LABEL } from './executiveVizTokens'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Status → SVG stroke color. Uses the `text-status-*` tokens (which resolve correctly, unlike the
 * `/opacity` shorthand) with `stroke="currentColor"`. */
const EXECUTIVE_STATUS_STROKE: Record<ExecutiveHealthStatus, string> = {
  excellent: 'text-status-success',
  healthy: 'text-status-success',
  watch: 'text-status-warning',
  at_risk: 'text-status-danger',
  critical: 'text-status-danger',
  unavailable: 'text-muted',
}

export type ExecutiveBarItem = {
  key: string
  label: string
  value: number
  /** Per-item scale ceiling. When omitted the whole group shares one max (see `scaleMax`). */
  max?: number
  status: ExecutiveHealthStatus
  /** The honest underlying figure shown as text. Defaults to the raw value. */
  valueLabel?: string
}

/**
 * A ranked set of horizontal readiness bars. Works for both count data (a shared `scaleMax`) and 0–100
 * score data (`max: 100` per item). Each bar is an accessible `meter`.
 */
export function ExecutiveHorizontalBars({
  items,
  scaleMax,
}: {
  items: ExecutiveBarItem[]
  /** Shared ceiling for count-style bars. Ignored for items that carry their own `max`. */
  scaleMax?: number
}) {
  const groupMax = scaleMax ?? Math.max(1, ...items.map((i) => i.max ?? i.value))
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const max = item.max ?? groupMax
        const pct = max > 0 ? clamp((item.value / max) * 100, 0, 100) : 0
        const valueText = item.valueLabel ?? String(item.value)
        return (
          <li key={item.key} data-testid={`executive-bar-${item.key}`} data-status={item.status}>
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[12px] font-semibold text-secondary">{item.label}</span>
              <span className="shrink-0 text-[12px] font-bold text-primary">{valueText}</span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted"
              role="meter"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.label}: ${valueText} (${EXECUTIVE_STATUS_LABEL[item.status]})`}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
                  EXECUTIVE_STATUS_BAR[item.status],
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A single circular progress ring. `strokeDashoffset` is a static inline style, so the ring always
 * renders at its correct value regardless of tab visibility; the transition is pure enhancement.
 */
export function ExecutiveProgressRing({
  value,
  max = 100,
  status,
  label,
  valueLabel,
  size = 72,
}: {
  value: number
  max?: number
  status: ExecutiveHealthStatus
  label: string
  valueLabel?: string
  size?: number
}) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  const valueText = valueLabel ?? `${Math.round(pct)}%`
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${valueText} (${EXECUTIVE_STATUS_LABEL[status]})`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            className="text-surface-muted"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />
          <circle
            className={cn(EXECUTIVE_STATUS_STROKE[status], 'transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none')}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[14px] font-black text-primary">{valueText}</span>
        </div>
      </div>
      <span className="text-center text-[11px] font-semibold text-secondary">{label}</span>
    </div>
  )
}
