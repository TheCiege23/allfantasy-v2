import type { CanonicalInjuryStatus } from '@/lib/news-injury-aggregation/types'

/**
 * Multiplier applied to baseline projected points from real provider data.
 * Conservative, deterministic; does not invent point totals.
 */
export function projectionMultiplierForStatus(status: CanonicalInjuryStatus): number {
  switch (status) {
    case 'out':
    case 'ir':
    case 'suspended':
      return 0.05
    case 'doubtful':
      return 0.35
    case 'questionable':
      return 0.72
    case 'personal':
      return 0.55
    case 'probable':
      return 0.92
    case 'active':
      return 1
    case 'unknown':
    default:
      return 1
  }
}

export function isMaterialProjectionImpact(multiplier: number): boolean {
  return multiplier < 0.98
}
