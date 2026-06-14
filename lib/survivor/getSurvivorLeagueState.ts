import 'server-only'

import {
  buildSurvivorStateForUser,
  type SurvivorFoundationState,
} from './survivorStateService'

export type SurvivorLeagueState = SurvivorFoundationState

export async function getSurvivorLeagueState(
  leagueId: string,
  requestingUserId: string,
): Promise<SurvivorLeagueState | null> {
  const result = await buildSurvivorStateForUser(leagueId, requestingUserId)
  return result.ok ? result.state : null
}
