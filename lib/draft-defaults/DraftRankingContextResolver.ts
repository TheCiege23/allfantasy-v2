/**
 * Resolves pre-draft ranking source and context for AI draft assistant and queue.
 * Sport- and variant-aware so suggestions use correct ADP/ECR/tiers for the league.
 */
import { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface DraftRankingContext {
  pre_draft_ranking_source: string
  contextLabel: string
  sport: string
  variant: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  adp: 'ADP',
  ecr: 'ECR',
  projections: 'Projections',
  tiers: 'Tiers',
  custom: 'Custom',
  sport_default: 'Sport default',
}

/**
 * Get ranking context for draft room and AI suggestions.
 * Used to display "Ranked by ADP" / "Ranked by ECR" and to pass to AI draft assistant.
 */
export function getDraftRankingContext(sport: string, variant?: string | null): DraftRankingContext {
  const sportType = toSportType(sport) as SportType
  const draft = getDraftDefaults(sportType, variant ?? undefined)
  const source = draft.pre_draft_ranking_source ?? 'adp'
  const contextLabel = SOURCE_LABELS[source] ?? source

  return {
    pre_draft_ranking_source: source,
    contextLabel,
    sport,
    variant: variant ?? null,
  }
}
