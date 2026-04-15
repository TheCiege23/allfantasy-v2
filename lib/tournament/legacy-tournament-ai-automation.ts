import 'server-only'

import { prisma } from '@/lib/prisma'
import { parseAiAutomationV1, type AiAutomationV1State } from '@/lib/tournament/ai-automation-hub'

/** Load commissioner AI automation toggles from `LegacyTournament.hubSettings.aiAutomationV1`. */
export async function getLegacyTournamentAiAutomationState(
  tournamentId: string,
): Promise<AiAutomationV1State | null> {
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { hubSettings: true },
  })
  if (!t) return null
  const hub = (t.hubSettings as Record<string, unknown>) ?? {}
  return parseAiAutomationV1(hub.aiAutomationV1)
}
