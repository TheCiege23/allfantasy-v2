import 'server-only'

import { prisma } from '@/lib/prisma'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { draftStreamStore } from '@/lib/draft/draft-stream-store'
import { assertLiveDraftContext } from '@/lib/draft/resolve-draft-context'
import {
  buildSessionSnapshot,
  completeDraftSession,
  pauseDraftSession,
  resetTimer,
  resumeDraftSession,
  startDraftSession,
} from '@/lib/live-draft-engine/DraftSessionService'
import { submitPick, type SubmitPickInput } from '@/lib/live-draft-engine/PickSubmissionService'
import { getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { publishDraftIntelState } from '@/lib/draft-intelligence'
import { buildDeterministicPostDraftRecap } from '@/lib/post-draft'
import { getDefaultRosterSlotsForSport } from '@/lib/draft-room'
import { runDraftAIAssist } from '@/lib/draft-ai-engine'
import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'
import { getDevyConfig } from '@/lib/devy/DevyLeagueConfig'
import { getC2CConfig } from '@/lib/merged-devy-c2c/C2CLeagueConfig'
import {
  type ADPSource,
  type ADPRanking,
  type ADPWeights,
  blendAdpRankings,
  getAdpRankings,
  setCustomAdpRankings,
} from './adp-blender'
import {
  type AuctionResult,
  type BidResult,
  type NominationResult,
  closeDraftAuction,
  nominateDraftPlayer,
  placeDraftBid,
} from './auction-engine'
import {
  type LotteryResult,
  assignDraftOrder as assignLotteryDraftOrder,
  runDraftLottery,
} from './lottery-engine'

export type Pick = {
  id: string
  overall: number
  round: number
  slot: number
  rosterId: string
  displayName: string | null
  playerId: string | null
  playerName: string
  position: string
  team: string | null
  amount?: number | null
  source: string
  createdAt: string
}

export type PickResult = {
  ok: boolean
  pick: Pick
  state: DraftState
}

export type DraftRecap = {
  draftId: string
  leagueId: string
  leagueName: string
  sport: string
  recap: string
  sections: Record<string, unknown>
}

export type DraftPlayerPoolEntry = {
  playerId: string
  name: string
  position: string
  team: string | null
  adp: number | null
  source?: 'pro' | 'college'
  poolType?: 'college' | 'pro'
  school?: string | null
  conference?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  projectedLandingSpot?: string | null
  nextGameLabel?: string | null
  isDevy?: boolean
  projectedPoints?: number | null
  weeklyPoints?: number | null
  rosteredPercent?: number | null
  headshotUrl?: string | null
}

export type AIPickRecommendation = {
  player: {
    playerId: string | null
    name: string
    position: string
    team: string | null
  } | null
  reason: string
  confidence: number
  queue: Array<{
    playerId: string | null
    playerName: string
    position: string
    team: string | null
    reason: string
  }>
  alerts: string[]
}

export type LookaheadResult = {
  queue: AIPickRecommendation['queue']
  predictions: Array<Record<string, unknown>>
  alerts: string[]
}

export type DraftState = {
  draftId: string
  leagueId: string
  leagueName: string
  sport: string
  format: string
  formatType?: string
  draftType: string
  routeType: 'snake' | 'auction' | 'lottery'
  status: string
  teamCount: number
  rounds: number
  currentRound: number
  currentPickNumber: number
  currentTeamId: string | null
  currentUserRosterId: string | null
  timerSeconds: number | null
  timerRemainingSeconds: number | null
  timerActive: boolean
  adpSource: ADPSource
  slotOrder: Array<{ slot: number; rosterId: string; displayName: string; budgetRemaining?: number | null }>
  picks: Pick[]
  availablePlayers: DraftPlayerPoolEntry[]
  chatMessages: Array<{ id: string; from: string; text: string; at: string }>
  aiQueue: AIPickRecommendation['queue']
  aiHeadline: string | null
  auction?: DraftSessionSnapshot['auction']
  updatedAt: string
}

type WorkerOptions = {
  viewerUserId?: string
}

type DraftPickSource = NonNullable<SubmitPickInput['source']>

type ResolvedDraftPlayer = {
  playerId: string
  playerName: string
  position: string
  team: string | null
  byeWeek: number | null
  pickSource: DraftPickSource | null
}

type CollegeDraftPlayerQueryRow = {
  id: string
  name: string
  position: string
  school?: string | null
  conference?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  nflTeam?: string | null
  nextGameLabel?: string | null
  devyAdp?: number | null
  projectedC2CPoints?: number | null
  c2cPointsWeek?: number | null
  headshotUrl?: string | null
}

function normalizeAdpSource(raw: unknown): ADPSource {
  const value = String(raw ?? 'blended').toLowerCase()
  if (value === 'api') return 'api'
  if (value === 'global_app') return 'global_app'
  if (value === 'ai') return 'ai'
  if (value === 'custom') return 'custom'
  return 'blended'
}

async function resolvePlayerById(
  leagueId: string,
  sport: string,
  playerId: string,
  settings?: Record<string, unknown> | null
): Promise<ResolvedDraftPlayer | null> {
  const fromPool = await getPlayerPoolForLeague(leagueId, sport as any, { limit: 500 }).catch(() => [])
  const poolMatch = fromPool.find((entry: any) => {
    const ids = [
      entry.player_id,
      entry.external_source_id,
    ].filter(Boolean)
    return ids.includes(playerId)
  })

  if (poolMatch) {
    return {
      playerId:
        String(
          poolMatch.player_id ??
          poolMatch.external_source_id ??
          playerId
        ),
      playerName: String(poolMatch.full_name ?? ''),
      position: String(poolMatch.position ?? ''),
      team: poolMatch.team_abbreviation ?? poolMatch.team ?? null,
      byeWeek: null,
      pickSource: null,
    }
  }

  const devyPlayer = await prisma.devyPlayer.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      name: true,
      position: true,
      school: true,
      graduatedToNFL: true,
    },
  }).catch(() => null)
  if (devyPlayer?.id) {
    const requestedDraftType = String(settings?.requested_draft_type ?? settings?.draft_type ?? '').toLowerCase()
    const pickSource: DraftPickSource =
      devyPlayer.graduatedToNFL
        ? 'promoted_devy'
        : requestedDraftType.startsWith('devy_')
          ? 'devy'
          : 'college'

    return {
      playerId: devyPlayer.id,
      playerName: devyPlayer.name,
      position: devyPlayer.position,
      team: devyPlayer.school ?? null,
      byeWeek: null,
      pickSource,
    }
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, position: true, team: true },
  })
  if (player?.id) {
    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      team: player.team ?? null,
      byeWeek: null,
      pickSource: null,
    }
  }

  const sportsPlayer = await prisma.sportsPlayer.findFirst({
    where: {
      OR: [{ id: playerId }, { externalId: playerId }],
    },
    select: { id: true, name: true, position: true, team: true },
  })
  if (sportsPlayer?.id) {
    return {
      playerId: sportsPlayer.id,
      playerName: sportsPlayer.name,
      position: sportsPlayer.position ?? '',
      team: sportsPlayer.team ?? null,
      byeWeek: null,
      pickSource: null,
    }
  }

  return null
}

