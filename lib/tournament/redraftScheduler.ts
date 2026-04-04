import { prisma } from '@/lib/prisma'
import { getOrCreateDraftSession } from '@/lib/live-draft-engine/DraftSessionService'
import {
  calculateConferenceStandings,
  calculateLeagueStandings,
  executeAdvancement,
  identifyQualifiers,
} from '@/lib/tournament/advancementEngine'
import { openBubblePhase } from '@/lib/tournament/bubbleEngine'

export async function scheduleRoundDraft(
  tournamentId: string,
  roundNumber: number,
  draftDateTime: Date,
): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')

  const round = await prisma.tournamentRound.findFirst({
    where: { tournamentId, roundNumber },
  })
  if (!round) throw new Error('Round not found')

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId: round.id },
    orderBy: { leagueNumber: 'asc' },
  })

  let offset = 0
  for (const tl of leagues) {
    if (!tl.leagueId) continue
    const when = shell.simultaneousDrafts
      ? draftDateTime
      : new Date(draftDateTime.getTime() + offset * 30 * 60 * 1000)
    offset++

    await prisma.tournamentLeague.update({
      where: { id: tl.id },
      data: { draftScheduledAt: when, status: 'draft_scheduled' },
    })

    await getOrCreateDraftSession(tl.leagueId)
    const dt =
      shell.draftType === 'auction' ? 'auction' : shell.draftType === 'linear' ? 'linear' : 'snake'
    await prisma.draftSession.update({
      where: { leagueId: tl.leagueId },
      data: {
        timerSeconds: shell.draftClockSeconds,
        draftType: dt,
      },
    })
  }

  await prisma.tournamentShellAnnouncement.create({
    data: {
      tournamentId,
      roundNumber,
      type: 'draft_scheduled',
      title: `Round ${roundNumber} draft scheduled`,
      content: `Draft windows are set for ${leagues.length} leagues.`,
      targetAudience: 'all',
    },
  })

  await prisma.tournamentShellAuditLog.create({
    data: {
      tournamentId,
      roundNumber,
      action: 'draft_scheduled',
      actorType: 'system',
      data: { at: draftDateTime.toISOString() },
    },
  })
}

export async function handleRoundTransition(
  tournamentId: string,
  completedRoundNumber: number,
): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({
    where: { id: tournamentId },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  })
  if (!shell) throw new Error('Tournament not found')

  const completed = shell.rounds.find((r) => r.roundNumber === completedRoundNumber)
  if (!completed) throw new Error('Round not found')

  const tls = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId: completed.id },
  })
  for (const tl of tls) {
    await calculateLeagueStandings(tl.id)
  }
  const conferences = await prisma.tournamentConference.findMany({ where: { tournamentId } })
  for (const c of conferences) {
    await calculateConferenceStandings(c.id)
  }

  await identifyQualifiers(tournamentId, completed.id)

  if (shell.bubbleEnabled) {
    await openBubblePhase(tournamentId)
  } else {
    await executeAdvancement(tournamentId, completedRoundNumber)
  }

  await prisma.tournamentRound.update({
    where: { id: completed.id },
    data: { status: 'complete', roundCompletedAt: new Date() },
  })

  await prisma.tournamentShellAnnouncement.create({
    data: {
      tournamentId,
      roundNumber: completedRoundNumber,
      type: 'round_summary',
      title: `Round ${completedRoundNumber} complete`,
      content: 'Standings synced and advancement rules evaluated.',
      targetAudience: 'all',
    },
  })
}

export async function applyRoundRosterRules(tournamentId: string, roundNumber: number): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')

  const round = await prisma.tournamentRound.findFirst({ where: { tournamentId, roundNumber } })
  if (!round) throw new Error('Round not found')

  let size = shell.tournamentRosterSize
  if (roundNumber === 1) size = shell.openingRosterSize
  if (round.roundType === 'elite' || round.roundType === 'final') size = shell.eliteRosterSize
  if (round.rosterSizeOverride != null) size = round.rosterSizeOverride

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId: round.id },
  })
  for (const tl of leagues) {
    if (!tl.leagueId) continue
    await prisma.league.update({
      where: { id: tl.leagueId },
      data: { rosterSize: size },
    })
  }

  if (shell.faabResetOnRedraft) {
    const tlIds = leagues.map((l) => l.id)
    await prisma.tournamentLeagueParticipant.updateMany({
      where: { tournamentLeagueId: { in: tlIds } },
      data: { faabBalance: 100 },
    })
  }
}
