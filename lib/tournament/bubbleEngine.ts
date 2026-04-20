/**
 * Bubble phase: single-table snapshot + advancement hooks.
 * `head_to_head` and `mini_bracket` bubble *modes* in the full spec still need real mini-schedules /
 * sub-bracket pairing; this module stays intentionally simplified until schedule templates land.
 */
import { prisma } from '@/lib/prisma'
import { executeAdvancement, handleEliminations } from '@/lib/tournament/advancementEngine'

export async function openBubblePhase(tournamentId: string, fromRoundId: string): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')
  if (!shell.bubbleEnabled) return

  await prisma.tournamentShell.update({
    where: { id: tournamentId },
    data: { status: 'bubble' },
  })

  const bubbleRows = await prisma.tournamentLeagueParticipant.findMany({
    where: {
      advancementStatus: 'bubble',
      league: { tournamentId, roundId: fromRoundId },
    },
    include: { league: { select: { conferenceId: true } } },
  })

  const byConf = new Map<string | null, typeof bubbleRows>()
  for (const row of bubbleRows) {
    const cid = row.league.conferenceId
    const list = byConf.get(cid) ?? []
    list.push(row)
    byConf.set(cid, list)
  }

  for (const [conferenceId, rows] of byConf) {
    if (!rows.length) continue
    const snapshot: Record<string, number> = {}
    for (const p of rows) {
      snapshot[p.participantId] = p.pointsFor
    }
    await prisma.tournamentAdvancementGroup.create({
      data: {
        tournamentId,
        conferenceId: conferenceId ?? undefined,
        fromRoundId,
        groupType: 'bubble',
        participantIds: rows.map((r) => r.participantId),
        maxSize: shell.bubbleSize,
        isBubbleGroup: true,
        bubbleScoringSnapshot: snapshot,
        bubbleWinnerIds: [],
      },
    })
  }

  const advanceN = Math.max(1, Math.floor(shell.bubbleSize / 2))
  await prisma.tournamentAnnouncement.create({
    data: {
      tournamentId,
      type: 'bubble_opened',
      title: 'Bubble phase',
      content: `${bubbleRows.length} teams are in the bubble. Up to ${advanceN} per conference advance after the bubble scoring window.`,
      targetAudience: 'bubble',
    },
  })
}

