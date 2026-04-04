/**
 * PROMPT 3: Redraft orchestration — create draft sessions, apply roster/FAAB rules, announce.
 */

import { prisma } from '@/lib/prisma'
import { getOrCreateDraftSession } from '@/lib/live-draft-engine/DraftSessionService'

/** Create draft sessions for all leagues in a round (pre_draft). No draft pick trading; order from roster list. */
export async function scheduleRedraftForRound(
  tournamentId: string,
  roundIndex: number
): Promise<{ scheduled: number; leagueIds: string[] }> {
  const leagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex },
    select: { leagueId: true },
  })
  const leagueIds = leagues.map((l) => l.leagueId)
  let scheduled = 0
  for (const leagueId of leagueIds) {
    try {
      const { created } = await getOrCreateDraftSession(leagueId)
      if (created) scheduled++
    } catch (e) {
      console.warn('[tournament] Draft session create non-fatal', leagueId, e)
    }
  }
  return { scheduled, leagueIds }
}

/** Set faabRemaining on all rosters in leagues of this round. */
export async function applyFaabResetForRound(
  tournamentId: string,
  roundIndex: number,
  faabBudget: number
): Promise<void> {
  const leagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex },
    select: { leagueId: true },
  })
  for (const { leagueId } of leagues) {
    await prisma.roster.updateMany({
      where: { leagueId },
      data: { faabRemaining: faabBudget },
    })
  }
}

/** Apply bench spots via league roster config overlay (round settings). App uses LeagueRosterConfig + template; we merge bench overrides. */
export async function applyBenchSpotsForRound(
  tournamentId: string,
  roundIndex: number,
  benchSpots: number
): Promise<void> {
  const leagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex },
    select: { leagueId: true },
  })
  for (const { leagueId } of leagues) {
    const config = await prisma.leagueRosterConfig.findUnique({
      where: { leagueId },
    })
    if (config?.overrides && typeof config.overrides === 'object') {
      const overrides = config.overrides as Record<string, unknown>
      await prisma.leagueRosterConfig.update({
        where: { leagueId },
        data: { overrides: { ...overrides, benchCount: benchSpots } },
      })
    }
  }
}
