/**
 * Draft session: get or create, build snapshot for client, start/pause/complete.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getDraftConfigForLeague } from '@/lib/draft-defaults/DraftRoomConfigResolver'
import { resolveCurrentOnTheClock } from './CurrentOnTheClockResolver'
import { resolvePickOwner } from './PickOwnershipResolver'
import { computeTimerState, computeTimerStateWithPauseWindow } from './DraftTimerService'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { formatPickLabel } from './DraftOrderService'
import { getManagerColorBySeed } from '@/lib/draft-room'
import {
  getAuctionStateFromSession,
  getBudgetsFromSession,
  getAuctionConfigFromSession,
} from './auction/AuctionEngine'
import type { DraftSessionSnapshot, DraftPickSnapshot, SlotOrderEntry, TradedPickRecord, AuctionSessionSnapshot, KeeperSessionSnapshot, DevySessionSnapshot, C2CSessionSnapshot } from './types'
import { buildKeeperLocks } from './keeper/KeeperDraftOrder'
import type { KeeperConfig, KeeperSelection } from './keeper/types'

export async function getOrCreateDraftSession(leagueId: string): Promise<{
  session: { id: string; leagueId: string; status: string; slotOrder: unknown; teamCount: number; rounds: number; draftType: string; thirdRoundReversal: boolean; timerSeconds: number | null; timerEndAt: Date | null; pausedRemainingSeconds: number | null; version: number; updatedAt: Date }
  created: boolean
}> {
  let session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (session) {
    return { session: session as any, created: false }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { rosters: true, teams: true },
  })
  if (!league) throw new Error('League not found')

  const [config, uiSettings] = await Promise.all([
    getDraftConfigForLeague(leagueId),
    getDraftUISettingsForLeague(leagueId),
  ])
  const teamCount = league.leagueSize ?? 12
  const rounds = config?.rounds ?? 15
  const draftType = (config?.draft_type ?? 'snake') as string
  const thirdRoundReversal = config?.third_round_reversal ?? false
  const baseTimerSeconds = config?.timer_seconds ?? 90
  const slowTimerSeconds = config?.slow_timer_seconds ?? Math.max(3600, baseTimerSeconds)
  const timerSeconds =
    uiSettings.timerMode === 'soft_pause' || uiSettings.timerMode === 'overnight_pause'
      ? slowTimerSeconds
      : baseTimerSeconds

  const teams = league.teams ?? []
  const rosters = league.rosters ?? []
  const slotOrder: SlotOrderEntry[] = (rosters.length >= teamCount
    ? rosters.slice(0, teamCount).map((r, i) => ({
        slot: i + 1,
        rosterId: r.id,
        displayName: teams[i]?.ownerName || teams[i]?.teamName || `Team ${i + 1}`,
      }))
    : teams.length >= teamCount
      ? teams.slice(0, teamCount).map((t, i) => ({
          slot: i + 1,
          rosterId: t.id,
          displayName: t.ownerName || t.teamName || `Team ${i + 1}`,
        }))
      : []
  ).map((e) => ({ slot: e.slot, rosterId: e.rosterId, displayName: e.displayName }))

  if (slotOrder.length === 0) {
    slotOrder.push(
      ...Array.from({ length: teamCount }, (_, i) => ({
        slot: i + 1,
        rosterId: `placeholder-${i + 1}`,
        displayName: `Team ${i + 1}`,
      }))
    )
  }

  session = await (prisma as any).draftSession.create({
    data: {
      leagueId,
      sportType: league.sport ?? null,
      status: 'pre_draft',
      draftType,
      rounds,
      teamCount,
      thirdRoundReversal,
      timerSeconds,
      slotOrder: slotOrder as any,
    },
  })
  return { session: session as any, created: true }
}

export async function getDraftSessionByLeague(leagueId: string) {
  return prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
}

/**
 * Build full snapshot for client (reconnect/resync).
 */
