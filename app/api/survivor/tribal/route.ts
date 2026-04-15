import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { assertLeagueCommissioner, assertLeagueMember } from '@/lib/league/league-access'
import {
  buildScrollRevealSequence,
  lockVoting,
  openTribalCouncil,
  submitVote,
} from '@/lib/survivor/votingEngine'
import { playIdol } from '@/lib/survivor/idolEngine'
import { executeRocksDraw } from '@/lib/survivor/rocksEngine'
import { removeRosterFromTribeChat } from '@/lib/survivor/SurvivorChatMembershipService'
import { enrollInExile } from '@/lib/survivor/SurvivorExileEngine'
import { enrollJuryMember, shouldJoinJury } from '@/lib/survivor/SurvivorJuryEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const due = await prisma.survivorTribalCouncil.findMany({
    where: {
      status: 'voting_open',
      votingDeadline: { lte: new Date() },
    },
  })
  for (const c of due) {
    await lockVoting(c.id).catch(() => {})
  }
  return NextResponse.json({ ok: true, locked: due.length })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  const action = typeof body.action === 'string' ? body.action : ''
  if (!leagueId || !action) return NextResponse.json({ error: 'leagueId and action required' }, { status: 400 })

  if (action === 'open') {
    const gate = await assertLeagueCommissioner(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const week = typeof body.week === 'number' ? body.week : 1
    const tribeId = typeof body.tribeId === 'string' ? body.tribeId : null
    const deadline = typeof body.deadline === 'string' ? new Date(body.deadline) : new Date(Date.now() + 3600000)
    const council = await openTribalCouncil(leagueId, week, tribeId, deadline)
    return NextResponse.json(council)
  }

  if (action === 'vote') {
    const gate = await assertLeagueMember(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : ''
    const voterRosterId = typeof body.voterRosterId === 'string' ? body.voterRosterId : ''
    const targetRosterId = typeof body.targetRosterId === 'string' ? body.targetRosterId : ''
    if (!councilId || !targetUserId || !voterRosterId || !targetRosterId) {
      return NextResponse.json({ error: 'councilId, targetUserId, voterRosterId, targetRosterId required' }, { status: 400 })
    }
    // Confirm councilId belongs to the league the voter is authorized on.
    const council = await prisma.survivorTribalCouncil.findUnique({
      where: { id: councilId, leagueId },
      select: { id: true },
    })
    if (!council) return NextResponse.json({ error: 'Council not found' }, { status: 404 })
    try {
      const out = await submitVote(councilId, userId, targetUserId, { voterRosterId, targetRosterId })
      return NextResponse.json(out)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Conflict'
      const status = msg.startsWith('409_CONFLICT') || msg.includes('409') ? 409 : 400
      return NextResponse.json(
        { error: msg.replace(/^409_CONFLICT:\s*/, '') },
        { status },
      )
    }
  }

  if (action === 'play_idol') {
    const gate = await assertLeagueMember(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    const idolId = typeof body.idolId === 'string' ? body.idolId : ''
    const protectedUserId = typeof body.protectedUserId === 'string' ? body.protectedUserId : undefined
    if (!councilId) return NextResponse.json({ error: 'councilId required' }, { status: 400 })
    // Confirm councilId belongs to the authorized league before touching the idol.
    const council = await prisma.survivorTribalCouncil.findUnique({
      where: { id: councilId, leagueId },
      select: { id: true },
    })
    if (!council) return NextResponse.json({ error: 'Council not found' }, { status: 404 })
    const r = await playIdol(idolId, userId, councilId, protectedUserId)
    if (!r.ok) return NextResponse.json(r, { status: 400 })
    return NextResponse.json(r)
  }

  if (action === 'lock') {
    const gate = await assertLeagueCommissioner(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    if (!councilId) return NextResponse.json({ error: 'councilId required' }, { status: 400 })
    // Confirm the council belongs to the leagueId the commissioner was
    // authorized on — prevents cross-league lock via a foreign councilId.
    const council = await prisma.survivorTribalCouncil.findUnique({
      where: { id: councilId },
      select: { leagueId: true },
    })
    if (!council || council.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Council not found' }, { status: 404 })
    }
    await lockVoting(councilId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'reveal_next') {
    // Verify commissioner on the request's leagueId BEFORE any DB lookup
    // so cross-league councilId probes leak nothing about council existence.
    const gate = await assertLeagueCommissioner(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    if (!councilId) return NextResponse.json({ error: 'councilId required' }, { status: 400 })
    const council = await prisma.survivorTribalCouncil.findUnique({
      where: { id: councilId, leagueId },
      select: { revealSequence: true },
    })
    if (!council) return NextResponse.json({ error: 'Council not found' }, { status: 404 })
    const seq = Array.isArray(council.revealSequence) ? (council.revealSequence as unknown[]) : []
    if (seq.length === 0) return NextResponse.json({ step: null, remaining: 0 })
    const [step, ...remainingSeq] = seq
    await prisma.survivorTribalCouncil.update({
      where: { id: councilId },
      data: {
        revealSequence: remainingSeq as object,
        ...(remainingSeq.length === 0 && { isRevealed: true }),
      },
    })
    return NextResponse.json({ step, remaining: remainingSeq.length })
  }

  if (action === 'eliminate') {
    const gate = await assertLeagueCommissioner(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    if (!councilId) return NextResponse.json({ error: 'councilId required' }, { status: 400 })
    await buildScrollRevealSequence(councilId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'rocks_draw') {
    const gate = await assertLeagueCommissioner(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    if (!councilId) return NextResponse.json({ error: 'councilId required' }, { status: 400 })
    const council = await prisma.survivorTribalCouncil.findUnique({
      where: { id: councilId },
      select: { leagueId: true },
    })
    if (!council) return NextResponse.json({ error: 'Council not found' }, { status: 404 })
    if (council.leagueId !== leagueId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const seed = typeof body.seed === 'string' ? body.seed : undefined
    const result = await executeRocksDraw(councilId, seed)
    if (!result) return NextResponse.json({ error: 'Council is not in a tie state or no eligible drawers' }, { status: 400 })
    return NextResponse.json(result)
  }

  if (action === 'commissioner_resolve_tie') {
    const gate = await assertLeagueCommissioner(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    const eliminateRosterId = typeof body.eliminateRosterId === 'string' ? body.eliminateRosterId : ''
    if (!councilId || !eliminateRosterId) {
      return NextResponse.json({ error: 'councilId and eliminateRosterId required' }, { status: 400 })
    }
    const council = await prisma.survivorTribalCouncil.findUnique({ where: { id: councilId } })
    if (!council) return NextResponse.json({ error: 'Council not found' }, { status: 404 })
    if (council.leagueId !== leagueId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!council.isTie) return NextResponse.json({ error: 'Council is not in a tie state' }, { status: 400 })
    const tiedRosterIds = Array.isArray(council.tiePlayerIds)
      ? council.tiePlayerIds.filter((id): id is string => typeof id === 'string')
      : []
    if (!tiedRosterIds.includes(eliminateRosterId)) {
      return NextResponse.json({ error: 'eliminateRosterId must be one of the tied roster IDs' }, { status: 400 })
    }
    const eliminatedRoster = await prisma.roster.findFirst({
      where: { id: eliminateRosterId, leagueId },
      select: { platformUserId: true },
    })
    const eliminatedSurvivorPlayer = await prisma.survivorPlayer.findFirst({
      where: {
        leagueId,
        OR: [{ redraftRosterId: eliminateRosterId }, { id: eliminateRosterId }],
      },
      select: { userId: true, redraftRosterId: true },
    })
    if (!eliminatedRoster && !eliminatedSurvivorPlayer) {
      return NextResponse.json({ error: 'Eliminated roster not found' }, { status: 404 })
    }
    const resolvedEliminatedRosterId = eliminatedSurvivorPlayer?.redraftRosterId ?? eliminateRosterId
    const eliminatedUserId = eliminatedRoster?.platformUserId ?? eliminatedSurvivorPlayer?.userId ?? null
    const resolvedAt = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.survivorTribalCouncil.update({
        where: { id: councilId },
        data: {
          tiePhase: 'commissioner_resolved',
          eliminatedRosterId: resolvedEliminatedRosterId,
          closedAt: resolvedAt,
          status: 'completed',
        },
      })
      await tx.survivorTribeMember.deleteMany({
        where: { rosterId: resolvedEliminatedRosterId },
      })
      await tx.survivorGameState.updateMany({
        where: { leagueId },
        data: { tribalCompleteAt: resolvedAt, lastError: null },
      })
      await tx.survivorAuditEntry.create({
        data: {
          leagueId,
          week: council.week,
          category: 'tribal_council',
          action: 'commissioner_tie_resolve',
          actorUserId: userId,
          targetUserId: eliminatedUserId ?? null,
          data: { councilId, tiedRosterIds },
          isVisibleToCommissioner: true,
          isVisibleToPublic: false,
          isRevealablePostSeason: true,
        },
      })
    })
    await removeRosterFromTribeChat(leagueId, resolvedEliminatedRosterId).catch(() => {})
    if (eliminatedUserId) {
      await enrollInExile(leagueId, resolvedEliminatedRosterId, eliminatedUserId).catch(() => {})
    }
    const joinJury = await shouldJoinJury(leagueId, council.week).catch(() => false)
    if (joinJury) {
      await enrollJuryMember(leagueId, resolvedEliminatedRosterId, council.week).catch(() => {})
    }
    return NextResponse.json({ ok: true, eliminatedRosterId: resolvedEliminatedRosterId })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
