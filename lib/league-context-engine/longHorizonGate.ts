import type { NormalizedLeagueContext } from '@/lib/league-context-engine/types'

/**
 * True when the league format has a multi-year horizon worth analyzing —
 * dynasty, keeper, devy, or contract-to-contract. Gating `includeStrategicCoaching`
 * on this avoids running `buildLongTermCoachingAnalysis` (a 3-year snapshot)
 * for redraft, best-ball, guillotine, or survivor leagues where it isn't actionable.
 *
 * Pure `league context` → `boolean`; no I/O, safe to call anywhere the
 * NormalizedLeagueContext is already resolved.
 */
export function leagueWantsLongHorizon(ctx: NormalizedLeagueContext | null | undefined): boolean {
  if (!ctx) return false
  const f = ctx.flags
  if (!f) return false
  if (f.bestBallMode) return false
  if (f.guillotineMode) return false
  if (f.survivorMode) return false
  return Boolean(f.isDynasty || f.isKeeper || f.isDevy || f.isC2C)
}