export async function buildSessionSnapshot(
  leagueId: string,
  now: Date = new Date()
): Promise<DraftSessionSnapshot | null> {
  const session = await getDraftSessionByLeague(leagueId)
  if (!session) return null

  const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[]) ?? []
  const teamCount = session.teamCount
  const totalPicks = session.rounds * teamCount
  const picksCount = session.picks.length
  const tradedPicks: TradedPickRecord[] = Array.isArray(session.tradedPicks)
    ? (session.tradedPicks as unknown as TradedPickRecord[])
    : []
  let currentPick = resolveCurrentOnTheClock({
    totalPicks,
    picksCount,
    teamCount,
    draftType: session.draftType as 'snake' | 'linear' | 'auction',
    thirdRoundReversal: session.thirdRoundReversal,
    slotOrder,
  })
  if (currentPick && tradedPicks.length > 0) {
    const resolved = resolvePickOwner(currentPick.round, currentPick.slot, slotOrder, tradedPicks)
    if (resolved) {
      currentPick = { ...currentPick, rosterId: resolved.rosterId, displayName: resolved.displayName }
    }
  }

  const uiSettings = await getDraftUISettingsForLeague(leagueId)
  const pauseWindow = uiSettings.timerMode === 'overnight_pause' && uiSettings.slowDraftPauseWindow
    ? uiSettings.slowDraftPauseWindow
    : null
  const timer = computeTimerStateWithPauseWindow(
    {
      status: session.status,
      timerSeconds: session.timerSeconds,
      timerEndAt: session.timerEndAt,
      pausedRemainingSeconds: session.pausedRemainingSeconds,
    },
    now,
    pauseWindow
  )

  const isSlowDraft = (session.timerSeconds ?? 0) >= 3600 || uiSettings.timerMode === 'overnight_pause'

  const picks: DraftPickSnapshot[] = session.picks.map((p) => {
    // Emit traded-pick metadata according to commissioner UI settings.
    // No-trade picks never receive override metadata.
    const rawMeta = (p.tradedPickMeta ?? null) as Record<string, unknown> | null
    let tradedMeta: DraftPickSnapshot['tradedPickMeta'] = null
    if (rawMeta) {
      const resolved = { ...rawMeta } as Record<string, unknown>
      if (uiSettings.tradedPickOwnerNameRedEnabled) {
        resolved.showNewOwnerInRed = true
      } else {
        resolved.showNewOwnerInRed = false
      }
      if (uiSettings.tradedPickColorModeEnabled) {
        const seed = String(resolved.newOwnerName ?? p.rosterId ?? p.displayName ?? 'manager')
        resolved.tintColor = String(resolved.tintColor ?? getManagerColorBySeed(seed).tintHex)
      } else {
        delete resolved.tintColor
      }
      tradedMeta = resolved as DraftPickSnapshot['tradedPickMeta']
    }
    return {
    id: p.id,
    overall: p.overall,
    round: p.round,
    slot: p.slot,
    rosterId: p.rosterId,
    displayName: p.displayName,
    playerName: p.playerName,
    position: p.position,
    team: p.team,
    byeWeek: p.byeWeek,
    playerId: p.playerId,
    tradedPickMeta: tradedMeta,
    source: p.source ?? 'user',
    pickLabel: formatPickLabel(p.overall, teamCount),
    amount: (p as any).amount ?? undefined,
    createdAt: p.createdAt.toISOString(),
    }
  })

  let auction: AuctionSessionSnapshot | undefined
  if (session.draftType === 'auction') {
    const config = getAuctionConfigFromSession(session)
    const auctionState = getAuctionStateFromSession(session) ?? {
      nominationOrderIndex: 0,
      currentNomination: null,
      currentBid: 0,
      currentBidderRosterId: null,
      bidTimerEndAt: null,
      minNextBid: config.minBid,
    }
    auction = {
      draftType: 'auction',
      budgetPerTeam: config.budgetPerTeam,
      budgets: getBudgetsFromSession(session),
      auctionState,
      minBidIncrement: config.minBidIncrement,
      nominationOrder: slotOrder,
    }
    const auctionNominator =
      slotOrder[((Math.max(0, auctionState.nominationOrderIndex) % Math.max(1, slotOrder.length)) + Math.max(1, slotOrder.length)) % Math.max(1, slotOrder.length)]
    if (auctionNominator) {
      const overall = picksCount + 1
      const round = Math.ceil(overall / teamCount)
      currentPick = {
        overall,
        round,
        slot: auctionNominator.slot,
        rosterId: auctionNominator.rosterId,
        displayName: auctionNominator.displayName,
        pickLabel: formatPickLabel(overall, teamCount),
      }
    }
  }

  let devy: DevySessionSnapshot | undefined
  const rawDevyConfig = session.devyConfig ?? (session as any).devyConfig
  if (rawDevyConfig && typeof rawDevyConfig === 'object' && (rawDevyConfig as any).enabled) {
    const cfg = rawDevyConfig as { devyRounds?: number[] }
    devy = {
      enabled: true,
      devyRounds: Array.isArray(cfg.devyRounds) ? cfg.devyRounds : [],
    }
  }

  let c2c: C2CSessionSnapshot | undefined
  const rawC2cConfig = session.c2cConfig ?? (session as any).c2cConfig
  if (rawC2cConfig && typeof rawC2cConfig === 'object' && (rawC2cConfig as any).enabled) {
    const cfg = rawC2cConfig as { collegeRounds?: number[] }
    c2c = {
      enabled: true,
      collegeRounds: Array.isArray(cfg.collegeRounds) ? cfg.collegeRounds : [],
    }
  }

  let keeper: KeeperSessionSnapshot | undefined
  const rawKeeperConfig = session.keeperConfig ?? (session as any).keeperConfig
  const rawKeeperSelections = session.keeperSelections ?? (session as any).keeperSelections
  if (rawKeeperConfig && typeof rawKeeperConfig === 'object') {
    const config = rawKeeperConfig as KeeperConfig
    const selections: KeeperSelection[] = Array.isArray(rawKeeperSelections) ? rawKeeperSelections as KeeperSelection[] : []
    const locks = buildKeeperLocks(
      selections,
      slotOrder,
      tradedPicks,
      session.teamCount,
      session.rounds,
      session.draftType as 'snake' | 'linear' | 'auction',
      session.thirdRoundReversal
    )
    keeper = {
      config: {
        maxKeepers: config.maxKeepers ?? 0,
        deadline: config.deadline ?? null,
        maxKeepersPerPosition: config.maxKeepersPerPosition ?? undefined,
      },
      selections: selections.map((s) => ({
        rosterId: s.rosterId,
        roundCost: s.roundCost,
        playerName: s.playerName,
        position: s.position,
        team: s.team ?? null,
        playerId: s.playerId ?? null,
        commissionerOverride: s.commissionerOverride,
      })),
      locks,
    }
  }

  return {
    id: session.id,
    leagueId: session.leagueId,
    status: session.status as any,
    draftType: session.draftType as any,
    rounds: session.rounds,
    teamCount: session.teamCount,
    thirdRoundReversal: session.thirdRoundReversal,
    timerSeconds: session.timerSeconds,
    timerEndAt: session.timerEndAt?.toISOString() ?? null,
    pausedRemainingSeconds: session.pausedRemainingSeconds,
    slotOrder,
    tradedPicks,
    version: session.version,
    picks,
    currentPick,
    timer,
    updatedAt: session.updatedAt.toISOString(),
    auction,
    isSlowDraft,
    keeper,
    devy,
    c2c,
  }
}