async function buildAvailablePlayers(
  leagueId: string,
  sport: string,
  draftedNames: Set<string>,
  settings?: Record<string, unknown> | null
): Promise<DraftPlayerPoolEntry[]> {
  const pool = await getPlayerPoolForLeague(leagueId, sport as any, { limit: 500 }).catch(() => [])
  const [devyConfig, c2cConfig] = await Promise.all([
    getDevyConfig(leagueId).catch(() => null),
    getC2CConfig(leagueId).catch(() => null),
  ])
  const requestedDraftType = String(settings?.requested_draft_type ?? settings?.draft_type ?? '').toLowerCase()
  const isDevyDraft = requestedDraftType.startsWith('devy_')
  const isC2CDraft = requestedDraftType.startsWith('c2c_')
  const includeCollege = isDevyDraft || isC2CDraft || Boolean(devyConfig) || Boolean(c2cConfig)
  const collegeOnly = isDevyDraft || (isC2CDraft && c2cConfig?.mixProPlayers === false)

  const proEntries = pool
    .filter((entry: any) => !draftedNames.has(String(entry.full_name ?? '').trim()))
    .map((entry: any, index: number) => ({
      playerId: String(
        entry.player_id ??
        entry.external_source_id ??
        `${entry.full_name}-${entry.position}-${entry.team_abbreviation ?? entry.team ?? 'FA'}`
      ),
      name: String(entry.full_name ?? ''),
      position: String(entry.position ?? ''),
      team: entry.team_abbreviation ?? entry.team ?? null,
      adp:
        entry.adp != null
          ? Number(entry.adp)
          : entry.rank != null
            ? Number(entry.rank)
            : index + 1,
      projectedPoints:
        entry.metadata?.projected_points != null
          ? Number(entry.metadata.projected_points)
          : null,
      source: 'pro' as const,
      poolType: 'pro' as const,
      rosteredPercent:
        entry.metadata?.rostered_percent != null
          ? Number(entry.metadata.rostered_percent)
          : null,
      headshotUrl: null,
    }))

  if (!includeCollege) {
    return proEntries
  }

  const collegeSports = Array.from(
    new Set(
      [
        ...(devyConfig?.collegeSports ?? []),
        ...(c2cConfig?.collegeSports ?? []),
      ].filter(Boolean)
    )
  )
  const collegeEntries = (await (prisma as any).devyPlayer.findMany({
    where: {
      graduatedToNFL: false,
      ...(collegeSports.length > 0 ? { sport: { in: collegeSports } } : {}),
    },
    orderBy: [{ devyAdp: 'asc' }, { draftProjectionScore: 'desc' }],
    take: 300,
    select: {
      id: true,
      name: true,
      position: true,
      school: true,
      conference: true,
      classYearLabel: true,
      draftGrade: true,
      nflTeam: true,
      nextGameLabel: true,
      devyAdp: true,
      projectedC2CPoints: true,
      c2cPointsWeek: true,
      headshotUrl: true,
    },
  }).catch(() => [])) as CollegeDraftPlayerQueryRow[]

  const normalizedDrafted = new Set(Array.from(draftedNames).map((name) => name.trim().toLowerCase()))
  const collegeMapped = collegeEntries
    .filter((entry) => !normalizedDrafted.has(entry.name.trim().toLowerCase()))
    .map((entry, index) => ({
      playerId: entry.id,
      name: entry.name,
      position: entry.position,
      team: entry.school ?? null,
      adp: entry.devyAdp != null ? Number(entry.devyAdp) : index + 1,
      source: 'college' as const,
      poolType: 'college' as const,
      school: entry.school ?? null,
      conference: entry.conference ?? null,
      classYearLabel: entry.classYearLabel ?? null,
      draftGrade: entry.draftGrade ?? null,
      projectedLandingSpot: entry.nflTeam ?? null,
      nextGameLabel: entry.nextGameLabel ?? null,
      isDevy: true,
      projectedPoints: entry.projectedC2CPoints ?? null,
      weeklyPoints: entry.c2cPointsWeek ?? null,
      headshotUrl: entry.headshotUrl ?? null,
      rosteredPercent: null,
    }))

  return collegeOnly ? collegeMapped : [...proEntries, ...collegeMapped]
}

