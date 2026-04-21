import { resolveTeamLogoUrlSync } from '@/lib/draft-sports-models/player-asset-resolver'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

/**
 * Resolve a team logo URL from an abbreviation, using the static sport registry.
 * Returns null when unknown — UI should show a text badge.
 */
export function getTeamLogo(team: string | null | undefined, sport: string = DEFAULT_SPORT): string | null {
  if (!team?.trim()) return null
  return resolveTeamLogoUrlSync(team.trim(), normalizeToSupportedSport(sport))
}
