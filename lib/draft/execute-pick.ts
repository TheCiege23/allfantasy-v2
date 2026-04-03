import { prisma } from '@/lib/prisma'
import { parseSessionKey } from '@/lib/draft/session-key'
import { pickInRoundForOverall, roundForOverallPick, slotIndexForOverallPick } from '@/lib/draft/snake'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export async function executeDraftPick(args: {
  sessionId: string
  userId: string
  playerId: string | null
  playerName: string
  position: string
  team: string | null
  autopicked: boolean
}): Promise<{ ok: true; overallPick: number } | { ok: false; error: string; status?: number }> {
  const { sessionId, userId, playerId, playerName, position, team, autopicked } = args

  let parsed: { mode: 'mock' | 'live'; id: string }
  try {
    parsed = parseSessionKey(sessionId)
  } catch {
    return { ok: false, error: 'Invalid sessionId', status: 400 }
  }

  const state = await prisma.draftRoomStateRow.findUnique({ where: { id: sessionId } })
  if (!state || state.status === 'complete') {
    return { ok: false, error: 'Draft not active', status: 400 }
  }

  const numTeams = state.numTeams
  const pickOrder = state.pickOrder as Array<{ id: string; label?: string }> | null
  if (!pickOrder?.length) {
    return { ok: false, error: 'Invalid pick order', status: 500 }
  }

  const whereCount = parsed.mode === 'mock' ? { roomId: parsed.id } : { leagueId: parsed.id }
  const existing = await prisma.draftRoomPickRecord.count({ where: whereCount })
  const overallPick = existing + 1
  const totalPicks = numTeams * state.numRounds
  if (overallPick > totalPicks) {
    return { ok: false, error: 'Draft already complete', status: 400 }
  }

  const slot = slotIndexForOverallPick(overallPick, numTeams)
  const onClock = pickOrder[slot]?.id
  if (!onClock) {
    return { ok: false, error: 'Invalid slot', status: 500 }
  }

  const isCpu = onClock.startsWith('cpu-')

  if (parsed.mode === 'mock') {
    if (!isCpu && onClock !== userId && !autopicked) {
      return { ok: false, error: 'Not your pick', status: 403 }
    }
    if (isCpu && !autopicked) {
      return { ok: false, error: 'CPU is on the clock', status: 400 }
    }
  } else {
    const teamRow = await prisma.leagueTeam.findFirst({
      where: { id: onClock, leagueId: parsed.id },
      select: { claimedByUserId: true, league: { select: { userId: true } } },
    })
    if (!teamRow) {
      return { ok: false, error: 'Invalid team slot', status: 400 }
    }
    const isManager = teamRow.claimedByUserId === userId
    const isCommish = teamRow.league.userId === userId
    if (!autopicked && !isManager && !isCommish) {
      return { ok: false, error: 'Not your pick', status: 403 }
    }
  }

  const round = roundForOverallPick(overallPick, numTeams)
  const pickNumber = pickInRoundForOverall(overallPick, numTeams)
  const roomId = parsed.mode === 'mock' ? parsed.id : null
  const leagueId = parsed.mode === 'live' ? parsed.id : null

  await prisma.$transaction(async (tx) => {
    await tx.draftRoomPickRecord.create({
      data: {
        leagueId,
        roomId,
        round,
        pickNumber,
        overallPick,
        originalOwnerId: onClock,
        currentOwnerId: onClock,
        pickedById: isCpu ? null : userId,
        playerId,
        playerName,
        position,
        team,
        autopicked: Boolean(autopicked || isCpu),
      },
    })

    const done = overallPick >= totalPicks
    const nextOverall = overallPick + 1
    const nextSlot = done ? slot : slotIndexForOverallPick(nextOverall, numTeams)
    const nextRound = done ? round : roundForOverallPick(nextOverall, numTeams)
    const ends = done ? null : new Date(Date.now() + state.timerSeconds * 1000)

    await tx.draftRoomStateRow.update({
      where: { id: sessionId },
      data: {
        status: done ? 'complete' : 'active',
        currentPick: done ? overallPick : nextOverall,
        currentRound: nextRound,
        currentTeamIndex: nextSlot,
        timerEndsAt: state.timerPaused ? state.timerEndsAt : ends,
        updatedAt: new Date(),
      },
    })

    if (parsed.mode === 'mock') {
      await tx.mockDraftRoom.update({
        where: { id: parsed.id },
        data: { status: done ? 'complete' : 'active' },
      })
    }
  })

  const teamLabel = pickOrder[slot]?.label ?? onClock
  const sysMsg = `Pick ${round}.${String(pickNumber).padStart(2, '0')} — ${playerName} (${position}) selected by ${teamLabel}`

  await prisma.draftRoomChatMessage.create({
    data: {
      sessionKey: sessionId,
      leagueId,
      roomId,
      userId: null,
      authorDisplayName: 'System',
      message: sysMsg,
      type: 'system',
    },
  })

  if (parsed.mode === 'live' && leagueId) {
    await createLeagueChatMessage(leagueId, userId, `[Draft Room] ${sysMsg}`, {
      type: 'text',
      source: 'draft',
    })
  }

  return { ok: true, overallPick }
}
