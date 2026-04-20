import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { syncAfRosterLineupAssignments } from './lineupAssignmentSync'

/**
 * Sample transactional apply: `Roster.playerData` + normalized lineup rows in one DB transaction.
 * Prefer `persistRosterLineupWithEngine` for API saves (validation, locks, history, lock cache).
 */
export async function sampleApplyRosterLineupInTransaction(input: {
  rosterId: string
  leagueId: string
  season: number
  week: number
  nextPlayerData: Prisma.InputJsonValue
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.roster.update({
      where: { id: input.rosterId },
      data: { playerData: input.nextPlayerData },
    })
    await syncAfRosterLineupAssignments(
      {
        leagueId: input.leagueId,
        rosterId: input.rosterId,
        season: input.season,
        week: input.week,
        playerData: input.nextPlayerData,
      },
      tx,
    )
  })
}
