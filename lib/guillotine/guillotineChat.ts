/**
 * Post guillotine-related messages to league chat (chop announcement, etc.).
 */

import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export async function postChopToLeagueChat(args: {
  leagueId: string
  weekOrPeriod: number
  choppedRosterIds: string[]
  displayNames: Record<string, string>
  userId: string
}): Promise<void> {
  const { leagueId, weekOrPeriod, choppedRosterIds, displayNames, userId } = args
  const names = choppedRosterIds.map((id) => displayNames[id] ?? id).join(', ')
  const message =
    choppedRosterIds.length > 1
      ? `Week ${weekOrPeriod} — Chopped: ${names}. Their rosters have been released to waivers.`
      : `Week ${weekOrPeriod} — ${names} has been chopped. Their roster has been released to waivers.`
  await createLeagueChatMessage(leagueId, userId, message, {
    type: 'text',
    metadata: { guillotineChop: true, weekOrPeriod, choppedRosterIds },
  })
}
