/**
 * Build deterministic Tournament Mode context for Chimmy.
 * Chimmy can explain: stage, conference, cut lines, tiebreakers, bubble, next redraft, roster rules.
 * Chimmy NEVER decides: advancement, elimination, seeding, or any outcome. All outcomes are calculated by the backend.
 * PROMPT 4.
 */

import { prisma } from '@/lib/prisma'
import { getTournamentConfigForLeague } from '../TournamentConfigService'
import { getUniversalStandings } from '../TournamentStandingsService'
import {
  getAdvancementSlotsPerConference,
  getBubbleSlotsPerConference,
} from '../advancement-rules'

export async function buildTournamentContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const config = await getTournamentConfigForLeague(leagueId)
  if (!config) return ''

  const tournament = await prisma.tournament.findUnique({
    where: { id: config.tournamentId },
    select: { name: true, status: true, settings: true },
  })
  if (!tournament) return ''

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const poolSize = Number(settings.participantPoolSize) || 120
  const qualificationWeeks = Number(settings.qualificationWeeks) ?? 9
  const bubbleEnabled = Boolean(settings.bubbleWeekEnabled)
  const advancementPerConf = getAdvancementSlotsPerConference(poolSize)
  const bubbleSlots = getBubbleSlotsPerConference(advancementPerConf, bubbleEnabled)
  const roundRedraftSchedule = (settings.roundRedraftSchedule as number[]) ?? [10]

  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId: config.tournamentId, userId } },
  })

  const rounds = await prisma.tournamentRound.findMany({
    where: { tournamentId: config.tournamentId },
    orderBy: { roundIndex: 'asc' },
  })

  let standingsSnippet = ''
  try {
    const standings = await getUniversalStandings(config.tournamentId)
    const myRow = standings.find((r) => r.userId === userId)
    if (myRow) {
      standingsSnippet = `User's current standing: rank in conference ${myRow.rankInConference ?? 'N/A'}, W-L ${myRow.wins}-${myRow.losses}, PF ${myRow.pointsFor.toFixed(1)}. Advancement status (deterministic): ${myRow.advancementStatus ?? 'N/A'}.`
    }
  } catch {
    // non-fatal
  }

  const statusLine = participant
    ? participant.status === 'eliminated'
      ? `User was eliminated in round ${participant.eliminatedAtRoundIndex ?? '?'}.`
      : `User is active. Current league: ${config.tournamentName} – ${config.conferenceName} ${participant.bracketLabel ?? config.phase}.`
    : 'User is in a feeder league (qualification phase).'

  const tiebreakers = (settings.qualificationTiebreakers as string[]) ?? ['wins', 'points_for']
  const tiebreakerText = tiebreakers.map((t) => (t === 'wins' ? 'Win/Loss record' : t === 'points_for' ? 'Points For' : t)).join(' then ')

  return `[TOURNAMENT MODE CONTEXT - explanation only; you never decide advancement, elimination, seeding, or any outcome. All outcomes are calculated by the backend.]
Tournament: ${config.tournamentName}. Sport: ${config.sport}. Tournament status: ${config.status}.
User's league: ${config.tournamentName} – ${config.conferenceName}. Conference: ${config.conferenceName}. Round index: ${config.roundIndex}. Phase: ${config.phase}.
${statusLine}
Qualification: Weeks 1–${qualificationWeeks}. Top ${advancementPerConf} per conference advance (pool size ${poolSize}). Tiebreakers (in order): ${tiebreakerText}.
Bubble: ${bubbleEnabled ? `Enabled; up to ${bubbleSlots} additional teams per conference can advance (ranks ${advancementPerConf + 1}–${advancementPerConf + bubbleSlots}).` : 'Disabled.'}
Redraft schedule (week numbers): ${roundRedraftSchedule.join(', ')}. After qualification, elimination leagues redraft; roster rules change (e.g. 2 bench in elimination).
Rounds: ${rounds.map((r) => `Round ${r.roundIndex}: ${r.name ?? r.phase} (${r.status})`).join('; ')}.
${standingsSnippet}

You may answer: what do I need to advance; when is the next redraft; what league do I move into if I advance; why was I eliminated; what are the tiebreakers; how does the bubble work. Always use the deterministic data above; never invent advancement or elimination outcomes.`
}
