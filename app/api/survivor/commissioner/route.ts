import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerRole } from '@/lib/league/permissions'
import { advancePhase } from '@/lib/survivor/gameStateMachine'
import { processReturnFromExile } from '@/lib/survivor/exileEngine'
import { rebalanceTribes } from '@/lib/survivor/tribeEngine'
import { getSurvivorConfig } from '@/lib/survivor/SurvivorLeagueConfig'
import { enqueueNotification } from '@/lib/survivor/notificationEngine'
import { voidPendingRedraftTradesForRoster } from '@/lib/redraft/voidPendingTradesForElimination'

export const dynamic = 'force-dynamic'

const PAUSE_ERROR_PREFIX = 'PAUSED:'

type PausedNeedsSnapshot = {
  needsChallengeLock: boolean
  needsTribalLock: boolean
  needsExileScore: boolean
  needsPhaseAdvance: boolean
  needsWeeklyRecap: boolean
}

function createPauseError(notes: string, snapshot: PausedNeedsSnapshot): string {
  return `${PAUSE_ERROR_PREFIX}${JSON.stringify({ notes, snapshot })}`
}

function parsePauseSnapshot(lastError: string | null | undefined): PausedNeedsSnapshot | null {
  if (!lastError?.startsWith(PAUSE_ERROR_PREFIX)) return null
  const rawValue = lastError.slice(PAUSE_ERROR_PREFIX.length).trim()
  if (!rawValue.startsWith('{')) return null
  try {
    const parsed = JSON.parse(rawValue) as { snapshot?: Partial<PausedNeedsSnapshot> } | null
    const snapshot = parsed?.snapshot
    if (!snapshot) return null
    if (
      typeof snapshot.needsChallengeLock !== 'boolean' ||
      typeof snapshot.needsTribalLock !== 'boolean' ||
      typeof snapshot.needsExileScore !== 'boolean' ||
      typeof snapshot.needsPhaseAdvance !== 'boolean' ||
      typeof snapshot.needsWeeklyRecap !== 'boolean'
    ) {
      return null
    }
    return {
      needsChallengeLock: snapshot.needsChallengeLock,
      needsTribalLock: snapshot.needsTribalLock,
      needsExileScore: snapshot.needsExileScore,
      needsPhaseAdvance: snapshot.needsPhaseAdvance,
      needsWeeklyRecap: snapshot.needsWeeklyRecap,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  const type = req.nextUrl.searchParams?.get('type')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  await requireCommissionerRole(leagueId, userId)

  if (type === 'state') {
    const gs = await prisma.survivorGameState.findUnique({ where: { leagueId } })
    const challenge = gs?.activeChallengeId
      ? await prisma.survivorChallenge.findUnique({ where: { id: gs.activeChallengeId } })
      : null
    return NextResponse.json({
      gameState: gs,
      challengeLocksAt: challenge?.locksAt ?? challenge?.lockAt ?? null,
    })
  }

  const actions = await prisma.survivorCommissionerAction.findMany({
    where: { leagueId },
    orderBy: { executedAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ actions })
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

  const action = typeof body.action === 'string' ? body.action : ''
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : ''
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  await requireCommissionerRole(leagueId, userId)

  const log = async (
    actionType: string,
    description: string,
    extra?: { targetUserId?: string; targetTribeId?: string; previousState?: object; newState?: object; week?: number },
  ) => {
    await prisma.survivorCommissionerAction.create({
      data: {
        leagueId,
        commissionerId: userId,
        actionType,
        description,
        targetUserId: extra?.targetUserId,
        targetTribeId: extra?.targetTribeId,
        previousState: extra?.previousState as object | undefined,
        newState: extra?.newState as object | undefined,
        week: extra?.week,
      },
    })
  }

  if (action === 'force_phase') {
    const toPhase = typeof body.toPhase === 'string' ? body.toPhase : ''
    const notes = typeof body.notes === 'string' ? body.notes : undefined
    if (!toPhase) return NextResponse.json({ error: 'toPhase required' }, { status: 400 })
    await advancePhase(leagueId, 'commissioner', userId, { toPhase, notes })
    await log('force_phase', notes ?? `Advance to ${toPhase}`, { newState: { toPhase } })
    return NextResponse.json({ ok: true })
  }

  if (action === 'override_tribal') {
    const councilId = typeof body.councilId === 'string' ? body.councilId : ''
    const eliminateUserId = typeof body.eliminateUserId === 'string' ? body.eliminateUserId : ''
    const notes = typeof body.notes === 'string' ? body.notes : ''
    if (!councilId || !eliminateUserId) {
      return NextResponse.json({ error: 'councilId and eliminateUserId required' }, { status: 400 })
    }
    const council = await prisma.survivorTribalCouncil.findFirst({
      where: { id: councilId, leagueId },
    })
    const victim = await prisma.survivorPlayer.findUnique({
      where: { leagueId_userId: { leagueId, userId: eliminateUserId } },
    })
    const prev = council ? { eliminatedUserId: council.eliminatedUserId, eliminatedName: council.eliminatedName } : {}
    await prisma.survivorTribalCouncil.update({
      where: { id: councilId },
      data: {
        eliminatedUserId: eliminateUserId,
        eliminatedName: victim?.displayName ?? '',
        auditLog: { commissionerOverride: true, notes } as object,
      },
    })
    if (victim) {
      await prisma.survivorPlayer.update({
        where: { leagueId_userId: { leagueId, userId: eliminateUserId } },
        data: { playerState: 'eliminated', eliminatedWeek: council?.week ?? victim.eliminatedWeek },
      })
    }
    await log('override_tribal', notes || 'Tribal result overridden', {
      targetUserId: eliminateUserId,
      previousState: prev as object,
      newState: { eliminateUserId },
      week: council?.week,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'grant_return') {
    const targetUserId = typeof body.userId === 'string' ? body.userId : ''
    const notes = typeof body.notes === 'string' ? body.notes : ''
    if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const week = typeof body.week === 'number' ? body.week : undefined
    await processReturnFromExile(leagueId, { week })
    await log('grant_return', notes || 'Return from exile (manual)', { targetUserId, week })
    return NextResponse.json({ ok: true })
  }

  if (action === 'adjust_score') {
    const targetUserId = typeof body.userId === 'string' ? body.userId : ''
    const week = typeof body.week === 'number' ? body.week : 0
    const adjustmentAmount = typeof body.adjustmentAmount === 'number' ? body.adjustmentAmount : 0
    const notes = typeof body.notes === 'string' ? body.notes : ''
    if (!targetUserId || !week) {
      return NextResponse.json({ error: 'userId and week required' }, { status: 400 })
    }
    const existing = await prisma.survivorWeeklyScore.findUnique({
      where: { leagueId_userId_week: { leagueId, userId: targetUserId, week } },
    })
    const prev = existing ? { finalScore: existing.finalScore } : {}
    const nextFinal = (existing?.finalScore ?? 0) + adjustmentAmount
    await prisma.survivorWeeklyScore.upsert({
      where: { leagueId_userId_week: { leagueId, userId: targetUserId, week } },
      create: {
        leagueId,
        userId: targetUserId,
        week,
        finalScore: nextFinal,
        fantasyScore: 0,
        correctionApplied: true,
      },
      update: {
        finalScore: nextFinal,
        correctionApplied: true,
      },
    })
    await log('adjust_score', notes || `Adjust score by ${adjustmentAmount}`, {
      targetUserId,
      previousState: prev as object,
      newState: { finalScore: nextFinal },
      week,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'grant_idol') {
    const targetUserId = typeof body.userId === 'string' ? body.userId : ''
    const powerType = typeof body.powerType === 'string' ? body.powerType : ''
    const notes = typeof body.notes === 'string' ? body.notes : ''
    if (!targetUserId || !powerType) {
      return NextResponse.json({ error: 'userId and powerType required' }, { status: 400 })
    }
    const config = await getSurvivorConfig(leagueId)
    if (!config) return NextResponse.json({ error: 'Survivor config missing' }, { status: 400 })
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: targetUserId },
      select: { id: true },
    })
    if (!roster) return NextResponse.json({ error: 'Roster not found for user' }, { status: 400 })
    await prisma.survivorIdol.create({
      data: {
        leagueId,
        configId: config.configId,
        rosterId: roster.id,
        playerId: `bound_${roster.id}`,
        powerType,
        powerLabel: powerType.replace(/_/g, ' '),
        currentOwnerUserId: targetUserId,
        originalOwnerUserId: targetUserId,
        status: 'hidden',
      },
    })
    await log('grant_idol', notes || `Granted ${powerType}`, { targetUserId, newState: { powerType } })
    return NextResponse.json({ ok: true })
  }

  if (action === 'rebalance') {
    const notes = typeof body.notes === 'string' ? body.notes : ''
    await rebalanceTribes(leagueId)
    await log('change_setting', notes || 'Force tribe rebalance', {})
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_player') {
    const targetUserId = typeof body.userId === 'string' ? body.userId : ''
    const reason = typeof body.reason === 'string' ? body.reason : 'removed'
    if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const openCouncil = await prisma.survivorTribalCouncil.findFirst({
      where: { leagueId, status: 'voting_open' },
      select: { id: true },
    })
    if (openCouncil) {
      await prisma.survivorVote.deleteMany({ where: { councilId: openCouncil.id } })
    }

    await prisma.survivorIdol.updateMany({
      where: { leagueId, currentOwnerUserId: targetUserId, isUsed: false },
      data: { status: 'expired', expiredAt: new Date() },
    })

    const r0 = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: targetUserId },
      select: { id: true },
    })
    if (r0) {
      await voidPendingRedraftTradesForRoster(leagueId, r0.id).catch(() => {})
    }

    await prisma.survivorPlayer.updateMany({
      where: { leagueId, userId: targetUserId },
      data: { playerState: 'eliminated' },
    })

    await log('remove_player', reason, { targetUserId, newState: { playerState: 'eliminated' } })

    await enqueueNotification(leagueId, 'phase_change', {
      recipientRole: 'all',
      title: 'League update',
      body: 'A player has been removed from the season.',
      isSpoilerSafe: true,
      urgency: 'high',
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'pause_season') {
    const notes = typeof body.notes === 'string' ? body.notes : 'Season paused by commissioner'
    const currentState = await prisma.survivorGameState.findUnique({
      where: { leagueId },
      select: {
        needsChallengeLock: true,
        needsTribalLock: true,
        needsExileScore: true,
        needsPhaseAdvance: true,
        needsWeeklyRecap: true,
      },
    })
    const pausedSnapshot: PausedNeedsSnapshot = {
      needsChallengeLock: currentState?.needsChallengeLock ?? false,
      needsTribalLock: currentState?.needsTribalLock ?? false,
      needsExileScore: currentState?.needsExileScore ?? false,
      needsPhaseAdvance: currentState?.needsPhaseAdvance ?? false,
      needsWeeklyRecap: currentState?.needsWeeklyRecap ?? false,
    }
    await prisma.survivorGameState.update({
      where: { leagueId },
      data: {
        needsChallengeLock: false,
        needsTribalLock: false,
        needsExileScore: false,
        needsPhaseAdvance: false,
        needsWeeklyRecap: false,
        pausedSnapshot: pausedSnapshot as unknown as Prisma.InputJsonValue,
        // Keep the legacy string marker as well so older resume paths
        // that still look at lastError continue to behave, but the
        // authoritative snapshot now lives in pausedSnapshot.
        lastError: createPauseError(notes, pausedSnapshot),
      },
    })
    await log('pause_season', notes)
    await enqueueNotification(leagueId, 'phase_change', {
      recipientRole: 'all',
      title: 'Season Paused',
      body: notes,
      isSpoilerSafe: true,
      urgency: 'high',
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'resume_season') {
    const notes = typeof body.notes === 'string' ? body.notes : 'Season resumed'
    const currentState = await prisma.survivorGameState.findUnique({
      where: { leagueId },
      select: {
        lastError: true,
        pausedSnapshot: true,
        needsChallengeLock: true,
        needsTribalLock: true,
        needsExileScore: true,
        needsPhaseAdvance: true,
        needsWeeklyRecap: true,
      },
    })
    // Authoritative source: the dedicated pausedSnapshot JSON column.
    // Fall back to the legacy lastError-embedded snapshot only if the
    // new column is empty (older paused seasons).
    const dbSnapshot =
      (currentState?.pausedSnapshot as PausedNeedsSnapshot | null) ?? null
    const legacySnapshot = parsePauseSnapshot(currentState?.lastError)
    const pausedSnapshot: PausedNeedsSnapshot | null = dbSnapshot ?? legacySnapshot
    const isLegacyPausedState = Boolean(
      !pausedSnapshot &&
        currentState?.lastError?.startsWith(PAUSE_ERROR_PREFIX),
    )
    await prisma.survivorGameState.update({
      where: { leagueId },
      data: {
        needsChallengeLock:
          pausedSnapshot?.needsChallengeLock ?? (isLegacyPausedState ? true : currentState?.needsChallengeLock ?? false),
        needsTribalLock:
          pausedSnapshot?.needsTribalLock ?? (isLegacyPausedState ? true : currentState?.needsTribalLock ?? false),
        needsExileScore:
          pausedSnapshot?.needsExileScore ?? (isLegacyPausedState ? true : currentState?.needsExileScore ?? false),
        needsPhaseAdvance:
          pausedSnapshot?.needsPhaseAdvance ?? (isLegacyPausedState ? true : currentState?.needsPhaseAdvance ?? false),
        needsWeeklyRecap:
          pausedSnapshot?.needsWeeklyRecap ?? (isLegacyPausedState ? false : currentState?.needsWeeklyRecap ?? false),
        pausedSnapshot: Prisma.JsonNull,
        lastError: null,
      },
    })
    await log('resume_season', notes)
    await enqueueNotification(leagueId, 'phase_change', {
      recipientRole: 'all',
      title: 'Season Resumed',
      body: notes,
      isSpoilerSafe: true,
      urgency: 'medium',
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

