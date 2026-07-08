import type { PulseCategory } from '@/lib/platform-pulse'

/**
 * Dashboard V2 Phase 4A — semantic color grammar (single source of truth).
 *
 * The dashboard speaks one small, deliberate color language instead of hand-rolled
 * per-component classes. Two axes coexist, each answering a different question:
 *
 *   1. CATEGORY grammar — "what kind of intelligence is this?" (the four Platform
 *      Pulse intents). Color IS the meaning:
 *        Predict = blue · Monitor = amber · Recommend = emerald · Explain = purple
 *   2. STATUS tone — "how is this metric/state doing?" (KPIs, health chips):
 *        positive = emerald · caution = amber · critical = red · neutral = white
 *
 * A third, separate axis — per-context IDENTITY (Global cyan / Commissioner amber /
 * Team emerald, `CONTEXT_ACCENT` in `SectionHeading`) — is intentionally NOT folded
 * in here: it answers "which dashboard am I on?", not "what does this mean?".
 *
 * Kept to four category colors + four status tones on purpose — enough to be
 * meaningful, never rainbow. All values are translucent surfaces + light text so
 * they stay legible on the fixed dark command-center canvas (AA in both themes).
 */

export type CategoryStyle = {
  /** Pill badge — translucent surface + text. */
  badge: string
  /** Square/rounded icon tile — surface + icon color. */
  iconTile: string
  /** Solid accent bar / left rail. */
  bar: string
  /** Small solid status dot. */
  dot: string
  /** `WarRoomCard` accent-border color (rgba). */
  border: string
}

/** The four Platform Pulse categories → their grammar colors. Color == meaning. */
export const PULSE_CATEGORY: Record<PulseCategory, CategoryStyle> = {
  Predict: {
    badge: 'bg-blue-500/15 text-blue-300',
    iconTile: 'bg-blue-500/15 text-blue-300',
    bar: 'bg-blue-400',
    dot: 'bg-blue-400',
    border: 'rgba(59,130,246,0.22)',
  },
  Monitor: {
    badge: 'bg-amber-500/15 text-amber-300',
    iconTile: 'bg-amber-500/15 text-amber-300',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
    border: 'rgba(245,158,11,0.22)',
  },
  Recommend: {
    badge: 'bg-emerald-500/15 text-emerald-300',
    iconTile: 'bg-emerald-500/15 text-emerald-300',
    bar: 'bg-emerald-400',
    dot: 'bg-emerald-400',
    border: 'rgba(16,185,129,0.22)',
  },
  Explain: {
    // "purple" in the grammar — rendered with Tailwind's violet ramp to preserve the
    // established Platform Pulse briefing accent (rgba(139,92,246)).
    badge: 'bg-violet-500/15 text-violet-300',
    iconTile: 'bg-violet-500/15 text-violet-300',
    bar: 'bg-violet-400',
    dot: 'bg-violet-400',
    border: 'rgba(139,92,246,0.22)',
  },
}

export type StatusTone = 'positive' | 'caution' | 'critical' | 'neutral'

/** Big-number / label text color for a status (hero KPI strips, scores). */
export const STATUS_TEXT: Record<StatusTone, string> = {
  positive: 'text-emerald-300',
  caution: 'text-amber-300',
  critical: 'text-red-300',
  neutral: 'text-white',
}

/** Pill/badge surface for a status (Command Center health/state chips). */
export const STATUS_BADGE: Record<StatusTone, string> = {
  positive: 'bg-emerald-500/15 text-emerald-300',
  caution: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-red-500/15 text-red-300',
  neutral: 'bg-white/10 text-white/70',
}

/**
 * League-health scale — a finer 6-level grade than the four status tones, kept
 * intact because the extra steps (excellent vs healthy, at-risk vs critical) carry
 * real meaning in the Command Center. Centralized here so the badge classes live in
 * one place instead of being re-declared per component (values unchanged).
 */
export type HealthGrade = 'excellent' | 'healthy' | 'watch' | 'at_risk' | 'critical' | 'unknown'

export const HEALTH_BADGE: Record<HealthGrade, string> = {
  excellent: 'bg-emerald-500/15 text-emerald-300',
  healthy: 'bg-emerald-500/10 text-emerald-300/90',
  watch: 'bg-amber-500/15 text-amber-300',
  at_risk: 'bg-orange-500/15 text-orange-300',
  critical: 'bg-red-500/15 text-red-300',
  unknown: 'bg-white/[0.06] text-white/40',
}

/** Value-graded accent (hex) for composite health gauges — emerald → amber → red. */
export function healthAccentHex(score: number): string {
  if (score >= 75) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}
