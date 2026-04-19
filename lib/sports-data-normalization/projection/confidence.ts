import type { ProjectionConfidenceBand } from '@/lib/sports-data-normalization/types'

export function confidenceFromSources(args: {
  hasWeeklyProjection: boolean
  hasSeasonFppg: boolean
  hasDbProjection: boolean
  hasClearSports: boolean
}): { score: number | null; band: ProjectionConfidenceBand | null } {
  let pts = 0
  if (args.hasWeeklyProjection) pts += 45
  if (args.hasSeasonFppg) pts += 25
  if (args.hasDbProjection) pts += 15
  if (args.hasClearSports) pts += 15
  if (pts === 0) return { score: null, band: null }
  const score = Math.min(100, pts)
  const band: ProjectionConfidenceBand = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  return { score, band }
}