export async function resolveBubble(tournamentId: string): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')

  const groups = await prisma.tournamentAdvancementGroup.findMany({
    where: { tournamentId, isBubbleGroup: true, isLocked: false },
    orderBy: { createdAt: 'asc' },
  })
  if (!groups.length) return

  const openingRound = await prisma.tournamentRound.findFirst({
    where: { id: groups[0]!.fromRoundId, tournamentId },
  })
  if (!openingRound) throw new Error('Opening round not found for bubble resolution')

  const bubbleEliminated: string[] = []

  for (const group of groups) {
    const leagueWhere: { tournamentId: string; roundId: string; conferenceId?: string } = {
      tournamentId,
      roundId: group.fromRoundId,
    }
    if (group.conferenceId) leagueWhere.conferenceId = group.conferenceId

    const leagueIds = (
      await prisma.tournamentLeague.findMany({
        where: leagueWhere,
        select: { id: true },
      })
    ).map((l) => l.id)

    const mode = shell.bubbleScoringMode
    let winners: string[] = []
    if (mode === 'cumulative_points') {
      // The snapshot stored at openBubblePhase is the *baseline* — each participant's
      // pointsFor at the moment the bubble opened. We score the bubble window by
      // diffing current pointsFor (which calculateLeagueStandings re-aggregates after
      // each round) against that baseline. That way ranking reflects how much each
      // participant scored *during* the bubble, not their pre-bubble total.
      const baseline = (group.bubbleScoringSnapshot as Record<string, number> | null) ?? {}
      const tlps = await prisma.tournamentLeagueParticipant.findMany({
        where: {
          participantId: { in: group.participantIds },
          tournamentLeagueId: { in: leagueIds },
        },
        select: { participantId: true, pointsFor: true },
      })
      const currentByPid = new Map<string, number>()
      for (const r of tlps) {
        // Sum across rows in case the participant somehow appears in multiple bubble leagues.
        currentByPid.set(r.participantId, (currentByPid.get(r.participantId) ?? 0) + r.pointsFor)
      }
      const bubbleScores: Record<string, number> = {}
      for (const pid of group.participantIds) {
        const before = baseline[pid] ?? 0
        const after = currentByPid.get(pid) ?? before
        bubbleScores[pid] = Math.max(0, after - before)
      }
      const sorted = [...group.participantIds].sort((a, b) => (bubbleScores[b] ?? 0) - (bubbleScores[a] ?? 0))
      const half = Math.max(1, Math.floor(group.participantIds.length / 2))
      winners = sorted.slice(0, half)
      // Persist the bubble-window deltas back onto the group so the audit/UI shows
      // the actual bubble performance, not the pre-bubble snapshot.
      await prisma.tournamentAdvancementGroup.update({
        where: { id: group.id },
        data: { bubbleScoringSnapshot: bubbleScores },
      })
    } else if (mode === 'head_to_head' || mode === 'mini_bracket') {
      // These modes need a real bubble schedule (mini-fixture or sub-bracket) which
      // hasn't shipped yet — fall back to cumulative bubble-window points so the
      // round still resolves deterministically instead of locking the tournament.
      const baseline = (group.bubbleScoringSnapshot as Record<string, number> | null) ?? {}
      const tlps = await prisma.tournamentLeagueParticipant.findMany({
        where: {
          participantId: { in: group.participantIds },
          tournamentLeagueId: { in: leagueIds },
        },
        select: { participantId: true, pointsFor: true },
      })
      const currentByPid = new Map<string, number>()
      for (const r of tlps) {
        currentByPid.set(r.participantId, (currentByPid.get(r.participantId) ?? 0) + r.pointsFor)
      }
      const sorted = [...group.participantIds].sort(
        (a, b) =>
          ((currentByPid.get(b) ?? 0) - (baseline[b] ?? 0)) -
          ((currentByPid.get(a) ?? 0) - (baseline[a] ?? 0)),
      )
      const half = Math.max(1, Math.floor(group.participantIds.length / 2))
      winners = sorted.slice(0, half)
    } else {
      const half = Math.max(1, Math.floor(group.participantIds.length / 2))
      winners = group.participantIds.slice(0, half)
    }

    for (const pid of winners) {
      await prisma.tournamentLeagueParticipant.updateMany({
        where: {
          participantId: pid,
          tournamentLeagueId: { in: leagueIds },
        },
        data: { advancementStatus: 'wildcard_eligible' },
      })
    }
    for (const pid of group.participantIds) {
      if (winners.includes(pid)) continue
      bubbleEliminated.push(pid)
      await prisma.tournamentLeagueParticipant.updateMany({
        where: {
          participantId: pid,
          tournamentLeagueId: { in: leagueIds },
        },
        data: { advancementStatus: 'eliminated' },
      })
    }

    await prisma.tournamentAdvancementGroup.update({
      where: { id: group.id },
      data: {
        bubbleWinnerIds: winners,
        isLocked: true,
        resolvedAt: new Date(),
      },
    })
  }

  if (bubbleEliminated.length) {
    await handleEliminations(tournamentId, [...new Set(bubbleEliminated)])
  }

  await prisma.tournamentAnnouncement.create({
    data: {
      tournamentId,
      type: 'bubble_closed',
      title: 'Bubble resolved',
      content: 'Bubble groups are locked. Advancing qualifiers into the next round.',
      targetAudience: 'all',
    },
  })

  await executeAdvancement(tournamentId, openingRound.roundNumber)
}
