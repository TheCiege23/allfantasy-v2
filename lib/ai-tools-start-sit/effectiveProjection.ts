import type { NormalizedPlayerSportsProfile } from '@/lib/sports-data-normalization/types'

/**
 * Single ordering for Start/Sit display: injury-adjusted → weather-adjusted → scoring-adjusted → raw provider.
 * All values originate from `resolveNormalizedPlayerSportsProfiles` (no invented stats).
 */
export function effectiveFantasyPoints(prof: NormalizedPlayerSportsProfile | undefined): number | null {
  if (!prof) return null
  const p = prof.projection
  const inj = p.injuryNews?.adjustedPoints
  const wx = p.weatherAdjustedProjection
  const score = p.scoringRuleAdjustedProjection
  const base = p.projectedFantasyPoints
  const chain = [inj, wx, score, base]
  for (const v of chain) {
    if (v != null && Number.isFinite(v)) return v
  }
  return null
}

export function collectProjectionNotes(prof: NormalizedPlayerSportsProfile | undefined): string[] {
  if (!prof) return []
  const out: string[] = []
  const p = prof.projection
  if (p.injuryNews?.material) {
    out.push(
      `Injury/news multiplier ${p.injuryNews.multiplier?.toFixed(2) ?? '?'} → ${p.injuryNews.adjustedPoints?.toFixed(1) ?? '?'} pts (canonical: ${p.injuryNews.canonicalStatus}).`,
    )
  }
  if (p.weatherAdjustedProjection != null && p.weatherImpactReason) {
    out.push(`Weather: ${p.weatherSummary ?? p.weatherImpactReason}`)
  }
  if (p.scoringNotes?.length) out.push(...p.scoringNotes.slice(0, 2))
  if (prof.injuryNewsLayer?.conflict) {
    out.push(`Injury source conflict: ${prof.injuryNewsLayer.conflictDetail ?? 'review multiple reports'}`)
  }
  return out
}