export async function startDraftSession(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session || session.status !== 'pre_draft') return false

  if (session.draftType === 'auction') {
    const { initializeAuctionForSession } = await import('./auction/AuctionEngine')
    await initializeAuctionForSession(leagueId)
    try {
      const { isSalaryCapLeague } = await import('@/lib/salary-cap/SalaryCapLeagueConfig')
      const { initializeStartupLedgers } = await import('@/lib/salary-cap/AuctionStartupService')
      if (await isSalaryCapLeague(leagueId)) {
        const ledgers = await initializeStartupLedgers(leagueId)
        if (!ledgers.ok) console.warn('[startDraftSession] Salary cap ledger init:', ledgers.error)
      }
    } catch (e) {
      console.warn('[startDraftSession] Salary cap startup ledger init non-fatal:', e)
    }
    await prisma.draftSession.update({
      where: { id: session.id },
      data: { status: 'in_progress', pausedRemainingSeconds: null, version: { increment: 1 } },
    })
    return true
  }

  const timerSeconds = session.timerSeconds ?? 90
  const timerEndAt = new Date(Date.now() + timerSeconds * 1000)
  await prisma.draftSession.update({
    where: { id: session.id },
    data: { status: 'in_progress', timerEndAt, pausedRemainingSeconds: null, version: { increment: 1 } },
  })
  return true
}

export async function pauseDraftSession(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session || session.status !== 'in_progress') return false
  const now = new Date()
  const remaining = session.timerEndAt
    ? Math.max(0, Math.ceil((session.timerEndAt.getTime() - now.getTime()) / 1000))
    : session.timerSeconds ?? 0
  await prisma.draftSession.update({
    where: { id: session.id },
    data: { status: 'paused', timerEndAt: null, pausedRemainingSeconds: remaining, version: { increment: 1 } },
  })
  return true
}

export async function resumeDraftSession(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session || session.status !== 'paused') return false
  const sec = session.pausedRemainingSeconds ?? session.timerSeconds ?? 90
  const timerEndAt = new Date(Date.now() + sec * 1000)
  const auctionState =
    session.draftType === 'auction' &&
    session.auctionState &&
    typeof session.auctionState === 'object' &&
    !Array.isArray(session.auctionState)
      ? (session.auctionState as Record<string, unknown>)
      : null
  await prisma.draftSession.update({
    where: { id: session.id },
    data: {
      status: 'in_progress',
      timerEndAt,
      pausedRemainingSeconds: null,
      ...(auctionState
        ? {
            auctionState: {
              ...auctionState,
              bidTimerEndAt: timerEndAt.toISOString(),
            } as any,
          }
        : {}),
      version: { increment: 1 },
    },
  })
  return true
}

