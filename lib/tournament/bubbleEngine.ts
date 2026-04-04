import { prisma } from '@/lib/prisma'

export async function openBubblePhase(tournamentId: string): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')
  if (!shell.bubbleEnabled) return

  await prisma.tournamentShell.update({
    where: { id: tournamentId },
    data: { status: 'bubble' },
  })

  const bubbleParticipants = await prisma.tournamentLeagueParticipant.findMany({
    where: { advancementStatus: 'bubble', league: { tournamentId } },
  })

  const snapshot: Record<string, number> = {}
  for (const p of bubbleParticipants) {
    snapshot[p.participantId] = p.pointsFor
  }

  await prisma.tournamentAdvancementGroup.create({
    data: {
      tournamentId,
      fromRoundId: 'bubble',
      groupType: 'bubble',
      participantIds: bubbleParticipants.map((b) => b.participantId),
      maxSize: shell.bubbleSize,
      isBubbleGroup: true,
      bubbleScoringSnapshot: snapshot,
      bubbleWinnerIds: [],
    },
  })

  const advanceN = Math.max(1, Math.floor(shell.bubbleSize / 2))
  await prisma.tournamentShellAnnouncement.create({
    data: {
      tournamentId,
      type: 'bubble_opened',
      title: 'Bubble phase',
      content: `${bubbleParticipants.length} teams are in the bubble. Top ${advanceN} advance after the bubble scoring window.`,
      targetAudience: 'bubble',
    },
  })
}

export async function resolveBubble(tournamentId: string): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')

  const group = await prisma.tournamentAdvancementGroup.findFirst({
    where: { tournamentId, isBubbleGroup: true, isLocked: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!group) return

  const mode = shell.bubbleScoringMode
  let winners: string[] = []

  if (mode === 'cumulative_points') {
    const snap = (group.bubbleScoringSnapshot as Record<string, number> | null) ?? {}
    const sorted = [...group.participantIds].sort((a, b) => (snap[b] ?? 0) - (snap[a] ?? 0))
    const half = Math.max(1, Math.floor(shell.bubbleSize / 2))
    winners = sorted.slice(0, half)
  } else {
    const half = Math.max(1, Math.floor(group.participantIds.length / 2))
    winners = group.participantIds.slice(0, half)
  }

  for (const pid of winners) {
    await prisma.tournamentLeagueParticipant.updateMany({
      where: { participantId: pid, league: { tournamentId } },
      data: { advancementStatus: 'wildcard_eligible' },
    })
  }
  for (const pid of group.participantIds) {
    if (winners.includes(pid)) continue
    await prisma.tournamentLeagueParticipant.updateMany({
      where: { participantId: pid, league: { tournamentId } },
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

  await prisma.tournamentShellAnnouncement.create({
    data: {
      tournamentId,
      type: 'bubble_closed',
      title: 'Bubble resolved',
      content: `${winners.length} teams survived the bubble.`,
      targetAudience: 'all',
    },
  })
}
