import {
  getDefaultScoringPresetId,
  isScoringPresetValidForContext,
  listScoringPresetOptions,
} from '../lib/league-creation-preset/scoring-presets'

const ctx = {
  leagueType: 'survivor',
  sport: 'NFL',
  idpSelected: false,
} as const

console.log(
  JSON.stringify(
    {
      valid: isScoringPresetValidForContext('fb_half_ppr', ctx),
      defaultPreset: getDefaultScoringPresetId(ctx),
      options: listScoringPresetOptions(ctx).map((option) => option.id),
    },
    null,
    2,
  ),
)
