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
      const snap = (group.bubbleScoringSnapshot as Record<string, number> | null) ?? {}
      const sorted = [...group.participantIds].sort((a, b) => (snap[b] ?? 0) - (snap[a] ?? 0))
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
