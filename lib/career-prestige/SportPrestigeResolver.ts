/**
 * SportPrestigeResolver — sport normalization and labels for the career prestige layer.
 * Re-exports from prestige-governance / sport-scope for single import.
 */

import {
  normalizeSportForPrestige,
  getPrestigeSportLabel,
  PRESTIGE_SUPPORTED_SPORTS,
  isSupportedPrestigeSport,
} from '@/lib/prestige-governance/SportPrestigeResolver'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

export { normalizeSportForPrestige, getPrestigeSportLabel, PRESTIGE_SUPPORTED_SPORTS, isSupportedPrestigeSport }

export function resolveSportForCareer(sport: string | null | undefined): string {
  return sport ? normalizeSportForPrestige(sport) : DEFAULT_SPORT
}
