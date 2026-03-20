/**
 * Scoring template resolver facade for scoring-defaults module.
 * Delegates template/rules retrieval to the multi-sport resolver and default scoring registry.
 */
import { getScoringTemplate, getLeagueScoringRules } from '@/lib/multi-sport/ScoringTemplateResolver'
import {
  resolveDefaultScoringTemplate,
  type LeagueSettingsForScoringDefaults,
} from './ScoringDefaultsRegistry'
import type { SportType } from './types'

export type { ScoringRuleDto, ScoringTemplateDto } from '@/lib/multi-sport/ScoringTemplateResolver'

/**
 * Resolve scoring template by sport and optional format using DB template first, then in-memory defaults.
 */
export async function resolveScoringTemplate(
  sportType: SportType | string,
  formatType?: string
) {
  const resolved = resolveDefaultScoringTemplate(sportType, {
    formatType: formatType ?? undefined,
  })
  return getScoringTemplate(sportType, resolved.formatType)
}

/**
 * Resolve effective scoring rules for a league, merged with league overrides.
 */
export async function resolveLeagueScoringRules(
  leagueId: string,
  sportType: SportType | string,
  options?: {
    formatType?: string | null
    leagueSettings?: LeagueSettingsForScoringDefaults | null
  }
) {
  const resolved = resolveDefaultScoringTemplate(sportType, {
    formatType: options?.formatType ?? undefined,
    leagueSettings: options?.leagueSettings ?? null,
  })
  return getLeagueScoringRules(leagueId, sportType, resolved.formatType)
}
