/**
 * Resolves effective league configuration for display and validation.
 * Merges DB league + waiver/draft defaults by sport.
 */

import { getLeagueConfiguration } from "./CommissionerSettingsService"
import type { LeagueConfigurationView } from "./types"

export async function getEffectiveLeagueConfiguration(
  leagueId: string
): Promise<LeagueConfigurationView | null> {
  return getLeagueConfiguration(leagueId)
}

export function getEditableGeneralKeys(): readonly string[] {
  return ["name", "description", "sport", "season"]
}

export function getEditableRosterKeys(): readonly string[] {
  return ["rosterSize", "leagueSize", "starters"]
}