export class DraftWorker {
  constructor(private readonly options: WorkerOptions = {}) {}

  private async getContext(draftId: string) {
    return assertLiveDraftContext(draftId, this.options.viewerUserId)
  }

  private async buildState(draftId: string): Promise<DraftState> {
    const context = await this.getContext(draftId)
    const snapshot = await buildSessionSnapshot(context.leagueId)
    if (!snapshot) {
      throw new Error('Draft session unavailable')
    }

    const [league, currentUserRosterId, chatMessages] = await Promise.all([
      prisma.league.findUnique({
        where: { id: context.leagueId },
        select: { settings: true },
      }),
      this.options.viewerUserId
        ? getCurrentUserRosterIdForLeague(context.leagueId, this.options.viewerUserId)
        : Promise.resolve(null),
      prisma.leagueChatMessage.findMany({
        where: { leagueId: context.leagueId, source: { in: ['draft', 'league'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),
    ])

    const draftedNames = new Set(snapshot.picks.map((pick) => pick.playerName))
    const leagueSettings = (league?.settings as Record<string, unknown> | null | undefined) ?? null
    const availablePlayers = await buildAvailablePlayers(context.leagueId, context.sport, draftedNames, leagueSettings)

    const draftIntel =
      this.options.viewerUserId
        ? await publishDraftIntelState({
            leagueId: context.leagueId,
            userId: this.options.viewerUserId,
            trigger: 'manual',
          }).catch(() => null)
        : null

    const adpSource = normalizeAdpSource(leagueSettings?.draft_adp_source)
    const budgets =
      snapshot.auction?.budgets && typeof snapshot.auction.budgets === 'object'
        ? (snapshot.auction.budgets as Record<string, number>)
        : {}

    return {
      draftId: context.draftId,
      leagueId: context.leagueId,
      leagueName: context.leagueName,
      sport: context.sport,
      format: context.isDynasty ? 'dynasty' : 'redraft',
      formatType: context.formatType,
      draftType: context.draftType,
      routeType: context.routeType,
      status: snapshot.status,
      teamCount: snapshot.teamCount,
      rounds: snapshot.rounds,
      currentRound: snapshot.currentPick?.round ?? 1,
      currentPickNumber: snapshot.currentPick?.overall ?? Math.max(1, snapshot.picks.length + 1),
      currentTeamId: snapshot.currentPick?.rosterId ?? null,
      currentUserRosterId,
      timerSeconds: snapshot.timerSeconds,
      timerRemainingSeconds: snapshot.timer.remainingSeconds,
      timerActive: snapshot.timer.status === 'running',
      adpSource,
      slotOrder: snapshot.slotOrder.map((entry) => ({
        slot: entry.slot,
        rosterId: entry.rosterId,
        displayName: entry.displayName,
        budgetRemaining: budgets[entry.rosterId] ?? null,
      })),
      picks: snapshot.picks.map((pick) => ({
        id: pick.id,
        overall: pick.overall,
        round: pick.round,
        slot: pick.slot,
        rosterId: pick.rosterId,
        displayName: pick.displayName,
        playerId: pick.playerId,
        playerName: pick.playerName,
        position: pick.position,
        team: pick.team,
        amount: pick.amount ?? null,
        source: pick.source,
        createdAt: pick.createdAt,
      })),
      availablePlayers,
      chatMessages: chatMessages
        .reverse()
        .map((message) => ({
          id: message.id,
          from: String(message.userId ?? 'League'),
          text: String(message.message ?? ''),
          at: message.createdAt.toISOString(),
        })),
      aiQueue:
        draftIntel?.queue?.map((entry) => ({
          playerId: entry.playerId ?? null,
          playerName: entry.playerName,
          position: entry.position,
          team: entry.team ?? null,
          reason: entry.reason,
        })) ?? [],
      aiHeadline: draftIntel?.headline ?? null,
      auction: snapshot.auction,
      updatedAt: snapshot.updatedAt,
    }
  }

  async initializeDraft(draftId: string): Promise<DraftState> {
    return this.buildState(draftId)
  }

  async startDraft(draftId: string): Promise<void> {
    const context = await this.getContext(draftId)
    const started = await startDraftSession(context.leagueId)
    if (!started) {
      throw new Error('Unable to start draft')
    }
    await this.broadcastDraftState(draftId)
  }

  async pauseDraft(draftId: string): Promise<void> {
    const context = await this.getContext(draftId)
    const paused = await pauseDraftSession(context.leagueId)
    if (!paused) {
      throw new Error('Unable to pause draft')
    }
    draftStreamStore.publish(draftId, 'draft_paused', { draftId, leagueId: context.leagueId })
    await this.broadcastDraftState(draftId)
  }

  async resumeDraft(draftId: string): Promise<void> {
    const context = await this.getContext(draftId)
    const resumed = await resumeDraftSession(context.leagueId)
    if (!resumed) {
      throw new Error('Unable to resume draft')
    }
    draftStreamStore.publish(draftId, 'draft_resumed', { draftId, leagueId: context.leagueId })
    await this.broadcastDraftState(draftId)
  }

  async endDraft(draftId: string): Promise<DraftRecap> {
    const context = await this.getContext(draftId)
    const completed = await completeDraftSession(context.leagueId)
    if (!completed) {
      throw new Error('Draft cannot be completed yet')
    }
    const recap = await buildDeterministicPostDraftRecap(context.leagueId)
    if (!recap) {
      throw new Error('Draft recap unavailable')
    }
    const payload: DraftRecap = {
      draftId,
      leagueId: context.leagueId,
      leagueName: context.leagueName,
      sport: context.sport,
      recap: recap.sections.chimmyDraftDebrief ?? recap.sections.leagueNarrativeRecap,
      sections: recap.sections as unknown as Record<string, unknown>,
    }
    draftStreamStore.publish(draftId, 'draft_complete', payload)
    await this.broadcastDraftState(draftId)
    return payload
  }

  async makePick(
    draftId: string,
    userId: string,
    playerId: string
  ): Promise<PickResult> {
    const context = await this.getContext(draftId)
    const snapshot = await buildSessionSnapshot(context.leagueId)
    if (!snapshot?.currentPick) {
      throw new Error('Draft is not on the clock')
    }

    const currentUserRosterId = await getCurrentUserRosterIdForLeague(context.leagueId, userId)
    const commissioner = await isCommissioner(context.leagueId, userId).catch(() => false)
    if (!commissioner && currentUserRosterId !== snapshot.currentPick.rosterId) {
      throw new Error('It is not your turn to pick')
    }

    const league = await prisma.league.findUnique({
      where: { id: context.leagueId },
      select: { settings: true },
    })
    const leagueSettings = (league?.settings as Record<string, unknown> | null | undefined) ?? null
    const player = await resolvePlayerById(context.leagueId, context.sport, playerId, leagueSettings)
    if (!player) {
      throw new Error('Player not found')
    }

    const result = await submitPick({
      leagueId: context.leagueId,
      playerName: player.playerName,
      position: player.position,
      team: player.team,
      playerId: player.playerId,
      byeWeek: player.byeWeek,
      rosterId: snapshot.currentPick.rosterId,
      source: player.pickSource ?? (commissioner ? 'commissioner' : 'user'),
    })

    if (!result.success) {
      throw new Error(result.error ?? 'Unable to make pick')
    }

    const state = await this.buildState(draftId)
    const pick = state.picks[state.picks.length - 1]
    await this.broadcastPickMade(draftId, pick)
    return { ok: true, pick, state }
  }

  async undoPick(draftId: string, pickId: string, commishId: string): Promise<void> {
    const context = await this.getContext(draftId)
    const commissioner = await isCommissioner(context.leagueId, commishId).catch(() => false)
    if (!commissioner) {
      throw new Error('Commissioner access required')
    }

    const target = await prisma.draftPick.findUnique({
      where: { id: pickId },
      select: { id: true, sessionId: true, overall: true },
    })
    if (!target?.id) {
      throw new Error('Pick not found')
    }

    await prisma.$transaction(async (tx) => {
      await tx.draftPick.deleteMany({
        where: {
          sessionId: target.sessionId,
          overall: { gte: target.overall },
        },
      })
      await tx.draftSession.update({
        where: { id: target.sessionId },
        data: {
          status: 'in_progress',
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      })
    })

    await this.broadcastDraftState(draftId)
  }

  async assignPick(
    draftId: string,
    _pickId: string,
    playerId: string,
    commishId: string
  ): Promise<void> {
    await this.makePick(draftId, commishId, playerId)
  }

  async autopick(draftId: string, teamId: string): Promise<Pick> {
    const state = await this.buildState(draftId)
    if (!state.availablePlayers.length) {
      throw new Error('No available players left to auto-pick')
    }

    const rankings = await this.getADP(draftId, state.adpSource)
    const availableById = new Map(state.availablePlayers.map((player) => [player.playerId, player]))
    const top = rankings.find((entry) => availableById.has(entry.playerId))
    const fallback = top
      ? availableById.get(top.playerId)
      : state.availablePlayers[0]

    if (!fallback) {
      throw new Error('Auto-pick candidate unavailable')
    }

    const context = await this.getContext(draftId)
    const result = await submitPick({
      leagueId: context.leagueId,
      playerName: fallback.name,
      position: fallback.position,
      team: fallback.team,
      playerId: fallback.playerId,
      rosterId: teamId,
      source: 'auto',
    })

    if (!result.success) {
      throw new Error(result.error ?? 'Unable to auto-pick')
    }

    const nextState = await this.buildState(draftId)
    const pick = nextState.picks[nextState.picks.length - 1]
    await this.broadcastPickMade(draftId, pick)
    return pick
  }

  async startPickTimer(draftId: string): Promise<void> {
    const context = await this.getContext(draftId)
    const ok = await resetTimer(context.leagueId)
    if (!ok) {
      throw new Error('Unable to start timer')
    }
    const state = await this.buildState(draftId)
    await this.broadcastTimerUpdate(draftId, state.timerRemainingSeconds ?? state.timerSeconds ?? 0)
  }

  async pauseTimer(draftId: string): Promise<void> {
    await this.pauseDraft(draftId)
  }

  async extendTimer(draftId: string, seconds: number): Promise<void> {
    const context = await this.getContext(draftId)
    const session = await prisma.draftSession.findUnique({
      where: { id: context.draftId },
      select: { timerEndAt: true, auctionState: true },
    })
    if (!session) {
      throw new Error('Draft session not found')
    }

    const base = session.timerEndAt ?? new Date()
    const nextTimerEndAt = new Date(base.getTime() + Math.max(0, seconds) * 1000)
    const auctionState =
      session.auctionState && typeof session.auctionState === 'object' && !Array.isArray(session.auctionState)
        ? {
            ...(session.auctionState as Record<string, unknown>),
            bidTimerEndAt: nextTimerEndAt.toISOString(),
          }
        : session.auctionState

    await prisma.draftSession.update({
      where: { id: context.draftId },
      data: {
        timerEndAt: nextTimerEndAt,
        auctionState: auctionState as any,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    })
    const remaining = Math.max(0, Math.ceil((nextTimerEndAt.getTime() - Date.now()) / 1000))
    await this.broadcastTimerUpdate(draftId, remaining)
  }

  async getADP(draftId: string, source: ADPSource): Promise<ADPRanking[]> {
    const context = await this.getContext(draftId)
    return getAdpRankings(context.leagueId, source)
  }

  async setCustomADP(draftId: string, rankings: ADPRanking[]): Promise<void> {
    const context = await this.getContext(draftId)
    await setCustomAdpRankings(context.leagueId, rankings)
  }

  async blendADP(draftId: string, weights: ADPWeights): Promise<ADPRanking[]> {
    const context = await this.getContext(draftId)
    return blendAdpRankings(context.leagueId, weights)
  }

  async nominatePlayer(
    draftId: string,
    teamId: string,
    playerId: string
  ): Promise<NominationResult> {
    const result = await nominateDraftPlayer(draftId, teamId, playerId)
    if (result.success) {
      await this.broadcastDraftState(draftId)
    }
    return result
  }

  async placeBid(
    draftId: string,
    teamId: string,
    amount: number
  ): Promise<BidResult> {
    const result = await placeDraftBid(draftId, teamId, amount)
    if (result.success) {
      draftStreamStore.publish(draftId, 'auction_bid', { draftId, teamId, amount })
      await this.broadcastDraftState(draftId)
    }
    return result
  }

  async closeAuction(draftId: string, _playerId: string): Promise<AuctionResult> {
    const result = await closeDraftAuction(draftId)
    if (result.success) {
      draftStreamStore.publish(draftId, 'auction_closed', {
        draftId,
        winner: result.winnerTeamId,
        amount: result.amount,
      })
      await this.broadcastDraftState(draftId)
    }
    return result
  }

  async runWeightedLottery(draftId: string): Promise<LotteryResult> {
    const result = await runDraftLottery(draftId, { finalize: false })
    draftStreamStore.publish(draftId, 'draft_state', result)
    return result
  }

  async assignDraftOrder(draftId: string, order: string[]): Promise<void> {
    await assignLotteryDraftOrder(draftId, order)
    await this.broadcastDraftState(draftId)
  }

  async getAIRecommendation(
    draftId: string,
    teamId: string
  ): Promise<AIPickRecommendation> {
    const state = await this.buildState(draftId)
    const context = await this.getContext(draftId)
    const teamRoster = state.picks
      .filter((pick) => pick.rosterId === teamId)
      .map((pick) => ({
        position: pick.position,
        team: pick.team,
        byeWeek: null,
      }))
    const rosterSlots = getDefaultRosterSlotsForSport(context.sport)
    const available = state.availablePlayers.slice(0, 200).map((player) => ({
      name: player.name,
      position: player.position,
      team: player.team,
      adp: player.adp,
      byeWeek: null,
    }))

    const result = await runDraftAIAssist({
      available,
      teamRoster,
      rosterSlots,
      round: state.currentRound,
      pick: ((state.currentPickNumber - 1) % state.teamCount) + 1,
      totalTeams: state.teamCount,
      sport: context.sport,
      isDynasty: context.isDynasty,
      isSF: false,
      mode: 'needs',
    }, {
      explanation: true,
      sport: context.sport,
      leagueId: context.leagueId,
    })

    const recommendation: AIPickRecommendation = {
      player: result.recommendation.recommendation?.player
        ? {
            playerId: null,
            name: result.recommendation.recommendation.player.name,
            position: result.recommendation.recommendation.player.position,
            team: result.recommendation.recommendation.player.team ?? null,
          }
        : null,
      reason:
        result.explanation ??
        result.recommendation.recommendation?.reason ??
        'Chimmy recommends the top board value for your build.',
      confidence: result.recommendation.recommendation?.confidence ?? 82,
      queue: [
        ...(result.recommendation.recommendation?.player
          ? [{
              playerId: null,
              playerName: result.recommendation.recommendation.player.name,
              position: result.recommendation.recommendation.player.position,
              team: result.recommendation.recommendation.player.team ?? null,
              reason: result.recommendation.recommendation.reason,
            }]
          : []),
        ...result.recommendation.alternatives.map((alternative) => ({
          playerId: null,
          playerName: alternative.player.name,
          position: alternative.player.position,
          team: alternative.player.team ?? null,
          reason: alternative.reason,
        })),
      ],
      alerts: [
        result.recommendation.reachWarning,
        result.recommendation.valueWarning,
        result.recommendation.scarcityInsight,
      ].filter((value): value is string => Boolean(value)),
    }

    draftStreamStore.publish(draftId, 'ai_recommendation', recommendation)
    return recommendation
  }

  async runLookahead(
    draftId: string,
    teamId: string,
    picksAhead: number
  ): Promise<LookaheadResult> {
    const context = await this.getContext(draftId)
    const roster = await prisma.roster.findUnique({
      where: { id: teamId },
      select: { platformUserId: true },
    })

    if (roster?.platformUserId && !String(roster.platformUserId).startsWith('orphan-')) {
      const intel = await publishDraftIntelState({
        leagueId: context.leagueId,
        userId: String(roster.platformUserId),
        trigger: 'manual',
      }).catch(() => null)

      if (intel) {
        return {
          queue: intel.queue.slice(0, Math.max(1, picksAhead)).map((entry) => ({
            playerId: entry.playerId ?? null,
            playerName: entry.playerName,
            position: entry.position,
            team: entry.team ?? null,
            reason: entry.reason,
          })),
          predictions: intel.predictions.slice(0, Math.max(1, picksAhead)) as unknown as Array<Record<string, unknown>>,
          alerts: [intel.headline].filter((value): value is string => Boolean(value)),
        }
      }
    }

    const recommendation = await this.getAIRecommendation(draftId, teamId)
    return {
      queue: recommendation.queue.slice(0, Math.max(1, picksAhead)),
      predictions: [],
      alerts: recommendation.alerts,
    }
  }

  async getOrphanPick(draftId: string, teamId: string): Promise<Pick> {
    return this.autopick(draftId, teamId)
  }

  async broadcastPickMade(draftId: string, pick: Pick): Promise<void> {
    draftStreamStore.publish(draftId, 'pick_made', {
      pick,
      teamId: pick.rosterId,
      playerId: pick.playerId,
      round: pick.round,
      pickNum: pick.overall,
    })
    await this.broadcastDraftState(draftId)
  }

  async broadcastTimerUpdate(draftId: string, seconds: number): Promise<void> {
    draftStreamStore.publish(draftId, 'timer_update', {
      draftId,
      seconds,
    })
    await this.broadcastDraftState(draftId)
  }

  async broadcastDraftState(draftId: string): Promise<void> {
    const state = await this.buildState(draftId)
    draftStreamStore.publish(draftId, 'draft_state', state)
  }
}
