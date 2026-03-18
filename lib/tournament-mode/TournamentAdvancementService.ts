/**
 * [NEW] lib/tournament-mode/TournamentAdvancementService.ts
 * Qualification seeding, round condensation, bracket progression (stubs for Prompt 2).
 */

import { prisma } from '@/lib/prisma'

/** Advance top N from each league to next round; create new round leagues (stub). */
export async function runQualificationAdvancement(
  _tournamentId: string,
  _advancementPerLeague: number
): Promise<{ advanced: number; newRoundLeagues: string[] }> {
  return { advanced: 0, newRoundLeagues: [] }
}

/** Condense round: merge advancing teams into fewer leagues (stub). */
export async function condenseRound(
  _tournamentId: string,
  _fromRoundIndex: number,
  _targetLeagueCount: number
): Promise<{ leagueIds: string[] }> {
  return { leagueIds: [] }
}

/** Record bracket progression for a round (stub). */
export async function recordBracketProgression(
  _tournamentId: string,
  _roundIndex: number,
  _payload: Record<string, unknown>
): Promise<void> {}
