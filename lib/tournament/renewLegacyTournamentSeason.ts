import { prisma } from '@/lib/prisma'

/**
 * After a tournament year, move participants back to their qualification (feeder) league
 * so the next season can start from the same structure as creation (per product spec).
 * Uses `qualificationLeagueId` / `currentLeagueId` on `LegacyTournamentParticipant`.
 */
export async function restoreParticipantsToQualificationLeagues(tournamentId: string): Promise<{ updated: number }> {
  const result = await prisma.$executeRaw`
    UPDATE "tournament_participants"
    SET
      "currentLeagueId" = "qualificationLeagueId",
      "advancedAtRoundIndex" = 0,
      "eliminatedAtRoundIndex" = NULL,
      "status" = 'active',
      "bubbleAdvanced" = false
    WHERE "tournamentId" = ${tournamentId}
      AND "qualificationLeagueId" IS NOT NULL
  `
  const n = typeof result === 'bigint' ? Number(result) : Number(result ?? 0)
  return { updated: Number.isFinite(n) ? n : 0 }
}
