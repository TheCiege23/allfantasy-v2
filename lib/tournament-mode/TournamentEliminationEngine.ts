/**
 * PROMPT 3: Elimination engine — round status, mark eliminated, archive round.
 */

import { prisma } from '@/lib/prisma'

/** Mark participants (by rosterIds in given leagues) as eliminated at this round. */
export async function markEliminated(
  tournamentId: string,
  roundIndex: number,
  rosterIds: string[]
): Promise<void> {
  if (rosterIds.length === 0) return
  await prisma.legacyTournamentParticipant.updateMany({
    where: { tournamentId, currentRosterId: { in: rosterIds } },
    data: { status: 'eliminated', eliminatedAtRoundIndex: roundIndex, currentLeagueId: null, currentRosterId: null },
  })
}

/** Set round status to archived and optionally close competitive actions (e.g. lock waivers for that league). */
export async function archiveRound(
  tournamentId: string,
  roundIndex: number
): Promise<{ archived: boolean }> {
  const r = await prisma.legacyTournamentRound.updateMany({
    where: { tournamentId, roundIndex },
    data: { status: 'archived' },
  })
  return { archived: (r.count ?? 0) > 0 }
}

/** Get round status (pending | active | completed | archived). */
export async function getRoundStatus(
  tournamentId: string,
  roundIndex: number
): Promise<string | null> {
  const r = await prisma.legacyTournamentRound.findUnique({
    where: { tournamentId_roundIndex: { tournamentId, roundIndex } },
    select: { status: true },
  })
  return r?.status ?? null
}

/** Mark round as completed (ready to advance to next or archive). */
export async function markRoundCompleted(
  tournamentId: string,
  roundIndex: number
): Promise<void> {
  await prisma.legacyTournamentRound.updateMany({
    where: { tournamentId, roundIndex },
    data: { status: 'completed' },
  })
}
