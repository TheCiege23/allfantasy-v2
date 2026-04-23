import { getEffectiveLeagueRosterTemplate } from '@/lib/league/getEffectiveLeagueRosterTemplate'

/**
 * Draft start/pick/session: requires a persisted roster schema for the league (Sleeper-style).
 * When false, callers return 409 / soft-block UI via `rosterConfigurationIncomplete`.
 */
export async function isLeagueRosterDraftReady(leagueId: string): Promise<boolean> {
  const { hasPersistedRosterSchema } = await getEffectiveLeagueRosterTemplate(leagueId)
  return hasPersistedRosterSchema
}
