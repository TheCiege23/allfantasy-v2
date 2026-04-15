import type { LeagueSport } from '@prisma/client'

/** Tuners for PickScore sub-weights — deterministic-first; AI narrates on top. */
export function getSportAdapterWeights(sport: LeagueSport): {
  adpWeight: number
  needWeight: number
} {
  switch (sport) {
    case 'NBA':
    case 'NCAAB':
      return { adpWeight: 0.95, needWeight: 1.08 }
    case 'MLB':
      return { adpWeight: 1.0, needWeight: 1.05 }
    case 'NHL':
      return { adpWeight: 1.02, needWeight: 1.04 }
    case 'SOCCER':
      return { adpWeight: 0.98, needWeight: 1.06 }
    case 'NCAAF':
    case 'NFL':
    default:
      return { adpWeight: 1.0, needWeight: 1.0 }
  }
}