export async function resetTimer(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session || (session.status !== 'in_progress' && session.status !== 'paused')) return false
  const timerSeconds = session.timerSeconds ?? 90
  const timerEndAt = new Date(Date.now() + timerSeconds * 1000)
  const auctionState =
    session.draftType === 'auction' &&
    session.auctionState &&
    typeof session.auctionState === 'object' &&
    !Array.isArray(session.auctionState)
      ? (session.auctionState as Record<string, unknown>)
      : null
  await prisma.draftSession.update({
    where: { id: session.id },
    data: {
      status: 'in_progress',
      timerEndAt,
      pausedRemainingSeconds: null,
      ...(auctionState
        ? {
            auctionState: {
              ...auctionState,
              bidTimerEndAt: timerEndAt.toISOString(),
            } as any,
          }
        : {}),
      version: { increment: 1 },
    },
  })
  return true
}

/**
 * Update draft session timer length (seconds). Optionally reset current timer with new value.
 */
export async function setTimerSeconds(
  leagueId: string,
  seconds: number,
  options?: { resetCurrentTimer?: boolean }
): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session) return false
  const sec = Math.max(0, Math.min(86400, Math.round(seconds)))
  const data: Prisma.DraftSessionUpdateInput = {
    timerSeconds: sec,
    version: { increment: 1 },
  }
  if (options?.resetCurrentTimer && (session.status === 'in_progress' || session.status === 'paused')) {
    data.timerEndAt = new Date(Date.now() + sec * 1000)
    data.pausedRemainingSeconds = null
    if (
      session.draftType === 'auction' &&
      session.auctionState &&
      typeof session.auctionState === 'object' &&
      !Array.isArray(session.auctionState)
    ) {
      data.auctionState = {
        ...(session.auctionState as Record<string, unknown>),
        bidTimerEndAt: data.timerEndAt.toISOString(),
      } as Prisma.InputJsonValue
    }
  }
  await prisma.draftSession.update({
    where: { id: session.id },
    data: { ...data, updatedAt: new Date() },
  })
  return true
}

export async function undoLastPick(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'desc' }, take: 1 } },
  })
  if (!session || session.picks.length === 0) return false
  const last = session.picks[0]
  await prisma.$transaction(async (tx) => {
    await tx.draftPick.delete({ where: { id: last.id } })
    await tx.draftSession.update({
      where: { id: session.id },
      data: { version: { increment: 1 }, updatedAt: new Date() },
    })
  })
  return true
}

export async function completeDraftSession(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session) return false
  const totalPicks = session.rounds * session.teamCount
  const count = await prisma.draftPick.count({ where: { sessionId: session.id } })
  if (count < totalPicks) return false
  await prisma.draftSession.update({
    where: { id: session.id },
    data: { status: 'completed', timerEndAt: null, pausedRemainingSeconds: null, version: { increment: 1 } },
  })
  import('@/lib/live-draft-engine/RosterAssignmentService').then((m) => m.finalizeRosterAssignments(leagueId)).catch(() => {})
  import('@/lib/survivor/SurvivorDraftBootstrapService').then((m) => m.runSurvivorPostDraftBootstrap(leagueId)).catch(() => {})
  // Post-draft manager rankings (PROMPT 231): compute in background so /draft-results loads fast
  import('@/lib/post-draft-manager-ranking').then((m) => m.computeAndPersistDraftRankings(leagueId)).catch(() => {})
  // PROMPT 307 — Award draft_completed achievement (progression only, no money)
  prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } }).then((league) => {
    if (league?.userId) {
      import('@/lib/achievement-system').then((m) => m.awardAchievement(league.userId, 'draft_completed', { leagueId })).catch(() => {})
    }
  }).catch(() => {})
  return true
}

/**
 * Commissioner-only: reset draft to pre_draft (delete all picks, clear timer/auction state).
 */
export async function resetDraftSession(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session) return false
  await prisma.$transaction(async (tx) => {
    await tx.draftPick.deleteMany({ where: { sessionId: session.id } })
    await tx.draftSession.update({
      where: { id: session.id },
      data: {
        status: 'pre_draft',
        timerEndAt: null,
        pausedRemainingSeconds: null,
        auctionBudgets: Prisma.JsonNull,
        auctionState: Prisma.JsonNull,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    })
  })
  return true
}
