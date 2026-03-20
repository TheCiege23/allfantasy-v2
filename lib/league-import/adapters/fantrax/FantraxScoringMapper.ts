import type { IExternalScoringMapper } from '../../mappers/ExternalScoringMapper'
import type { NormalizedScoring } from '../../types'
import type { FantraxImportPayload } from './types'

export const FantraxScoringMapper: IExternalScoringMapper<FantraxImportPayload> = {
  map(source) {
    if (!source.settings) return null
    if ((source.settings.scoringRules?.length ?? 0) === 0 && !source.settings.scoringType) {
      return null
    }

    return {
      scoring_format: source.settings.scoringType ?? 'custom',
      rules: (source.settings.scoringRules ?? []).map((rule) => ({
        stat_key: rule.statKey,
        points_value: rule.points,
      })),
      raw: source.settings.raw,
    } satisfies NormalizedScoring
  },
}
