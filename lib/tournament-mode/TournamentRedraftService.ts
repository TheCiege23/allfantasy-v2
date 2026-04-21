/**
 * PROMPT 3: Redraft orchestration — create draft sessions, apply roster/FAAB rules, announce to league chat.
 */

import { prisma } from '@/lib/prisma'
import { getOrCreateDraftSession } from '@/lib/live-draft-engine/DraftSessionService'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

const SYSTEM_USER_ID = 'system'

/** Map any legacy draft-type spellings to the canonical LeagueSettings.draftType values. */
function canonicalizeDraftType(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v === 'auction') return 'auction'
  if (v === 'snake' || v === 'serpentine') return 'snake'
  if (v === '3rd_reversal' || v === 'third_round_reversal' || v === '3rr') return '3rd_reversal'
  if (v === 'linear' || v === 'straight') return 'linear'
  return null
}

/** Pull the canonical draftType the tournament was created with. */
function readTournamentDraftType(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object') return null
  const s = settings as Record<string, unknown>
  return canonicalizeDraftType(typeof s.draftType === 'string' ? s.draftType : null)
}

/** Create draft sessions for all leagues in a round (pre_draft). No draft pick trading; order from roster list. */
export async function scheduleRedraftForRound(
  tournamentId: string,
  roundIndex: number
): Promise<{ scheduled: number; leagueIds: string[] }> {
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { name: true, creatorId: true, settings: true },
  })
  const tournamentDraftType = readTournamentDraftType(tournament?.settings)
  const leagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex },
    select: { leagueId: true },
  })
  const leagueIds = leagues.map((l) => l.leagueId)
  let scheduled = 0
  for (const leagueId of leagueIds) {
    try {
      // Force the tournament's draftType onto the feeder league's LeagueSettings
      // before we materialise the DraftSession. Without this, getOrCreateDraftSession
      // reads the league's own draftType (typically the original Round 1 setting),
      // which silently downgrades auction tournaments to snake on every redraft.
      if (tournamentDraftType) {
        await prisma.leagueSettings
          .updateMany({
            where: { leagueId, draftType: { not: tournamentDraftType } },
            data: { draftType: tournamentDraftType },
          })
          .catch(() => {})
      }
      const { created } = await getOrCreateDraftSession(leagueId)
      if (created) {
        scheduled++
        // Post redraft announcement to league chat
        try {
          await createLeagueChatMessage(
            leagueId,
            tournament?.creatorId ?? SYSTEM_USER_ID,
            [
              `Tournament redraft scheduled for Round ${roundIndex}.`,
              `Draft room is ready — check the draft tab for your pick order.`,
              `No pick trading. Randomized draft order. Good luck!`,
            ].join(' '),
            {
              type: 'text',
              source: 'tournament_system',
              messageSubtype: 'tournament_redraft',
              metadata: { tournamentId, roundIndex, tournamentName: tournament?.name },
            }
          )
        } catch {
          // Chat posting is non-fatal
        }
      }
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
    if (config) {
      const existingOverrides = (config.overrides && typeof config.overrides === 'object')
        ? config.overrides as Record<string, unknown>
        : {}
      await prisma.leagueRosterConfig.update({
        where: { leagueId },
        data: { overrides: { ...existingOverrides, benchCount: benchSpots } },
      })
    }
  }
}
